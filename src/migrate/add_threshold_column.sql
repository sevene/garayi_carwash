
-- Add low_stock_threshold column to products table
ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
