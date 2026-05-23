const pool = require('./config/database');

async function updateDonationsDatabase() {
    try {
        console.log("Checking and adding 'donation_type' column to 'donations' table...");
        try {
            await pool.execute("ALTER TABLE donations ADD COLUMN donation_type ENUM('offer', 'request') DEFAULT 'offer'");
            console.log("Success: Column 'donation_type' added to donations.");
        } catch (e) {
            if (e.errno === 1060 || e.message.includes('duplicate') || e.message.includes('already exists')) {
                console.log("Column 'donation_type' already exists, skipping.");
            } else {
                throw e;
            }
        }

        console.log("Checking and adding 'donor_id' column to 'donations' table...");
        try {
            await pool.execute("ALTER TABLE donations ADD COLUMN donor_id INT DEFAULT NULL");
            console.log("Success: Column 'donor_id' added to donations.");
        } catch (e) {
            if (e.errno === 1060 || e.message.includes('duplicate') || e.message.includes('already exists')) {
                console.log("Column 'donor_id' already exists, skipping.");
            } else {
                throw e;
            }
        }

        console.log("Checking and adding foreign key constraint for 'donor_id' on 'donations' table...");
        try {
            await pool.execute("ALTER TABLE donations ADD CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE SET NULL");
            console.log("Success: Foreign key constraint 'fk_donations_donor' added.");
        } catch (e) {
            if (e.message.includes('Duplicate foreign key') || e.errno === 1211 || e.message.includes('already exists') || e.code === 'ER_FK_DUP_NAME') {
                console.log("Foreign key constraint already exists, skipping.");
            } else {
                console.log("Constraint might already exist or other warning:", e.message);
            }
        }

        console.log("Donations Database Schema updates complete.");
    } catch (err) {
        console.error("Fatal Error during DB update:", err);
    } finally {
        process.exit();
    }
}

updateDonationsDatabase();
