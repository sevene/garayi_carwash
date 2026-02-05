-- Migration: Add ticket_number column to tickets table
-- Run with: npx wrangler d1 execute garayi-carwash --file=migrations/001_add_ticket_number.sql

-- Add ticket_number column
ALTER TABLE tickets ADD COLUMN ticket_number TEXT UNIQUE;

-- Create index for faster lookups by ticket_number prefix (for sequence counting)
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
