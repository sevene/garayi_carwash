
-- Create Inventory Transactions Log Table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER NOT NULL,
  change_amount INTEGER, -- can be negative or positive
  reason TEXT, -- e.g. "Restock", "Damage", "Manual Correction"
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
