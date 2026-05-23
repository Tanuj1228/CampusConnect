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

        console.log('Connected to MySQL. Adding returned_by_id and received_by_id to lost_found_items...');

        try {
            await connection.query("ALTER TABLE lost_found_items ADD COLUMN returned_by_id INT DEFAULT NULL;");
            console.log("Successfully added returned_by_id column.");
        } catch (err) {
            if (err.errno === 1060 || err.message.includes('duplicate')) {
                console.log("Column returned_by_id already exists.");
            } else {
                throw err;
            }
        }

        try {
            await connection.query("ALTER TABLE lost_found_items ADD COLUMN received_by_id INT DEFAULT NULL;");
            console.log("Successfully added received_by_id column.");
        } catch (err) {
            if (err.errno === 1060 || err.message.includes('duplicate')) {
                console.log("Column received_by_id already exists.");
            } else {
                throw err;
            }
        }

        console.log('Adding foreign key constraints to lost_found_items...');
        try {
            await connection.query("ALTER TABLE lost_found_items ADD CONSTRAINT fk_lost_found_returned FOREIGN KEY (returned_by_id) REFERENCES users(id) ON DELETE SET NULL;");
            console.log("Successfully added fk_lost_found_returned constraint.");
        } catch (err) {
            console.log("Constraint fk_lost_found_returned might already exist or skipped:", err.message);
        }

        try {
            await connection.query("ALTER TABLE lost_found_items ADD CONSTRAINT fk_lost_found_received FOREIGN KEY (received_by_id) REFERENCES users(id) ON DELETE SET NULL;");
            console.log("Successfully added fk_lost_found_received constraint.");
        } catch (err) {
            console.log("Constraint fk_lost_found_received might already exist or skipped:", err.message);
        }

        console.log('Creating user_activities table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                activity_type VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('Successfully created user_activities table.');

        await connection.end();
        console.log('Database updates complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}

updateDatabase();
