-- Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    displayName TEXT,
    permissions TEXT,
    description TEXT
);

-- Seed Default Roles (if they don't exist)
INSERT INTO roles (name, displayName, permissions, description)
SELECT 'admin', 'Admin', '["all"]', 'System Administrator'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, displayName, permissions, description)
SELECT 'crew', 'Crew', '["pos_access"]', 'Service Crew'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'crew');
