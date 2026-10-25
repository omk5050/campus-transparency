-- V11__add_issue_reporter_alias.sql
-- Phase 2.7: Complaint-Specific Privacy-Preserving Pseudonyms
-- Replaces account-wide hash linkages with randomized, complaint-scoped pseudonyms (e.g. 'Complainant #8F4C')
-- to prevent cross-report correlation attacks.

ALTER TABLE issues ADD COLUMN IF NOT EXISTS reporter_alias VARCHAR(64);

-- Backfill pre-existing issues with deterministic pseudo-random complaint aliases
UPDATE issues
SET reporter_alias = 'Complainant #' || UPPER(SUBSTRING(MD5(id::text || COALESCE(tracking_code, id::text)), 1, 4))
WHERE reporter_alias IS NULL;

ALTER TABLE issues ALTER COLUMN reporter_alias SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issues_reporter_alias ON issues(reporter_alias);
