ALTER TABLE issues ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(32);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS department VARCHAR(50);

UPDATE issues SET tracking_code = CONCAT('CMP-', LPAD(id::text, 6, '0')) WHERE tracking_code IS NULL;
UPDATE issues SET category = 'Infrastructure' WHERE category IS NULL;
UPDATE issues SET department = 'Facilities & Operations' WHERE department IS NULL;
