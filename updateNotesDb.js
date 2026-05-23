const pool = require('./config/database');

async function updateNotesSchema() {
    try {
        console.log("Creating 'departments' table...");
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                years INT NOT NULL DEFAULT 3,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Success: departments table created.");

        // Check if departments table is empty, if so, seed it
        const [rows] = await pool.execute("SELECT COUNT(*) as count FROM departments");
        if (rows[0].count === 0) {
            console.log("Seeding initial departments...");
            const initialDeps = [
                ['BE CSE', 4],
                ['BCA', 3],
                ['MCA', 2],
                ['BBA', 3],
                ['B.Com', 3]
            ];
            for (const [name, years] of initialDeps) {
                await pool.execute("INSERT INTO departments (name, years) VALUES (?, ?)", [name, years]);
                console.log(`Seeded: ${name} with ${years} years.`);
            }
            console.log("Success: Seeding complete.");
        } else {
            console.log("Departments table already seeded.");
        }

        // Alter notes table: add department_id
        console.log("Checking and adding 'department_id' column to 'notes' table...");
        try {
            await pool.execute("ALTER TABLE notes ADD COLUMN department_id INT DEFAULT NULL");
            console.log("Success: Column 'department_id' added to notes.");
        } catch (e) {
            if (e.errno === 1060 || e.message.includes('duplicate')) {
                console.log("Column 'department_id' already exists, skipping.");
            } else {
                throw e;
            }
        }

        // Alter notes table: add note_type
        console.log("Checking and adding 'note_type' column to 'notes' table...");
        try {
            await pool.execute("ALTER TABLE notes ADD COLUMN note_type ENUM('file', 'link') DEFAULT 'file'");
            console.log("Success: Column 'note_type' added to notes.");
        } catch (e) {
            if (e.errno === 1060 || e.message.includes('duplicate')) {
                console.log("Column 'note_type' already exists, skipping.");
            } else {
                throw e;
            }
        }

        // Add foreign key constraint for department_id
        console.log("Checking and adding foreign key constraint for 'department_id' on 'notes' table...");
        try {
            // First check if fk already exists by trying to add it
            await pool.execute("ALTER TABLE notes ADD CONSTRAINT fk_notes_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL");
            console.log("Success: Foreign key constraint 'fk_notes_department' added.");
        } catch (e) {
            if (e.message.includes('Duplicate foreign key') || e.errno === 1211 || e.message.includes('already exists') || e.code === 'ER_FK_DUP_NAME') {
                console.log("Foreign key constraint already exists, skipping.");
            } else {
                console.log("Constraint might already exist or other warning:", e.message);
            }
        }

        console.log("Notes Database Schema updates complete.");
    } catch (err) {
        console.error("Fatal Error during DB update:", err);
    } finally {
        process.exit();
    }
}

updateNotesSchema();
