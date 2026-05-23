const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to MySQL. Dropping and recreating complaints table...');

        await connection.query('DROP TABLE IF EXISTS complaints;');

        await connection.query(`
            CREATE TABLE complaints (
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

        console.log('Database fix completed successfully.');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error fixing the database:', error);
        process.exit(1);
    }
}

fixDb();
