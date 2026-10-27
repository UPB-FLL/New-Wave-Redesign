# The operations agent

The owner's ask (2026-10-27): an agent in the site's own stack that feeds back
errors, proposes a resolution for each, sends a report every 4 hours, waits
for approval from the email, and learns from the logs, data and results it
sees. "Agnostic": it is not tied to one source or one kind of fix. Code:
`api/_lib/groundswell/agent/`, route `api/groundswell/agent.ts`, staff
screen `/groundswell/admin/agent`, migration `20261102120000`.

## What it does, every 4 hours

pg_cron (`groundswell-agent-report`, `0 */4 * * *`) posts `{"action":"report"}`
to the route with the admin key. The route answers at once and the pass runs
on (`runAgentPass` in `agent.ts`):

1. **Check** every resolution applied earlier: its resolver's `verify` says
   whether it held (the re-queued run is `done`, the retried action
   `applied`). Either way a *lesson* is recorded.
2. **Collect**: every collector reads its source and returns Observations
   with a stable fingerprint (below). One that throws is reported as an issue
   of the agent's own and its source's issues are left as they were.
3. **Fold** the observations into `groundswell_agent_issues`: a new
   fingerprint opens an issue; a known one is counted again; an open issue a
   healthy source no longer reports is cleared; a resolved or dismissed one
   seen again *with a newer event* reopens as a recurrence, and the
   resolution that was applied gets a failed lesson. (An observation carries
   `observed_at` when its source is history, such as a run's last change; a
   sighting no newer than the decision is the same event, not a recurrence.
   Live states such as a service that does not answer recur whenever seen.)
4. **Propose** for every issue with no proposal: the code computes which
   resolvers apply (`applicableResolvers`) and drops any the lessons have
   ruled out (failed twice on that kind with no success); the model
   (`OPENAI_API_KEY`, `chatJson`) writes the summary, the likely cause and
   picks among those keys, or `needs_developer` (with a brief) or `none`
   (watch). `checkProposal` keeps an answer only within those rules; anything
   else, and a run without the model, falls to `ruleProposal`: the first
   allowed resolver, or a developer brief.
5. **Report** by email (Resend, from `GroundSwell agent <support@newwaveitfl.com>`,
   to `GROUNDSWELL_AGENT_EMAIL`, default josh@newwaveitfl.com) whenever
   anything is open or was resolved since the last report, and once a day
   when nothing is, so silence never means the agent stopped. Sections:
   needs your approval (what happened, in plain words, the likely cause,
   what will change, what happens if it does not help, why, confidence, an
   **Approve** and a **Dismiss for a week** link each), needs a developer
   (the brief), resolved since the last report (held / did not hold / not
   checked yet), watching, sources not read. Each report is recorded in
   `groundswell_agent_reports`.

Nothing is applied by the pass. A resolution runs only from `decide`:

- **From the email**: the link opens a confirmation page
  (`GET /api/groundswell/agent?token=…&decision=approve|dismiss`, the token
  being the credential: 24 random bytes, its SHA-256 on the issue row, 7
  days) that shows the change and its rollback again; the button on it
  (`POST` to the same address) applies the change. A mail client that opens
  links ahead of the reader therefore cannot approve anything. Every report
  issues fresh tokens; a decision clears the token.
