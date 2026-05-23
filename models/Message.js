const db = require('../config/database');

class Message {
    static async create(item_id, sender_id, content) {
        const [result] = await db.execute(
            'INSERT INTO messages (item_id, sender_id, content) VALUES (?, ?, ?)',
            [item_id, sender_id, content]
        );
        return result.insertId;
    }

    static async getByItemId(item_id) {
        const [rows] = await db.execute(
            'SELECT messages.*, users.username FROM messages JOIN users ON messages.sender_id = users.id WHERE item_id = ? ORDER BY created_at ASC',
            [item_id]
        );
        return rows;
    }
}

module.exports = Message;
