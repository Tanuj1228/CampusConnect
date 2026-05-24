const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('Connected to MySQL. Creating database if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'campus_connect'}\`;`);
        await connection.query(`USE \`${process.env.DB_NAME || 'campus_connect'}\`;`);

        console.log('Creating/Updating Users table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role ENUM('student', 'admin') DEFAULT 'student',
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        try { await connection.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(255);"); } catch(err) {}
        try { await connection.query("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;"); } catch(err) {}

        console.log('Creating/Updating Lost and Found table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS lost_found_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                image_url VARCHAR(255),
                location VARCHAR(255),
                date DATE,
                contact_info VARCHAR(255),
                type ENUM('lost', 'found') NOT NULL,
                status ENUM('active', 'resolved') DEFAULT 'active',
                verification_pin VARCHAR(255),
                is_approved BOOLEAN DEFAULT 1,
                returned_by_id INT NULL,
                received_by_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN is_approved BOOLEAN DEFAULT 1;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN returned_by_id INT NULL;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN received_by_id INT NULL;"); } catch(err) {}

        console.log('Creating Notes table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                file_url VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                semester VARCHAR(50),
                branch VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Creating/Updating Donations table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS donations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                image_url VARCHAR(255),
                contact_info VARCHAR(255) NOT NULL,
                status ENUM('available', 'claimed') DEFAULT 'available',
                donor_id INT NULL,
                requester_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        try { await connection.query("ALTER TABLE donations ADD COLUMN donor_id INT NULL;"); } catch(err) {}
        try { await connection.query("ALTER TABLE donations ADD COLUMN requester_id INT NULL;"); } catch(err) {}

        console.log('Database setup completed successfully.');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error setting up the database:', error);
        process.exit(1);
    }
}

setupDatabase();