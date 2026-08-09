/*
  # Support portal + SMS chat bridge

  1. New Tables
    - `support_login_codes`
      Short-lived one-time codes emailed to a customer before the SuperOps
      portal will return their tickets.
      - `id` (uuid, primary key)
      - `email` (text, required, lowercased by the API)
      - `code_hash` (text, required) — SHA-256 of the 6-digit code
      - `expires_at` (timestamptz, required)
      - `attempts` (int) — incremented on every failed verification
      - `consumed_at` (timestamptz, nullable) — set once redeemed
      - `ip` (text)
      - `created_at` (timestamptz)

    - `support_portal_sessions`
      Issued after a login code is redeemed; proves the caller owns the email
      address whose SuperOps tickets they are asking for.
      - `id` (uuid, primary key)
      - `email` (text, required)
      - `token_hash` (text, unique, required) — SHA-256 of the bearer token
      - `expires_at` (timestamptz, required)
      - `last_seen_at` (timestamptz)
      - `created_at` (timestamptz)

    - `support_chat_sessions`
      One row per visitor conversation on the support page. `code` is the short
      tag included in the outbound SMS so a technician can reply to a specific
      conversation.
      - `id` (uuid, primary key)
      - `code` (text, unique, required)
      - `token_hash` (text, unique, required)
      - `visitor_name` / `visitor_email` / `visitor_phone` (text)
      - `status` (text) — 'open' or 'closed'
      - `agent_number` (text) — last technician number that replied
      - `message_count` (int) — durable per-session flood limit
      - `created_at` / `last_message_at` / `closed_at` (timestamptz)

    - `support_chat_messages`
      - `id` (uuid, primary key)
      - `session_id` (uuid, FK -> support_chat_sessions, cascade delete)
      - `sender` (text) — 'visitor' or 'agent'
      - `body` (text, required)
      - `sms_sid` (text) — Twilio message SID for outbound/inbound correlation
      - `agent_number` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS is enabled on every table with **no** policies. The anon key used in
      the browser can therefore neither read nor write any of it; all access
      goes through the service-role key in the serverless API routes, which
      bypasses RLS. Login codes, session tokens, and chat transcripts are never
      reachable from the client.

  3. Notes
    - Codes and tokens are stored as SHA-256 digests, never in the clear.
    - `cleanup_support_auth_artifacts()` prunes expired codes/sessions and can
      be scheduled with pg_cron; the API also prunes opportunistically.
*/

-- ---------------------------------------------------------------------------
-- Login codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  ip text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_login_codes_email_idx
  ON support_login_codes (email, created_at DESC);
CREATE INDEX IF NOT EXISTS support_login_codes_expires_idx
  ON support_login_codes (expires_at);

ALTER TABLE support_login_codes ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Portal sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_portal_sessions_expires_idx
  ON support_portal_sessions (expires_at);

ALTER TABLE support_portal_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Chat sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  visitor_name text NOT NULL DEFAULT '',
  visitor_email text NOT NULL DEFAULT '',
  visitor_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  agent_number text NOT NULL DEFAULT '',
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT support_chat_sessions_status_check CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS support_chat_sessions_agent_idx
  ON support_chat_sessions (agent_number, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_chat_sessions_activity_idx
  ON support_chat_sessions (last_message_at DESC);

ALTER TABLE support_chat_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Chat messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES support_chat_sessions (id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  sms_sid text NOT NULL DEFAULT '',
  agent_number text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_chat_messages_sender_check CHECK (sender IN ('visitor', 'agent', 'system'))
);

CREATE INDEX IF NOT EXISTS support_chat_messages_session_idx
  ON support_chat_messages (session_id, created_at);

-- Twilio retries inbound webhooks; the unique SID keeps a retry from
-- duplicating a technician's reply in the transcript.
CREATE UNIQUE INDEX IF NOT EXISTS support_chat_messages_sms_sid_idx
  ON support_chat_messages (sms_sid)
  WHERE sms_sid <> '';

ALTER TABLE support_chat_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Atomic message counter
-- ---------------------------------------------------------------------------
-- Called by the API after every insert. Doing the increment in Postgres avoids
-- the read-modify-write race two concurrent messages would otherwise hit.
CREATE OR REPLACE FUNCTION increment_support_chat_message_count(session_uuid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE support_chat_sessions
    SET message_count = message_count + 1
    WHERE id = session_uuid
    RETURNING message_count;
$$;

REVOKE ALL ON FUNCTION increment_support_chat_message_count(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_support_auth_artifacts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM support_login_codes WHERE expires_at < now() - interval '1 day';
  DELETE FROM support_portal_sessions WHERE expires_at < now() - interval '1 day';
  UPDATE support_chat_sessions
    SET status = 'closed', closed_at = now()
    WHERE status = 'open' AND last_message_at < now() - interval '24 hours';
$$;

REVOKE ALL ON FUNCTION cleanup_support_auth_artifacts() FROM PUBLIC, anon, authenticated;
