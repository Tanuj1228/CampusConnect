const mysql = require('mysql2/promise');
require('dotenv').config();

async function addOtpColumns() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected to MySQL. Adding OTP columns to lost_found_claims...');

        const columns = [
            'ADD COLUMN claimer_otp VARCHAR(6) DEFAULT NULL',
            'ADD COLUMN poster_otp VARCHAR(6) DEFAULT NULL',
            'ADD COLUMN claimer_verified TINYINT(1) DEFAULT 0',
            'ADD COLUMN poster_verified TINYINT(1) DEFAULT 0'
        ];

        for (let col of columns) {
            try {
                await connection.query(`ALTER TABLE lost_found_claims ${col};`);
                console.log(`Successfully added: ${col}`);
            } catch (err) {
                if (err.errno === 1060) {
                    console.log(`Column already exists, skipping: ${col}`);
                } else {
                    console.error(`Error adding column: ${col}`, err);
                }
            }
        }

        await connection.end();
        console.log('OTP columns migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error running migration:', error);
        process.exit(1);
    }
}

addOtpColumns();
