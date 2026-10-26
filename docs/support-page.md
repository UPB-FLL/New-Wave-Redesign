# Support page setup

The `/support` page has three channels, each backed by its own API routes under
`api/support/`. They fail independently: if Twilio is not configured, chat shows
an unavailable message while email and the customer portal keep working.

---

## 1. Email support

**Route:** `POST /api/support/send-email`

Deliberately simple: one Resend send to the support inbox, with the visitor as
reply-to so a technician can just hit reply. Four fields — name, email,
subject, message. No confirmation email, no ticket record, no database.

| Variable | Required | Default |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | — |
| `SUPPORT_INBOX_EMAIL` | no | `support@newwaveitfl.com` |
| `SUPPORT_FROM_EMAIL` | no | `New Wave IT Support <support@newwaveitfl.com>` |

`SUPPORT_FROM_EMAIL` must be on a domain verified in Resend.

The only guards are a hidden honeypot field and a 5-per-10-minutes-per-IP
limit — this form posts directly into a real inbox, so without them it is a
spam relay.

---

## 2. Customer login (SuperOps)

Signing in is by emailed one-time code. That matters: the previous version
returned tickets for whatever address was typed into the box, so anyone could
read any customer's tickets by guessing an email. Now the address is proven
before SuperOps is queried, and the ticket lookup uses the address stored on
the verified session — never one supplied in the request body.

**Routes**

| Route | Purpose |
| --- | --- |
| `POST /api/support/request-code` | Emails a 6-digit code (10-minute expiry) |
| `POST /api/support/verify-code` | Redeems the code for a 12-hour session token |
| `POST /api/support/tickets` | Returns the signed-in customer's tickets (`Authorization: Bearer <token>`) |
| `POST /api/support/logout` | Revokes the session server-side |

**Environment**

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Same project as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only. Never prefix with `VITE_` |
| `SUPEROPS_API_TOKEN` | yes | SuperOps → Settings → My Profile → API token |
| `SUPEROPS_SUBDOMAIN` | yes | Sent as the `CustomerSubDomain` header |
| `SUPEROPS_DATA_CENTER` | no | `us` (default) or `eu` |
| `SUPEROPS_API_URL` | no | Overrides the data-centre default |
| `VITE_SUPEROPS_PORTAL_URL` | no | Full client portal link. Default `https://super-ops.newwaveitfl.com` |

New Wave's account is the subdomain **`newwave`** (`getCompanyInfo`:
`newwave.superops.ai`, US data centre, America/New_York).

**How the SuperOps call works.** SuperOps is GraphQL-only — a single endpoint
(`https://api.superops.ai/msp`, or `https://euapi.superops.ai/msp` in the EU),
authenticated with `Authorization: Bearer <token>` plus `CustomerSubDomain`.
We run `getTicketList` filtered to the signed-in address:

```json
{
  "input": {
    "page": 1,
    "pageSize": 50,
    "sort": [{ "attribute": "createdTime", "order": "DESC" }],
    "condition": { "attribute": "requester.email", "operator": "is", "value": "you@company.com" }
  }
}
```

Statuses and priorities are mapped onto the four states the UI renders, so
custom SuperOps status names still land in a sensible bucket. SuperOps caps a
list request at 100 records and 800 API requests per minute.

SuperOps types a ticket's `requester`, `client`, `site` and `technician` as
JSON scalars: select them bare (`technician`, not `technician { name }`),
or SuperOps refuses the whole query ("Sub selection not allowed on leaf
type JSON"). The list query asked for `technician { name }` until
2026-10-23, so the portal's ticket list could never have loaded.

> The previous `api/support/tickets.ts` and the (now removed)
> `api/support/create-ticket.ts` called REST paths like
> `https://api.superops.ai/v1/tickets`. SuperOps has no such REST API, which is
> why the ticket list always came back empty.

---

## 3. Live chat over SMS

A visitor message is stored in Postgres and texted to the on-call technician's
cell. The technician texts back, Twilio posts the reply to our webhook, and it
appears in the visitor's chat window (polled every 4 seconds).

**Routes**

| Route | Purpose |
| --- | --- |
| `POST /api/support/chat/start` | Opens a session, texts the first message |
| `POST /api/support/chat/send` | Sends a follow-up |
| `POST /api/support/chat/messages` | Polls for new messages |
| `POST /api/support/chat/close` | Visitor ends the chat |
| `POST /api/support/sms-webhook` | **Twilio inbound webhook** |

**Environment**

| Variable | Required | Notes |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | yes | |
| `TWILIO_AUTH_TOKEN` | yes | Also the key for webhook signature validation |
| `TWILIO_MESSAGING_SERVICE_SID` | one of | Preferred over a bare number |
| `TWILIO_FROM_NUMBER` | one of | E.164, e.g. `+19545550100` |
| `SUPPORT_AGENT_SMS_NUMBERS` | yes | Comma-separated E.164 technician cells |
| `SUPPORT_SMS_WEBHOOK_URL` | no | Set if signature validation fails behind a proxy |

**Twilio configuration**

1. Buy or pick an SMS-capable number.
2. Set the number's (or Messaging Service's) inbound webhook to
   `https://<your-domain>/api/support/sms-webhook`, method **POST**.
