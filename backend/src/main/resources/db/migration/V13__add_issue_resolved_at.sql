-- V13: Add resolved_at timestamp for precise resolution speed analytics and ETHOS score

ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Backfill legacy resolved issues with updated_at as their resolution timestamp
UPDATE issues
SET resolved_at = updated_at
WHERE status = 'RESOLVED' AND resolved_at IS NULL;

-- Performance index for organization status and date filtering
CREATE INDEX IF NOT EXISTS idx_issues_org_status_created ON issues(organization_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_issues_org_resolved ON issues(organization_id, resolved_at);
