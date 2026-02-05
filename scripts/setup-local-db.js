const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'local.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

console.log(`Setting up local database at: ${DB_PATH}`);

try {
    // Remove existing DB to start fresh (matches user desire for "clean" setup or similar)
    // Or maybe we should keep it? "npm run db:setup:local" implies setup.
    // Let's delete it to ensure schema is applied correctly.
    if (fs.existsSync(DB_PATH)) {
        console.log('Removing existing database...');
        fs.unlinkSync(DB_PATH);
    }

    const db = new Database(DB_PATH);
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    // better-sqlite3 exec supports multiple statements
    db.exec(schema);

    console.log('✅ Database successfully initialized from schema.sql');
    console.log('   You can now run "npm run dev"!');

} catch (error) {
    console.error('❌ Failed to set up local database:', error);
    process.exit(1);
}
