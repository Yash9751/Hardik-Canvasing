-- Add missing created_at columns to existing tables
-- This script updates the database schema to match the current requirements

-- Add created_at column to buy table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'buy' AND column_name = 'created_at') THEN
        ALTER TABLE buy ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add created_at column to sell table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sell' AND column_name = 'created_at') THEN
        ALTER TABLE sell ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing records to have created_at timestamp
UPDATE buy SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE sell SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL; 

-- Add unique constraint for plus_minus upsert (P&L report)
ALTER TABLE plus_minus
ADD CONSTRAINT plus_minus_unique UNIQUE (date, item_id, ex_plant_id); 