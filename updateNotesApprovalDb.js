const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to MySQL. Checking notes table for is_approved column...');

        let hasColumn = false;
        try {
            const [columns] = await connection.query("SHOW COLUMNS FROM notes LIKE 'is_approved';");
            if (columns.length > 0) {
                hasColumn = true;
            }
        } catch (err) {
            console.error('Error checking column:', err.message);
        }

        if (!hasColumn) {
            console.log('Adding is_approved column to notes table...');
            await connection.query("ALTER TABLE notes ADD COLUMN is_approved TINYINT(1) DEFAULT 0;");
            console.log("Successfully added is_approved column.");

            console.log('Updating existing notes to be approved (is_approved = 1)...');
            await connection.query("UPDATE notes SET is_approved = 1;");
            console.log("Successfully approved existing notes.");
        } else {
            console.log('Column is_approved already exists in notes table.');
        }

        await connection.end();
        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error running notes approval migration:', error);
        process.exit(1);
    }
}

updateDatabase();
