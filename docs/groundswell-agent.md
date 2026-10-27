# The operations agent

The owner's ask (2026-10-27): an agent in the site's own stack that feeds back
errors, proposes a resolution for each, sends a report every 4 hours, waits
for approval from the email, and learns from the logs, data and results it
sees. "Agnostic": it is not tied to one source or one kind of fix. Code:
`api/_lib/groundswell/agent/`, route `api/groundswell/agent.ts`, staff
screen `/groundswell/admin/agent`, migration `20261104120000`.

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
4. **Ask the advisor** for every issue with no proposal. The code computes
   which resolvers apply (`applicableResolvers`) and drops any the lessons
   have ruled out (failed twice on that kind with no success). Then one
   question goes to **Claude** (`consult.ts`: the official SDK, model
   `claude-opus-5-5` unless `GROUNDSWELL_AGENT_MODEL` says otherwise, effort
   `GROUNDSWELL_AGENT_EFFORT` default high, the answer held to a JSON schema,
   a safety decline falling back server-side inside the call) with the
   issues, the allowed keys per issue, the lessons, and **prior advice**: the
   log of what Claude advised before on the same kinds, whether the agent
   kept it, why it was rejected if not, and how it turned out. Claude writes
   the plain-words summary, the likely cause and the rationale and picks
   among the allowed keys, or `needs_developer` (with a brief) or `none`
   (watch). `checkProposal` keeps an answer only within those rules.
   **Every ask is logged** in `groundswell_agent_consultations`: the question
   as sent, the answer as it came back, per issue what was kept or rejected
   and why, tokens and latency, any error. Each proposal carries its
   `consultation_id`; when the resolution is checked later (or could not be
   applied), the outcome is written back onto that consultation, and the
   next question carries the last 12 consultations' advice on the same
   kinds with those outcomes. So the advice adapts to its own record, and
   the record is the agent's own, not the model's. Without
   `ANTHROPIC_API_KEY`, OpenAI (`chatJson`) stands in under the same rules
   and the same log (`GROUNDSWELL_AGENT_ADVISOR=claude|openai|rule` forces
   one); without either, `ruleProposal`: the first allowed resolver, or a
   developer brief.
5. **Research** (`research.ts`): one ask per topic to the advisor with its
   web search turned on: Claude (`consultClaude(…, { webSearch })`) when
   `ANTHROPIC_API_KEY` is set, else OpenAI's Responses API with its web
   search tool (`researchWithSearch` in `openai.ts`, on the `OPENAI_API_KEY`
   the site already has; the tool type `web_search_preview`, then
   `web_search` if the API says the first is unknown); up to 8 searches, the
   answer's JSON parsed from the text, carrying the topic's brief, the
   date window (7 days) and the newest 30 learnings the agent already holds
   on that topic, so only what is new comes back. `checkLearnings` keeps a
   learning only with a title, a summary and a real link, and never one
   already known by link (tracking parameters stripped) or by title; up to 5
   per topic. Kept learnings go in `groundswell_agent_learnings`; the ask is
   logged with purpose `research`. Topics: `DEFAULT_TOPICS` (AI agent
   marketing, social media marketing) or `GROUNDSWELL_AGENT_TOPICS`
   (`key=what to look for; key=…`, up to six). Without either key the
   research is skipped and the report says so.
6. **Report** by email (Resend, from `GroundSwell agent <support@newwaveitfl.com>`,
   to `GROUNDSWELL_AGENT_EMAIL`, default josh@newwaveitfl.com) whenever
   anything is open or was resolved since the last report, and once a day
   when nothing is, so silence never means the agent stopped. Sections:
   needs your approval (what happened, in plain words, the likely cause,
   what will change, what happens if it does not help, why, confidence, an
   **Approve** and a **Dismiss for a week** link each), needs a developer
   (the brief), resolved since the last report (held / did not hold / not
   checked yet), watching, **what the agent learned** (by topic: title,
   summary, why it matters, what to do, the source link, confidence; each
   learning reported once), research not done, sources not read. New
   learnings count as something to say. Each report is recorded in
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

Three records, all the agent's own:

- `groundswell_agent_lessons`: one row per checked resolution (source, kind,
  resolver, worked | failed, a note). `summarizeLessons` gives the advisor,
  the rule and the screen the counts per (source, kind, resolver) and the
  latest note; `RULED_OUT_AFTER` (2) failures with no success removes a
  resolver from the allowed set for that kind, whatever the advisor says.
- `groundswell_agent_consultations`: every ask of Claude, whole, with what
  was kept or rejected and the outcome of each advice once known
  (`priorAdvice` turns the last 12 into the record the next question
  carries). The staff screen lists them: issues asked, kept, rejected,
  outcomes, time and tokens.
- The issues table itself: occurrences, recurrences, the last outcome, so a
  proposal is always made against what happened to that issue before.

## Setup

- Apply migrations `20261104120000` (the four tables, indexes, the cron
  job; the Vault secret `blog_admin_api_key` is the one the other jobs use)
  and `20261105120000` (the learnings table, the consultations' `purpose`).
- Vercel: `ANTHROPIC_API_KEY` (the advisor; new), `RESEND_API_KEY` (already
  set for the alerts), optional `GROUNDSWELL_AGENT_MODEL` (default
  `claude-opus-5-5`), `GROUNDSWELL_AGENT_EFFORT` (default `high`),
  `GROUNDSWELL_AGENT_ADVISOR`, `GROUNDSWELL_AGENT_EMAIL`,
  `GROUNDSWELL_BASE_URL` (default https://www.newwaveitfl.com),
  `GROUNDSWELL_AGENT_LIVE_CHECKS=off`. `OPENAI_API_KEY` (already set) is the
  stand-in advisor.
- The route runs with `maxDuration: 300` and the Chromium files, since an
  approval wakes the worker inside the same function.

## Research

The staff screen's "What the agent learned" lists the newest 40 learnings
with their links; the consultations list shows research asks with how many
learnings each kept and how many web searches it ran. Each pass costs one
Claude call per topic with up to 8 searches.

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
