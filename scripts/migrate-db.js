const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'local.db');

if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at ${dbPath}`);
    process.exit(1);
}

console.log(`Migrating database at ${dbPath}...`);
const db = new Database(dbPath);

try {
    // 1. Check tables
    const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    const employeesTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get();

    db.transaction(() => {
        // Rename users -> employees if needed
        if (usersTable && !employeesTable) {
            console.log("Renaming 'users' table to 'employees'...");
            db.prepare("ALTER TABLE users RENAME TO employees").run();
        } else if (employeesTable) {
            console.log("'employees' table already exists.");
        } else {
            console.log("'users' table not found. Creating 'employees' from scratch if not exists...");
            db.prepare(`
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    role TEXT,
                    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `).run();
        }

        // Define columns to ensure
        const columns = [
            // New schema: name, role, pin, contactInfo, address, status, compensation, createdAt
            { name: 'name', type: 'TEXT', default: "''", oldName: 'username' },
            { name: 'role', type: 'TEXT', default: "''" },
            { name: 'pin', type: 'TEXT', default: "''" },
            { name: 'contactInfo', type: 'TEXT', default: "'{}'" },
            { name: 'address', type: 'TEXT', default: "''" },
            { name: 'status', type: 'TEXT', default: "'active'" },
            { name: 'compensation', type: 'TEXT', default: "'{}'" },
            { name: 'createdAt', type: 'TEXT', default: "CURRENT_TIMESTAMP", oldName: 'created_at' }
        ];

        const tableInfo = db.prepare("PRAGMA table_info(employees)").all();
        const existingColNames = tableInfo.map(c => c.name);

        for (const col of columns) {
            // Check for rename first
            if (col.oldName && existingColNames.includes(col.oldName) && !existingColNames.includes(col.name)) {
                console.log(`Renaming column '${col.oldName}' to '${col.name}'...`);
                db.prepare(`ALTER TABLE employees RENAME COLUMN ${col.oldName} TO ${col.name}`).run();
            } else if (!existingColNames.includes(col.name)) {
                console.log(`Adding column '${col.name}'...`);
                db.prepare(`ALTER TABLE employees ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`).run();
            }
        }
    })();

    console.log("Migration completed successfully!");

} catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
}
