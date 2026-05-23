const db = require('../config/database');

class Bookmark {
    static async create(user_id, item_type, item_id) {
        // Check if already bookmarked to prevent duplicates
        const existing = await this.findByUserAndItem(user_id, item_type, item_id);
        if (existing) return existing.id;

        const [result] = await db.execute(
            'INSERT INTO bookmarks (user_id, item_type, item_id) VALUES (?, ?, ?)',
            [user_id, item_type, item_id]
        );
        return result.insertId;
    }

    static async findByUserAndItem(user_id, item_type, item_id) {
        const [rows] = await db.execute(
            'SELECT * FROM bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [user_id, item_type, item_id]
        );
        return rows[0];
    }

    static async delete(user_id, item_type, item_id) {
        const [result] = await db.execute(
            'DELETE FROM bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?',
            [user_id, item_type, item_id]
        );
        return result.affectedRows > 0;
    }

    static async findByUser(user_id, item_type = null) {
        let query = 'SELECT * FROM bookmarks WHERE user_id = ?';
        let params = [user_id];
        
        if (item_type) {
            query += ' AND item_type = ?';
            params.push(item_type);
        }
        
        query += ' ORDER BY created_at DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async findSavedNotesByUser(user_id) {
        const query = `
            SELECT b.id as bookmark_id, n.*, u.username as uploader_username 
            FROM bookmarks b 
            JOIN notes n ON b.item_id = n.id 
            JOIN users u ON n.user_id = u.id 
            WHERE b.user_id = ? AND b.item_type = 'Note' 
            ORDER BY b.created_at DESC
        `;
        const [rows] = await db.execute(query, [user_id]);
        return rows;
    }

    static async findSavedDonationsByUser(user_id) {
        const query = `
            SELECT b.id as bookmark_id, d.*, u.username as creator_username,
                   donor_users.username as donor_username,
                   req_users.username as requester_username
            FROM bookmarks b
            JOIN donations d ON b.item_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN users donor_users ON d.donor_id = donor_users.id
            LEFT JOIN users req_users ON d.requester_id = req_users.id
            WHERE b.user_id = ? AND b.item_type = 'Donation'
            ORDER BY b.created_at DESC
        `;
        const [rows] = await db.execute(query, [user_id]);
        return rows;
    }

    static async findSavedLostFoundsByUser(user_id) {
        const query = `
            SELECT b.id as bookmark_id, lf.*, u.username as creator_username
            FROM bookmarks b
            JOIN lost_found_items lf ON b.item_id = lf.id
            JOIN users u ON lf.user_id = u.id
            WHERE b.user_id = ? AND b.item_type = 'LostFound'
            ORDER BY b.created_at DESC
        `;
        const [rows] = await db.execute(query, [user_id]);
        return rows;
    }

    static async findSavedComplaintsByUser(user_id) {
        const query = `
            SELECT b.id as bookmark_id, c.*, u.username as creator_username
            FROM bookmarks b
            JOIN complaints c ON b.item_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE b.user_id = ? AND b.item_type = 'Complaint'
            ORDER BY b.created_at DESC
        `;
        const [rows] = await db.execute(query, [user_id]);
        return rows;
    }
}

module.exports = Bookmark;
