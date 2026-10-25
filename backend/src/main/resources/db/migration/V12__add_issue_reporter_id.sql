-- V12__add_issue_reporter_id.sql
-- Phase 2: Roles and Core Dashboards
-- Links complaints to the authenticated student reporter while preserving privacy in public interfaces.

ALTER TABLE issues ADD COLUMN IF NOT EXISTS reporter_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_issues_reporter'
    ) THEN
        ALTER TABLE issues
        ADD CONSTRAINT fk_issues_reporter
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_org_reporter ON issues(organization_id, reporter_id);
