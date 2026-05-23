const db = require('../config/database');

class ActivityLog {
    static async create(admin_id, action_type, description) {
        const [result] = await db.execute(
            'INSERT INTO activity_logs (admin_id, action_type, description) VALUES (?, ?, ?)',
            [admin_id, action_type, description]
        );
        return result.insertId;
    }

    static async getRecent(limit = 50) {
        const sanitizedLimit = parseInt(limit, 10) || 50;
        const [rows] = await db.query(`
            SELECT al.*, u.username as admin_username 
            FROM activity_logs al 
            JOIN users u ON al.admin_id = u.id 
            ORDER BY al.created_at DESC 
            LIMIT ${sanitizedLimit}
        `);
        return rows;
    }
}

module.exports = ActivityLog;
