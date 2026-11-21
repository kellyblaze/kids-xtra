-- Tracks incident alert deduplication for the SRE alerting pipeline.
-- Rows are write-only from the server; never contain child PII.
CREATE TABLE IF NOT EXISTS incident_fingerprints (
  fingerprint       TEXT        PRIMARY KEY,
  last_alerted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_count       INTEGER     NOT NULL DEFAULT 1
);

-- Service-role only; no RLS needed (server-side writes via admin client).
ALTER TABLE incident_fingerprints ENABLE ROW LEVEL SECURITY;

-- Expire rows older than 7 days to keep the table small.
-- Run manually or via a pg_cron job:
-- SELECT cron.schedule('0 3 * * *', $$DELETE FROM incident_fingerprints WHERE last_alerted_at < NOW() - INTERVAL '7 days'$$);