3. Put the technician cell number(s) in `SUPPORT_AGENT_SMS_NUMBERS`.

**Reply routing.** One Twilio number serves every conversation, so a reply has
to say which conversation it belongs to. Each chat gets a short code and the
first SMS reads:

```
New chat [#K7QM] — Jane Doe
jane@acme.com

Our office wifi keeps dropping.

Reply "#K7QM your message" to answer.
```

- Reply starting with the code → routed to that chat.
- Reply with no code and exactly one chat open → routed to it.
- Reply with no code and several chats open → Twilio texts back the list of open
  codes instead of guessing. Guessing wrong would show one customer another
  customer's message, so the bridge asks rather than risk it.
- `#K7QM /close` closes a conversation from the phone.

**Security.** Every inbound webhook is checked against Twilio's
`X-Twilio-Signature` (HMAC-SHA1 over the URL plus the sorted POST parameters)
and rejected with 403 if it does not match. Messages from numbers outside
`SUPPORT_AGENT_SMS_NUMBERS` are refused. Twilio retries are de-duplicated by a
unique index on the message SID.

**Costs.** Every visitor message is one outbound SMS *per configured technician
number*. A per-conversation cap of 80 messages and a per-IP limit of 5 new
chats an hour keep a stuck loop or a bot from running up a bill.

---

## 4. New-ticket alerts

When a ticket reaches the SuperOps board, the on-call phone gets a text and
josh@newwaveitfl.com gets an email in New Wave's colours.

**Route:** `POST /api/support/ticket-alerts`
(`api/support/ticket-alerts.ts`, helpers in `api/_lib/ticketAlerts.ts`).

- **Who may call it**: SuperOps, with the `x-superops-webhook-secret` header
  equal to `SUPEROPS_WEBHOOK_SECRET`; or staff and a cron, with
  `x-admin-key` (`requireAdmin`). Anything else gets 401.
- **What it does**: reads the 10 newest tickets from SuperOps (plus any
  `ticketId` the delivery names; SuperOps does not document its payload, so
  the route trusts none of it), keeps those created in the last hour
  (`ALERT_WINDOW_MS`, so the backlog is never texted), and alerts each one it
  has not alerted before. `createdTime` is UTC without an offset
  (`superOpsTime`).
- **Once per ticket**: a row in `support_ticket_alerts` (migration
  `20261031120000`) claims the ticket before anything is sent. A ticket
  nothing could be sent for is released so the next delivery tries again.
  Without the table it still alerts, without the dedupe.
- **Answers**: 200 with `alerted`/`failed` display numbers; 502 when
  SuperOps cannot be read or no message went out, so SuperOps can deliver the
  event again; 503 until SuperOps is configured.

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPEROPS_WEBHOOK_SECRET` | yes | Long random string, also set as the subscription's header |
| `SUPPORT_ALERT_SMS_NUMBERS` | for texts | E.164, comma-separated; defaults to `SUPPORT_AGENT_SMS_NUMBERS` |
| `SUPPORT_ALERT_EMAIL` | no | Default `josh@newwaveitfl.com` |
| `SUPEROPS_APP_URL` | no | Linked from alerts. Default `https://newwave.superops.ai` |

Texts go through the Twilio settings in section 3 (account, auth token, and
a messaging service or from-number); email through Resend
(`RESEND_API_KEY`, `SUPPORT_FROM_EMAIL`).

**Subscribing SuperOps** (once, after the route is deployed). SuperOps'
API creates the webhook; there is no UI step:

```graphql
mutation ($input: CreateWebhookSubscriptionInput!) {
  createWebhookSubscription(input: $input) { webhookSubscriptionId status }
}
```

