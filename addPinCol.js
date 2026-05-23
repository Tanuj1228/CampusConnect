const mysql = require('mysql2/promise');
require('dotenv').config();

async function addPinColumn() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'campus_connect'
        });

        console.log('Connected. Altering lost_found_items to add verification_pin...');
        
        await connection.query(`
            ALTER TABLE lost_found_items 
            ADD COLUMN verification_pin VARCHAR(4) DEFAULT NULL;
        `);

        console.log('Column added successfully!');
        await connection.end();
        process.exit(0);
    } catch (error) {
        // If column already exists (Error 1060), ignore
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists!');
            process.exit(0);
        } else {
            console.error('Error adding column:', error);
            process.exit(1);
        }
    }
}

addPinColumn();
