const pool = require('./config/database');

async function updateDatabase() {
    try {
        console.log("Creating 'subjects' table...");
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                department_id INT NOT NULL,
                semester INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
                UNIQUE KEY unique_subject (name, department_id, semester)
            )
        `);
        console.log("Success: subjects table created.");

        // Alter notes table: add subject_id
        console.log("Checking and adding 'subject_id' column to 'notes' table...");
        try {
            await pool.execute("ALTER TABLE notes ADD COLUMN subject_id INT DEFAULT NULL");
            console.log("Success: Column 'subject_id' added to notes.");
        } catch (e) {
            if (e.errno === 1060 || e.message.includes('duplicate')) {
                console.log("Column 'subject_id' already exists, skipping.");
            } else {
                throw e;
            }
        }

        // Add foreign key constraint for subject_id
        console.log("Checking and adding foreign key constraint for 'subject_id' on 'notes' table...");
        try {
            await pool.execute("ALTER TABLE notes ADD CONSTRAINT fk_notes_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL");
            console.log("Success: Foreign key constraint 'fk_notes_subject' added.");
        } catch (e) {
            if (e.message.includes('Duplicate foreign key') || e.errno === 1211 || e.message.includes('already exists') || e.code === 'ER_FK_DUP_NAME') {
                console.log("Foreign key constraint already exists, skipping.");
            } else {
                console.log("Constraint might already exist or other warning:", e.message);
            }
        }

        // Seed some initial subjects for BE CSE Semester 1 as an example
        // Find BE CSE id
        const [depts] = await pool.execute("SELECT id FROM departments WHERE name = 'BE CSE'");
        if (depts.length > 0) {
            const cseId = depts[0].id;
            console.log("Found BE CSE ID:", cseId);
            const initialSubjects = [
                ['Mathematics-I', cseId, 1],
                ['Physics', cseId, 1],
                ['Computer Programming', cseId, 1],
                ['Basic Electrical Engineering', cseId, 1],
                ['Engineering Chemistry', cseId, 2],
                ['Mathematics-II', cseId, 2],
                ['Object Oriented Programming', cseId, 2]
            ];
            for (const [name, dept_id, sem] of initialSubjects) {
                try {
                    await pool.execute("INSERT INTO subjects (name, department_id, semester) VALUES (?, ?, ?)", [name, dept_id, sem]);
                    console.log(`Seeded subject: ${name} for Sem ${sem}`);
                } catch (err) {
                    // Ignore duplicate key
                }
            }
        }

        console.log("Subjects Database Schema updates complete.");
    } catch (err) {
        console.error("Fatal Error during DB update:", err);
    } finally {
        process.exit();
    }
}

updateDatabase();
