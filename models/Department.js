const db = require('../config/database');

class Department {
    static async create(name, years) {
        const [result] = await db.execute(
            'INSERT INTO departments (name, years) VALUES (?, ?)',
            [name, years]
        );
        return result.insertId;
    }

    static async findAll() {
        const [rows] = await db.execute(
            'SELECT * FROM departments ORDER BY name ASC'
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT * FROM departments WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async delete(id) {
        const [result] = await db.execute(
            'DELETE FROM departments WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Department;
