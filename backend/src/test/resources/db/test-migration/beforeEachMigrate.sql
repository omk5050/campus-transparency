-- Test-only Flyway callback to seed required users before migrations like V15 run on fresh embedded test databases
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
            INSERT INTO users (username, password_hash, role, organization_id, created_at, updated_at)
            VALUES ('admin', '$2a$10$H9.ZBVO2rCAOgq6n14b32ey6Pb8ahUOLAS3RI903C.ADTPq3aMbNa', 'ADMIN', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'student') THEN
            INSERT INTO users (username, password_hash, role, organization_id, created_at, updated_at)
            VALUES ('student', '$2a$10$/eDQOWO31l/hyOC9WKC8lOggA/x/MM8Yo.dGLqo3sRAzWa9x0sHIW', 'STUDENT', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'investigator') THEN
            INSERT INTO users (username, password_hash, role, organization_id, created_at, updated_at)
            VALUES ('investigator', '$2a$10$tDt7yhRMSv1jqC0UOh/UcOwn.d78812S.ENlbJXcz4ZuHCy7mQQOC', 'ADMIN', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        END IF;
    END IF;
END $$;
