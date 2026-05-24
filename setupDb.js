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

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'campus_connect'}\`;`);
        await connection.query(`USE \`${process.env.DB_NAME || 'campus_connect'}\`;`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                profile_picture VARCHAR(255),
                role ENUM('student', 'admin') DEFAULT 'student',
                status VARCHAR(50) DEFAULT 'active',
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        try { await connection.query("ALTER TABLE users ADD COLUMN full_name VARCHAR(255);"); } catch(err) {}
        try { await connection.query("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255);"); } catch(err) {}
        try { await connection.query("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';"); } catch(err) {}
        try { await connection.query("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;"); } catch(err) {}

        await connection.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

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
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Open',
                verification_pin VARCHAR(255),
                category VARCHAR(255) DEFAULT 'Other',
                hidden_details TEXT,
                color VARCHAR(255),
                brand VARCHAR(255),
                fingerprint VARCHAR(255),
                matchScore INT,
                matchedItemId INT,
                report_count INT DEFAULT 0,
                is_approved BOOLEAN DEFAULT 1,
                returned_by_id INT NULL,
                received_by_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN category VARCHAR(255) DEFAULT 'Other';"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN hidden_details TEXT;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN color VARCHAR(255);"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN brand VARCHAR(255);"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN fingerprint VARCHAR(255);"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN matchScore INT;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN matchedItemId INT;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN report_count INT DEFAULT 0;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN is_approved BOOLEAN DEFAULT 1;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN returned_by_id INT NULL;"); } catch(err) {}
        try { await connection.query("ALTER TABLE lost_found_items ADD COLUMN received_by_id INT NULL;"); } catch(err) {}

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
                department_id INT NULL,
                note_type VARCHAR(50) DEFAULT 'file',
                subject_id INT NULL,
                is_approved BOOLEAN DEFAULT 0,
                downloads INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
            );
        `);
        try { await connection.query("ALTER TABLE notes ADD COLUMN department_id INT NULL;"); } catch(err) {}
        try { await connection.query("ALTER TABLE notes ADD COLUMN note_type VARCHAR(50) DEFAULT 'file';"); } catch(err) {}
        try { await connection.query("ALTER TABLE notes ADD COLUMN subject_id INT NULL;"); } catch(err) {}
        try { await connection.query("ALTER TABLE notes ADD COLUMN is_approved BOOLEAN DEFAULT 0;"); } catch(err) {}
        try { await connection.query("ALTER TABLE notes ADD COLUMN downloads INT DEFAULT 0;"); } catch(err) {}

        await connection.query(`
            CREATE TABLE IF NOT EXISTS donations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                image_url VARCHAR(255),
                contact_info VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'available',
                category VARCHAR(255) DEFAULT 'Other',
                donation_type VARCHAR(50) DEFAULT 'offer',
                donor_id INT NULL,
                requester_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        try { await connection.query("ALTER TABLE donations ADD COLUMN category VARCHAR(255) DEFAULT 'Other';"); } catch(err) {}
        try { await connection.query("ALTER TABLE donations ADD COLUMN donation_type VARCHAR(50) DEFAULT 'offer';"); } catch(err) {}
        try { await connection.query("ALTER TABLE donations ADD COLUMN donor_id INT NULL;"); } catch(err) {}
        try { await connection.query("ALTER TABLE donations ADD COLUMN requester_id INT NULL;"); } catch(err) {}

        await connection.query(`
            CREATE TABLE IF NOT EXISTS complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'Open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                item_id INT NOT NULL,
                item_type VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                sender_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('Error setting up the database:', error);
        process.exit(1);
    }
}

setupDatabase();