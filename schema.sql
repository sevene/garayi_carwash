-- Drop tables if they exist to ensure clean slate for new vertical
DROP TABLE IF EXISTS service_variant_ingredients;
DROP TABLE IF EXISTS service_variants;
DROP TABLE IF EXISTS service_ingredients;
DROP TABLE IF EXISTS ticket_items;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS customer_vehicles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS settings;

-- Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton row
  name TEXT DEFAULT 'Garayi Carwash',
  address_street TEXT,
  currency TEXT DEFAULT 'PHP',
  tax_rate REAL DEFAULT 0.08,
  enable_notifications INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'light',
  receipt_header TEXT,
  receipt_footer TEXT,
  printer_name TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Employees Table (for authentication and staff management)
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'staff',
  pin TEXT,
  contactInfo TEXT DEFAULT '{}',
  address TEXT,
  status TEXT DEFAULT 'active',
  compensation TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  parent_id INTEGER,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Create Products Table (Inventory Only)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  price REAL NOT NULL DEFAULT 0, -- Retail Price
  category TEXT, -- Link to Category Name or ID (Legacy was loose, we can keep loose or FK)
  -- keeping category as TEXT for now to match some legacy behavior, checking route.ts it seems to use ID cast to text or name.
  -- Let's stick to what route.ts expects, which seems to contain category ID.
  volume TEXT,
  unit_type TEXT, -- 'piece', 'weight/volume'
  cost REAL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  show_in_pos INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  image_url TEXT
);

-- Create Services Table (Labor/Wash Only)
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  servicePrice REAL DEFAULT 0,
  laborCost REAL DEFAULT 0,
  laborCostType TEXT DEFAULT 'fixed', -- 'fixed' or 'percentage'
  durationMinutes INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  showInPos INTEGER DEFAULT 1,
  image_url TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Create Service Ingredients (Recipe) Table
CREATE TABLE IF NOT EXISTS service_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL, -- The ingredient product from inventory
  quantity REAL DEFAULT 1,
  unit_cost REAL DEFAULT 0,
  price_basis TEXT DEFAULT 'cost',
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create Service Variants Table
CREATE TABLE IF NOT EXISTS service_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Create Service Variant Ingredients Table
CREATE TABLE IF NOT EXISTS service_variant_ingredients (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   variant_id INTEGER NOT NULL,
   product_id INTEGER NOT NULL,
   quantity REAL DEFAULT 1,
   FOREIGN KEY (variant_id) REFERENCES service_variants(id) ON DELETE CASCADE,
   FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create Customers Table
-- Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Address
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,

  -- Notes & Loyalty
  notes TEXT,
  loyalty_points INTEGER DEFAULT 0,

  visits_count INTEGER DEFAULT 0,
  last_visit DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Customer Vehicles Table (One-to-Many)
CREATE TABLE IF NOT EXISTS customer_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  plate_number TEXT,
  vehicle_type TEXT, -- Make/Model
  vehicle_color TEXT,
  vehicle_size TEXT, -- 'sedan', 'suv', 'truck' etc
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create Tickets (Job Orders)
-- Create Tickets (Job Orders)
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT UNIQUE, -- Formatted ticket ID (e.g., GCW-2602011853001)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME, -- Renamed from finished_at to match API
  subtotal REAL DEFAULT 0, -- Sum of item prices before tax
  tax_rate REAL DEFAULT 0, -- Tax rate at time of order (e.g., 0.12 for 12%)
  tax_amount REAL DEFAULT 0, -- Calculated tax amount
  total REAL NOT NULL, -- Final total (subtotal + tax)
  status TEXT DEFAULT 'QUEUED', -- 'QUEUED', 'WASHING', 'DRYING', 'READY', 'PAID'
  payment_method TEXT,
  customer_id INTEGER,
  plate_number TEXT,
  name TEXT, -- Added to track order name/identifier
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Create Ticket Items
CREATE TABLE IF NOT EXISTS ticket_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  product_id INTEGER, -- Nullable if it's a service? OR we unify ID space?
  -- Ideally references products OR services. For now, let's keep it simple.
  item_type TEXT DEFAULT 'service', -- 'service' or 'product'
  item_id INTEGER, -- generic ID
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  crew_snapshot TEXT, -- JSON array of assigned crew names/ids at time of order
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- Create Ticket Assignments (Crew/Staff linking)
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  role TEXT DEFAULT 'crew', -- 'crew', 'cashier', etc.
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Seed Admin User (into employees table)
INSERT INTO employees (username, name, password_hash, role) VALUES
('admin', 'Administrator', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

-- Seed Initial Settings
INSERT OR IGNORE INTO settings (id, name, currency) VALUES (1, 'Garayi Carwash', 'PHP');