- **From the staff screen**: Approve, Dismiss for a week, Reopen, Run a pass
  now, Run and email the report (`POST { action, id }` with a signed-in
  admin's Bearer token or the admin key).

An applied resolution marks the issue `resolved` with its outcome and
`verified: null`; the next pass checks it. One that could not be applied
("the run is running now, not failed") puts the issue back to `open` with a
failed lesson, so the next pass proposes again with that in hand. A
resolution that moves the engine (a re-queued step, a retried action) wakes
the worker at once (`runWorkerInBackground`).

## Sources (collectors, `collectors.ts`)

| Collector | Kinds | Fingerprint |
|---|---|---|
| `runs` (marketing_audits and steps, last 14 days) | `run_failed` (with the failed step), `run_held` (review), `run_stalled` (running, no change for 2 h), `run_queued_long` (queued for an hour), `step_skipped` (a data step skipped on delivered runs, grouped by step and the fault's words: `errorKey` strips ids, numbers and quoted names, so two ScrapeCreators 402s are one issue) | `runs:<kind>:<audit id>` or `runs:step_skipped:<step>:<error key>` |
| `headway` (groundswell_headway_actions) | `action_failed`, `action_waiting` (approved with an error for a day) | `headway:<kind>:<action id>` |
| `readiness` (the live checks, `readinessChecks`) | `service_required`, `service_optional` | `readiness:<check key>`; `GROUNDSWELL_AGENT_LIVE_CHECKS=off` leaves them out |
| `external:<name>` | anything | `POST { action: 'observe', observations: [{ source, kind, title, detail?, severity?, subject?, evidence?, fingerprint? }] }` with the admin key: a log drain, a deploy check, a Claude session, a GitHub Action. Names are slugged; up to 50 a call. |

Adding a source is one more `Collector` (name, the sources it is the
authority on, `collect`), or an outside caller posting observations.

## Resolutions (resolvers, `resolvers.ts`)

| Key | Applies to | Change | Checked by |
|---|---|---|---|
| `requeue_step` | `runs/run_failed` with a step | the failed step back to pending (attempts 0), the run back to running; finished steps kept | the run `done` (held) or `failed` again |
| `release_review` | `runs/run_held` | `answerReview(…, 'deliver')`: the first read, reviewed, is delivered | the run `done` |
| `recheck_review` | `runs/run_held` | `answerReview(…, 'recheck')` | the run `done` |
| `wake_worker` | `runs/run_stalled`, `run_queued_long` | the worker is called now | the run moved |
| `retry_action` | `headway/action_failed` | the action approved again, attempts 0 | `applied` (held) or `failed` again |
| `acknowledge` | `readiness`, `step_skipped`, `action_waiting`, `external:*` | nothing in the app: marked handled outside it | a newer sighting reopens it with a failed lesson |

Every resolver states `describe(issue)` (the change and its rollback, in
words the report prints), `apply` and `verify`. Nothing edits code, runs a
provider tool, or touches a client's account; those stay with people (a
developer brief) or with Headway's own approvals.

## Memory ("training")

`groundswell_agent_lessons`: one row per checked resolution (source, kind,
resolver, worked | failed, a note). `summarizeLessons` gives the model, the
rule and the screen the counts per (source, kind, resolver) and the latest
note; `RULED_OUT_AFTER` (2) failures with no success removes a resolver from
the allowed set for that kind. The issues table itself keeps the history
each proposal is made against: occurrences, recurrences, the last outcome.

## Setup

- Apply migration `20261102120000` (tables, indexes, the cron job; the
  Vault secret `blog_admin_api_key` is the one the other jobs use).
- Vercel: `RESEND_API_KEY` (already set for the alerts), `OPENAI_API_KEY`
  (already set; without it the rule proposes), optional
  `GROUNDSWELL_AGENT_EMAIL`, `GROUNDSWELL_BASE_URL` (default
  https://www.newwaveitfl.com), `GROUNDSWELL_AGENT_LIVE_CHECKS=off`.
- The route runs with `maxDuration: 300` and the Chromium files, since an
  approval wakes the worker inside the same function.

## Tests

`src/test/api/groundswell-agent.test.ts` (collectors against seeded rows,
the memory rules, proposals held to the registry, every resolver, a pass
with the email and its links, the route from the email to the applied
change) and `src/groundswell/admin/GroundswellAgent.test.tsx`.

## Not verified live

No pass has run against production yet: the first 4-hour report after the
migration is applied will show the issue list as the collectors read it
(the Uncommon Path run, now completed, no longer counts; the skipped
ScrapeCreators and Keyword Planner steps of the last fortnight will).
Reply-by-email approval (an inbound address) is not built; the link is the
approval.
