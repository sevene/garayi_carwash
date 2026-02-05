-- Add crew_snapshot column to ticket_items table to store assigned crew per item
ALTER TABLE ticket_items ADD COLUMN crew_snapshot TEXT;
