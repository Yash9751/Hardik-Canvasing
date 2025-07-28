-- Database schema for Good Luck Traders - Complete Trading System

-- Admin user table
CREATE TABLE IF NOT EXISTS admin_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parties table (Buyers/Sellers)
CREATE TABLE IF NOT EXISTS parties (
    id SERIAL PRIMARY KEY,
    party_name VARCHAR(200) UNIQUE NOT NULL,
    city VARCHAR(100),
    gst_no VARCHAR(20),
    contact_person VARCHAR(100),
    mobile_number VARCHAR(15),
    email VARCHAR(100),
    party_type VARCHAR(20) DEFAULT 'both' CHECK (party_type IN ('buyer', 'seller', 'both')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) UNIQUE NOT NULL,
    nick_name VARCHAR(100),
    hsn_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ex Plants table
CREATE TABLE IF NOT EXISTS ex_plants (
    id SERIAL PRIMARY KEY,
    plant_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brokers table
CREATE TABLE IF NOT EXISTS brokers (
    id SERIAL PRIMARY KEY,
    broker_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Conditions table
CREATE TABLE IF NOT EXISTS delivery_conditions (
    id SERIAL PRIMARY KEY,
    condition_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Conditions table
CREATE TABLE IF NOT EXISTS payment_conditions (
    id SERIAL PRIMARY KEY,
    condition_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sauda (Purchase/Sell) transactions table
CREATE TABLE IF NOT EXISTS sauda (
    id SERIAL PRIMARY KEY,
    sauda_no VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('purchase', 'sell')),
    date DATE NOT NULL,
    party_id INTEGER NOT NULL REFERENCES parties(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    quantity_packs INTEGER NOT NULL,
    rate_per_10kg DECIMAL(10,2) NOT NULL,
    delivery_condition_id INTEGER REFERENCES delivery_conditions(id),
    payment_condition_id INTEGER REFERENCES payment_conditions(id),
    loading_due_date DATE,
    ex_plant_id INTEGER REFERENCES ex_plants(id),
    broker_id INTEGER REFERENCES brokers(id),
    total_value DECIMAL(12,2) GENERATED ALWAYS AS (quantity_packs * rate_per_10kg * 100) STORED,
    pending_quantity_packs INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loading transactions table
CREATE TABLE IF NOT EXISTS loading (
    id SERIAL PRIMARY KEY,
    sauda_id INTEGER NOT NULL REFERENCES sauda(id),
    loading_date DATE NOT NULL,
    vajan_kg DECIMAL(10,2) NOT NULL,
    quantity_packs DECIMAL(10,2) GENERATED ALWAYS AS (vajan_kg / 1000) STORED,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock table (calculated from sauda and loading)
CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id),
    ex_plant_id INTEGER REFERENCES ex_plants(id),
    total_purchase_packs INTEGER DEFAULT 0,
    total_sell_packs INTEGER DEFAULT 0,
    loaded_purchase_packs INTEGER DEFAULT 0,
    loaded_sell_packs INTEGER DEFAULT 0,
    current_stock_packs INTEGER GENERATED ALWAYS AS (total_purchase_packs - total_sell_packs) STORED,
    pending_purchase_loading INTEGER GENERATED ALWAYS AS (total_purchase_packs - loaded_purchase_packs) STORED,
    pending_sell_loading INTEGER GENERATED ALWAYS AS (total_sell_packs - loaded_sell_packs) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, ex_plant_id)
);

-- Rates table for rate updates
CREATE TABLE IF NOT EXISTS rates (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id),
    rate_per_10kg DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, effective_date)
);

-- Vendors table for broadcast contacts
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(15),
    email VARCHAR(100),
    city VARCHAR(100),
    vendor_type VARCHAR(20) DEFAULT 'customer' CHECK (vendor_type IN ('customer', 'supplier', 'both')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Broadcast channels table
CREATE TABLE IF NOT EXISTS broadcast_channels (
    id SERIAL PRIMARY KEY,
    channel_name VARCHAR(100) UNIQUE NOT NULL,
    city VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor-channel mapping table
CREATE TABLE IF NOT EXISTS vendor_channels (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    channel_id INTEGER NOT NULL REFERENCES broadcast_channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, channel_id)
);

-- Channel-specific rates table
CREATE TABLE IF NOT EXISTS channel_rates (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES broadcast_channels(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    rate_per_10kg DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, item_id, effective_date)
);

-- Broadcast history table
CREATE TABLE IF NOT EXISTS broadcast_history (
    id SERIAL PRIMARY KEY,
    broadcast_date DATE NOT NULL,
    channel_id INTEGER NOT NULL REFERENCES broadcast_channels(id),
    message_content TEXT NOT NULL,
    recipients_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plus minus daily report table
CREATE TABLE IF NOT EXISTS plus_minus (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id),
    ex_plant_id INTEGER REFERENCES ex_plants(id),
    buy_total DECIMAL(12,2) DEFAULT 0,
    sell_total DECIMAL(12,2) DEFAULT 0,
    profit DECIMAL(12,2) GENERATED ALWAYS AS (sell_total - buy_total) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, item_id, ex_plant_id)
);

-- Insert default admin user
INSERT INTO admin_user (username, password) VALUES ('admin', '123456') ON CONFLICT (username) DO NOTHING;

-- Insert default party
INSERT INTO parties (party_name, city, party_type) VALUES ('Good Luck Agro', 'Mumbai', 'both') ON CONFLICT (party_name) DO NOTHING;

-- Insert default items
INSERT INTO items (item_name, hsn_code) VALUES 
    ('Palm Oil', '15119010'),
    ('Rice', '10063000'),
    ('Mustard Oil', '15149000')
ON CONFLICT (item_name) DO NOTHING;

-- Insert default ex plants
INSERT INTO ex_plants (plant_name) VALUES 
    ('Plant A'),
    ('Plant B'),
    ('Plant C')
ON CONFLICT (plant_name) DO NOTHING;

-- Insert default brokers
INSERT INTO brokers (broker_name) VALUES 
    ('Broker 1'),
    ('Broker 2'),
    ('Broker 3')
ON CONFLICT (broker_name) DO NOTHING;

-- Insert default delivery conditions
INSERT INTO delivery_conditions (condition_name) VALUES 
    ('Ex Factory'),
    ('Ex Godown'),
    ('FOB'),
    ('CIF')
ON CONFLICT (condition_name) DO NOTHING;

-- Insert default payment conditions
INSERT INTO payment_conditions (condition_name) VALUES 
    ('Cash'),
    ('Credit 7 Days'),
    ('Credit 15 Days'),
    ('Credit 30 Days')
ON CONFLICT (condition_name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sauda_date ON sauda(date);
CREATE INDEX IF NOT EXISTS idx_sauda_type ON sauda(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sauda_party ON sauda(party_id);
CREATE INDEX IF NOT EXISTS idx_sauda_item ON sauda(item_id);
CREATE INDEX IF NOT EXISTS idx_sauda_ex_plant ON sauda(ex_plant_id);
CREATE INDEX IF NOT EXISTS idx_loading_sauda ON loading(sauda_id);
CREATE INDEX IF NOT EXISTS idx_loading_date ON loading(loading_date);
CREATE INDEX IF NOT EXISTS idx_stock_item ON stock(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ex_plant ON stock(ex_plant_id);
CREATE INDEX IF NOT EXISTS idx_plus_minus_date ON plus_minus(date);
CREATE INDEX IF NOT EXISTS idx_plus_minus_item ON plus_minus(item_id);
CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(party_name);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name); 