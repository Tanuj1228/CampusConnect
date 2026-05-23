const db = require('../config/database');

class User {
    static async create(username, email, password_hash, full_name = null, role = 'student') {
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, password_hash, full_name, role]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }
    
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async updateProfile(id, data) {
        let query = 'UPDATE users SET ';
        const values = [];
        const updates = [];

        if (data.full_name !== undefined) {
            updates.push('full_name = ?');
            values.push(data.full_name);
        }
        if (data.profile_picture !== undefined) {
            updates.push('profile_picture = ?');
            values.push(data.profile_picture);
        }

        if (updates.length === 0) return true;

        query += updates.join(', ') + ' WHERE id = ?';
        values.push(id);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    static async updatePassword(id, password_hash) {
        const [result] = await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
        return result.affectedRows > 0;
    }

    static async updateLastLogin(id) {
        await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }

    static async getUserStats(id) {
        const [lostFound] = await db.execute('SELECT COUNT(*) as count FROM lost_found_items WHERE user_id = ?', [id]);
        const [notes] = await db.execute('SELECT COUNT(*) as count FROM notes WHERE user_id = ?', [id]);
        const [donations] = await db.execute('SELECT COUNT(*) as count FROM donations WHERE user_id = ?', [id]);
        const [complaints] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE user_id = ?', [id]);
        
        return {
            lostFound: lostFound[0].count,
            notes: notes[0].count,
            donations: donations[0].count,
            complaints: complaints[0].count
        };
    }

    static async findAll(filters = {}) {
        let query = 'SELECT id, username, email, full_name, role, status, created_at, last_login FROM users';
        let queryParams = [];
        let conditions = [];

        if (filters.keyword) {
            conditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)');
            queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
        }
        if (filters.role) {
            conditions.push('role = ?');
            queryParams.push(filters.role);
        }
        if (filters.status) {
            conditions.push('status = ?');
            queryParams.push(filters.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.execute(query, queryParams);
        return rows;
    }

    static async updateStatus(id, status) {
        const [result] = await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows > 0;
    }
}

module.exports = User;
