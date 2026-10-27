-- The operations agent's research (2026-10-27): what it learns on each
-- 4-hour pass about the fields the division works in (AI agent marketing,
-- social media marketing, or whatever GROUNDSWELL_AGENT_TOPICS names), kept
-- so only what is new is reported (api/_lib/groundswell/agent/research.ts).
--
--   groundswell_agent_learnings  one row per learning: topic, title, summary,
--                                why it matters, what to do, the source link
--                                it was read on, when it was published and
--                                found, and the consultation it came from
--   groundswell_agent_consultations.purpose
--                                which ask: 'proposals' (the resolutions) or
--                                'research' (the learnings)
--
-- RLS on, no policies: only the service role reads or writes. Additive and
-- idempotent; the route and the pass work without the table (the report
-- then says the research could not be stored).

CREATE TABLE IF NOT EXISTS groundswell_agent_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  why_it_matters text,
  action text,
  url text NOT NULL,
  source text NOT NULL DEFAULT '',
  published_at date,
  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'kept', 'dismissed')),
  consultation_id uuid REFERENCES groundswell_agent_consultations(id) ON DELETE SET NULL,
  found_at timestamptz NOT NULL DEFAULT now(),
  reported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_agent_learnings_topic_idx ON groundswell_agent_learnings (topic, found_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS groundswell_agent_learnings_url_idx ON groundswell_agent_learnings (topic, url);
ALTER TABLE groundswell_agent_learnings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_agent_learnings FROM anon, authenticated;

ALTER TABLE groundswell_agent_consultations ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'proposals' CHECK (purpose IN ('proposals', 'research'));