```json
{
  "input": {
    "webhookUrl": "https://www.newwaveitfl.com/api/support/ticket-alerts",
    "description": "New Wave IT new-ticket alerts",
    "status": "ENABLED",
    "headers": { "x-superops-webhook-secret": "<SUPEROPS_WEBHOOK_SECRET>" },
    "addEvents": [{ "eventType": "TICKET_CREATED" }]
  }
}
```

Undo: `deleteWebhookSubscription`
with that id. Check it by raising a test ticket: the text and the email
arrive within a few seconds. Test the route without SuperOps:
`curl -X POST https://www.newwaveitfl.com/api/support/ticket-alerts -H "x-admin-key: $ADMIN_API_KEY"`.

**Texts need Twilio.** Until `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and a
sender (`TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`) are set, the
route logs `TwilioNotConfiguredError` and sends the email alone (seen on
2026-10-23).

**Not built**: a cron fallback for a delivery SuperOps loses. The route
already accepts `x-admin-key`, so a pg_cron job posting to it every few
minutes (like the Groundswell worker) is all it would take.

---

## 5. Ticket email templates

SuperOps sends the requester emails itself, from its own templates, and its
API has no call that edits them, so the branded templates are pasted in by
hand (Settings > My Company > Notification Center > Ticket Notifications >
Requester Notifications for the notices):

| File | Where it goes in SuperOps | When it sends |
| --- | --- | --- |
| `docs/superops/ticket-created-template.html` | Requester notice: ticket created ("New Ticket created - <number>") | When a ticket is opened, by email or the portal |
| `docs/superops/ticket-closed-template.html` | Requester notice: ticket closed (suits "resolved" too) | When a ticket is closed |
| `docs/superops/reply-base-template.html` | Settings > Advanced Configuration > Reply Templates (not a notice) | Inserted by the technician into a reply, who types above the signature |

A technician's reply is sent as exactly what is typed in the reply box:
SuperOps does not wrap it in a notification template (seen on 2026-10-26:
the ticket's `TECH_REPLY` entry is the typed text alone, with no notice after
it). So the reply's branding is a Reply Template, and the earlier
`ticket-reply-template.html` (a notice built around `#Reply`) was removed.

Each file's header comment says where it goes and how to swap each `#…`
marker for SuperOps' own placeholder (type `#` in the editor). The notices
use `public/brand/email/new-wave-it-logo-on-dark.png` and the reply's
signature `new-wave-it-logo-on-light.png` (PNGs, since most mail clients do
not show SVG).

Staff notifications (Notification Center > Ticket Notifications > Technician
Notifications), the same look with an accent bar per kind and "Not for
customers" in the footer:

| File | SuperOps notice |
| --- | --- |
| `docs/superops/technician/new-ticket.html` | A new ticket is created |
| `docs/superops/technician/ticket-assigned.html` | A ticket is assigned to a technician |
| `docs/superops/technician/requester-replied.html` | The requester replies |
| `docs/superops/technician/sla-warning.html` | A ticket nears or breaches its SLA |

The site's own new-ticket alert (section 4) is not a SuperOps template: its
email is built in code (`alertEmailHtml` in `api/_lib/ticketAlerts.ts`).

Both have New Wave's navy header and logo, a ticket summary card, "View
your ticket", and a footer with phone, email, support page and address.
Each file's header comment says which notice it goes in and how to swap each
`#…` marker for SuperOps' own placeholder (type `#` in the editor). The logo
is `public/brand/email/new-wave-it-logo-on-dark.png` (a PNG, since most mail
clients do not show SVG).

---

## Database

Apply `supabase/migrations/20260809120000_create_support_portal_and_chat.sql`.
It creates `support_login_codes`, `support_portal_sessions`,
`support_chat_sessions`, and `support_chat_messages`;
`20261031120000_support_ticket_alerts.sql` adds `support_ticket_alerts`.

Every table has RLS enabled with **no policies**, so the browser's anon key can
neither read nor write any of it — all access goes through the service-role key
in the API routes. Login codes and session tokens are stored as SHA-256 digests,
never in the clear.

`cleanup_support_auth_artifacts()` prunes expired codes and sessions and closes
idle chats. Schedule it with pg_cron if you want it run regularly:

```sql
select cron.schedule('support-cleanup', '0 * * * *', $$select cleanup_support_auth_artifacts()$$);
```

---

## Local development

`vercel dev` runs the API routes alongside Vite. Twilio cannot reach
`localhost`, so to exercise inbound replies either expose the port with a tunnel
and point the Twilio webhook at it, or insert an `agent` row into
`support_chat_messages` by hand and watch it appear in the widget.
