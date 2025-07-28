-- Update plus_minus table to include average buying price calculation columns

-- Add new columns to plus_minus table
ALTER TABLE plus_minus 
ADD COLUMN IF NOT EXISTS buy_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sell_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_buy_rate DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_sell_rate DECIMAL(10,2) DEFAULT 0;

-- Drop the existing generated column for profit since we'll calculate it manually
ALTER TABLE plus_minus DROP COLUMN IF EXISTS profit;

-- Add the profit column as a regular column (not generated)
ALTER TABLE plus_minus ADD COLUMN IF NOT EXISTS profit DECIMAL(12,2) DEFAULT 0;

-- Create index for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_plus_minus_avg_rates ON plus_minus(avg_buy_rate, avg_sell_rate);
CREATE INDEX IF NOT EXISTS idx_plus_minus_quantities ON plus_minus(buy_quantity, sell_quantity); 