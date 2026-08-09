# Support page setup

The `/support` page has three channels, each backed by its own API routes under
`api/support/`. They fail independently: if Twilio is not configured, chat shows
an unavailable message while email and the customer portal keep working.

---

## 1. Email support

**Route:** `POST /api/support/send-email`

Sends the visitor's message to the support inbox (reply-to set to the visitor)
and a receipt to the visitor.

| Variable | Required | Default |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | — |
| `SUPPORT_INBOX_EMAIL` | no | `support@newwaveitfl.com` |
| `SUPPORT_FROM_EMAIL` | no | `New Wave IT Support <support@newwaveitfl.com>` |
| `SUPPORT_PHONE` | no | `(954) 372-5100` |

`SUPPORT_FROM_EMAIL` must be on a domain verified in Resend.

Abuse controls: a hidden honeypot field, per-field length caps, and a
5-per-10-minutes-per-IP limit.

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

## Database

Apply `supabase/migrations/20260809120000_create_support_portal_and_chat.sql`.
It creates `support_login_codes`, `support_portal_sessions`,
`support_chat_sessions`, and `support_chat_messages`.

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
