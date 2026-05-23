const db = require('../config/database');

class UserActivity {
    static async create(user_id, activity_type, description) {
        try {
            const [result] = await db.execute(
                'INSERT INTO user_activities (user_id, activity_type, description) VALUES (?, ?, ?)',
                [user_id, activity_type, description]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error inserting user activity:', error);
            // Non-blocking error: do not crash the app if activity logging fails
            return null;
        }
    }

    static async findByUser(user_id, limit = 50) {
        const sanitizedLimit = parseInt(limit, 10) || 50;
        const [rows] = await db.query(
            `SELECT * FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ${sanitizedLimit}`,
            [user_id]
        );
        return rows;
    }
}

module.exports = UserActivity;
