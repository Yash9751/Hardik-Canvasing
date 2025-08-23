-- Add remarks column to sauda table
ALTER TABLE sauda ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add remarks column to loading table (if not already exists)
ALTER TABLE loading ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Update existing records to have empty remarks
UPDATE sauda SET remarks = '' WHERE remarks IS NULL;
UPDATE loading SET remarks = '' WHERE remarks IS NULL;
