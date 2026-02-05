const fs = require('fs');
const path = require('path');

async function initDB() {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Remove comments
    const cleanSchema = schema.replace(/--.*$/gm, '');

    const statements = cleanSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute.`);

    for (const sql of statements) {

        try {
            const res = await fetch('http://localhost:3000/api/db/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sql })
            });
            const data = await res.json();

            if (res.ok) {
                console.log(`✅ Success: ${sql.substring(0, 30)}...`);
            } else {
                console.error(`❌ Failed: ${sql.substring(0, 30)}...`, data);
            }
        } catch (e) {
            console.error("Fetch error:", e.message);
        }
    }
}

initDB();
