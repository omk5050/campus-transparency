ALTER TABLE issues ADD COLUMN IF NOT EXISTS assigned_to BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_issues_assigned_to'
    ) THEN
        ALTER TABLE issues 
        ADD CONSTRAINT fk_issues_assigned_to 
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;
