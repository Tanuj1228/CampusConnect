const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    try {
        // First connection without database name to create the database if it doesn't exist
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('Connected to MySQL. Creating database if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'campus_connect'}\`;`);
        await connection.query(`USE \`${process.env.DB_NAME || 'campus_connect'}\`;`);

        console.log('Creating Users table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('student', 'admin') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Creating Lost and Found table...');
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

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

        console.log('Creating Donations table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS donations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                image_url VARCHAR(255),
                contact_info VARCHAR(255) NOT NULL,
                status ENUM('available', 'claimed') DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Database setup completed successfully.');
        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error setting up the database:', error);
        process.exit(1);
    }
}

setupDatabase();
