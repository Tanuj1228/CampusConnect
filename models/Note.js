const db = require('../config/database');

class Note {
    static async create(user_id, title, description, file_url, subject, semester, branch, department_id = null, note_type = 'file', subject_id = null) {
        const [result] = await db.execute(
            'INSERT INTO notes (user_id, title, description, file_url, subject, semester, branch, department_id, note_type, subject_id, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
            [user_id, title, description, file_url, subject, semester, branch, department_id, note_type, subject_id]
        );
        return result.insertId;
    }

    static async findAll(filters = {}) {
        let query = 'SELECT notes.*, users.username, departments.name as department_name FROM notes JOIN users ON notes.user_id = users.id LEFT JOIN departments ON notes.department_id = departments.id';
        let queryParams = [];
        let conditions = [];

        if (filters.keyword) {
            conditions.push('(notes.title LIKE ? OR notes.description LIKE ? OR notes.subject LIKE ?)');
            queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
        }
        if (filters.subject) {
            conditions.push('notes.subject LIKE ?');
            queryParams.push(`%${filters.subject}%`);
        }
        if (filters.semester) {
            conditions.push('notes.semester = ?');
            queryParams.push(filters.semester);
        }
        if (filters.branch) {
            conditions.push('(notes.branch LIKE ? OR departments.name LIKE ?)');
            queryParams.push(`%${filters.branch}%`, `%${filters.branch}%`);
        }
        if (filters.department_id) {
            conditions.push('notes.department_id = ?');
            queryParams.push(filters.department_id);
        }
        if (filters.subject_id) {
            conditions.push('notes.subject_id = ?');
            queryParams.push(filters.subject_id);
        }
        if (filters.exclude_user_id) {
            conditions.push('notes.user_id != ?');
            queryParams.push(filters.exclude_user_id);
        }
        if (filters.is_approved !== undefined) {
            if (filters.is_approved !== 'all') {
                conditions.push('notes.is_approved = ?');
                queryParams.push(filters.is_approved);
            }
        } else if (filters.current_user_id) {
            conditions.push('(notes.is_approved = 1 OR notes.user_id = ?)');
            queryParams.push(filters.current_user_id);
        } else {
            conditions.push('notes.is_approved = 1');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        if (filters.sort === 'downloads') {
            query += ' ORDER BY downloads DESC';
        } else if (filters.sort === 'alphabetical') {
            query += ' ORDER BY title ASC';
        } else {
            query += ' ORDER BY created_at DESC';
        }

        if (filters.limit) {
            query += ' LIMIT ?';
            queryParams.push(parseInt(filters.limit, 10));
        }

        const [rows] = await db.query(query, queryParams);
        return rows;
    }

    static async incrementDownload(id) {
        await db.execute('UPDATE notes SET downloads = downloads + 1 WHERE id = ?', [id]);
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT notes.*, users.username, departments.name as department_name FROM notes JOIN users ON notes.user_id = users.id LEFT JOIN departments ON notes.department_id = departments.id WHERE notes.id = ?', [id]);
        return rows[0];
    }

    static async approve(id) {
        const [result] = await db.execute('UPDATE notes SET is_approved = 1 WHERE id = ?', [id]);
        return result.affectedRows;
    }
}

module.exports = Note;
