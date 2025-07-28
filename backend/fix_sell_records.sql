-- Fix existing sell records to set quantity_kg and recalculate total_value
-- This script updates all sell transactions to use the new schema

-- Update quantity_kg for all sell transactions (convert packs to kg)
UPDATE sauda 
SET quantity_kg = quantity_packs * 1000 
WHERE transaction_type = 'sell' AND quantity_kg = 0;

-- Recalculate total_value for all sell transactions
UPDATE sauda 
SET total_value = quantity_kg * rate_per_10kg / 10 
WHERE transaction_type = 'sell';

-- Verify the changes
SELECT 
    id,
    sauda_no,
    transaction_type,
    date,
    quantity_packs,
    quantity_kg,
    rate_per_10kg,
    total_value
FROM sauda 
WHERE transaction_type = 'sell'
ORDER BY date, id; 