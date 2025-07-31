-- Add Transport and Tanker Number fields to loading table
-- This script adds the necessary fields for transport tracking

-- Create transports table
CREATE TABLE IF NOT EXISTS transports (
    id SERIAL PRIMARY KEY,
    transport_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add transport_id and tanker_number columns to loading table
ALTER TABLE loading ADD COLUMN IF NOT EXISTS transport_id INTEGER REFERENCES transports(id);
ALTER TABLE loading ADD COLUMN IF NOT EXISTS tanker_number VARCHAR(50);

-- Insert some default transport options
INSERT INTO transports (transport_name) VALUES 
    ('Road Transport'),
    ('Rail Transport'),
    ('Pipeline'),
    ('Ship/Vessel')
ON CONFLICT (transport_name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_loading_transport ON loading(transport_id); 