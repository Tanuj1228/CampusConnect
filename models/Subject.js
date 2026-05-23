const db = require('../config/database');

class Subject {
    static async create(name, department_id, semester) {
        const [result] = await db.execute(
            'INSERT INTO subjects (name, department_id, semester) VALUES (?, ?, ?)',
            [name, department_id, semester]
        );
        return result.insertId;
    }

    static async findByDepartmentAndSemester(department_id, semester) {
        const [rows] = await db.execute(
            'SELECT * FROM subjects WHERE department_id = ? AND semester = ? ORDER BY name ASC',
            [department_id, semester]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT * FROM subjects WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async delete(id) {
        const [result] = await db.execute(
            'DELETE FROM subjects WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
    
    static async findAllWithDept() {
        const [rows] = await db.execute(`
            SELECT s.*, d.name as department_name 
            FROM subjects s 
            JOIN departments d ON s.department_id = d.id 
            ORDER BY d.name ASC, s.semester ASC, s.name ASC
        `);
        return rows;
    }
}

module.exports = Subject;
