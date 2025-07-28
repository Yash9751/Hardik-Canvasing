-- Update sauda table to handle sell quantities in kg instead of packs

-- Add new column for sell quantity in kg
ALTER TABLE sauda ADD COLUMN IF NOT EXISTS quantity_kg DECIMAL(10,2) DEFAULT 0;

-- Update the total_value calculation to handle both packs and kg
-- For purchase: quantity_packs * rate_per_10kg * 100
-- For sell: quantity_kg * rate_per_10kg / 10
ALTER TABLE sauda DROP COLUMN IF EXISTS total_value;

-- Add the total_value column as a regular column with conditional calculation
ALTER TABLE sauda ADD COLUMN total_value DECIMAL(12,2) DEFAULT 0;

-- Create a function to calculate total_value based on transaction type
CREATE OR REPLACE FUNCTION calculate_total_value()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'purchase' THEN
        -- For purchase: quantity_packs * rate_per_10kg * 100
        NEW.total_value = NEW.quantity_packs * NEW.rate_per_10kg * 100;
    ELSIF NEW.transaction_type = 'sell' THEN
        -- For sell: quantity_kg * rate_per_10kg / 10
        NEW.total_value = NEW.quantity_kg * NEW.rate_per_10kg / 10;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total_value
DROP TRIGGER IF EXISTS trigger_calculate_total_value ON sauda;
CREATE TRIGGER trigger_calculate_total_value
    BEFORE INSERT OR UPDATE ON sauda
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_value();

-- Update existing records to calculate total_value correctly
UPDATE sauda SET total_value = 
    CASE 
        WHEN transaction_type = 'purchase' THEN quantity_packs * rate_per_10kg * 100
        WHEN transaction_type = 'sell' THEN quantity_kg * rate_per_10kg / 10
        ELSE 0
    END
WHERE total_value = 0 OR total_value IS NULL; 