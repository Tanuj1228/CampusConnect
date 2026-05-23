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

        console.log('Connected to MySQL. Updating database...');

        // Update Users Table
        console.log('Updating Users table...');
        
        // Use try-catch for each alter table to avoid crashing if columns already exist
        const columnsToAdd = [
            'ADD COLUMN full_name VARCHAR(255) DEFAULT NULL',
            'ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL',
            'ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL',
            'ADD COLUMN account_status ENUM("active", "suspended") DEFAULT "active"'
        ];

        for (let col of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE users ${col};`);
                console.log(`Successfully executed: ALTER TABLE users ${col}`);
            } catch (err) {
                // Ignore duplicate column errors (ER_DUP_FIELDNAME - 1060)
                if (err.errno === 1060) {
                    console.log(`Column already exists, skipping: ${col}`);
                } else {
                    console.error(`Error executing ${col}:`, err);
                }
            }
        }

        // Create Complaints Table
        console.log('Creating Complaints table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category ENUM('WiFi Issue', 'Electricity', 'Hostel', 'Classroom', 'Washroom', 'Library', 'Canteen', 'Maintenance', 'Other') NOT NULL,
                priority ENUM('Low', 'Medium', 'High') NOT NULL,
                location VARCHAR(255) NOT NULL,
                status ENUM('Pending', 'In Progress', 'Resolved', 'Rejected') DEFAULT 'Pending',
                image_url VARCHAR(255),
                admin_remarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Database update completed successfully.');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error updating the database:', error);
        process.exit(1);
    }
}

updateDatabase();
