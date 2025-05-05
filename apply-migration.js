const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'face_timekeeping',
        user: 'postgres',
        password: 'postgres' // Replace with your actual password
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Read the SQL file
        const sqlPath = path.join(__dirname, 'migrations', '0000_flimsy_phalanx.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split on statement-breakpoint and execute each query
        const queries = sql.split('--> statement-breakpoint');

        for (let i = 0; i < queries.length; i++) {
            const query = queries[i].trim();
            if (query) {
                try {
                    await client.query(query);
                    console.log(`Executed query ${i + 1}/${queries.length}`);
                } catch (err) {
                    console.error(`Error executing query ${i + 1}: ${err.message}`);
                    // Continue with other queries even if one fails
                }
            }
        }

        console.log('Migration applied successfully');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
        console.log('Disconnected from database');
    }
}

applyMigration(); 