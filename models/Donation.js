const db = require('../config/database');

class Donation {
    static async create(user_id, title, description, image_url, contact_info, category, donation_type = 'offer') {
        const [result] = await db.execute(
            'INSERT INTO donations (user_id, title, description, image_url, contact_info, category, donation_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, title, description, image_url, contact_info, category || 'Other', donation_type]
        );
        return result.insertId;
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT donations.*, 
                   users.username, users.full_name, 
                   req_users.username as requester_username, req_users.full_name as requester_full_name,
                   donor_users.username as donor_username, donor_users.full_name as donor_full_name
            FROM donations 
            JOIN users ON donations.user_id = users.id 
            LEFT JOIN users req_users ON donations.requester_id = req_users.id
            LEFT JOIN users donor_users ON donations.donor_id = donor_users.id
        `;
        let queryParams = [];
        let conditions = [];

        if (filters.keyword) {
            conditions.push('(donations.title LIKE ? OR donations.description LIKE ?)');
            queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
        }
        if (filters.category) {
            conditions.push('donations.category = ?');
            queryParams.push(filters.category);
        }
        if (filters.status) {
            conditions.push('donations.status = ?');
            queryParams.push(filters.status);
        } else if (filters.exclude_status) {
            conditions.push('donations.status != ?');
            queryParams.push(filters.exclude_status);
        }
        if (filters.donation_type) {
            conditions.push('donations.donation_type = ?');
            queryParams.push(filters.donation_type);
        }
        if (filters.user_id) {
            conditions.push('donations.user_id = ?');
            queryParams.push(filters.user_id);
        }
        if (filters.exclude_user_id) {
            conditions.push('donations.user_id != ? AND (donations.donor_id IS NULL OR donations.donor_id != ?) AND (donations.requester_id IS NULL OR donations.requester_id != ?)');
            queryParams.push(filters.exclude_user_id, filters.exclude_user_id, filters.exclude_user_id);
        }
        if (filters.donor_id) {
            conditions.push('donations.donor_id = ?');
            queryParams.push(filters.donor_id);
        }
        if (filters.requester_id) {
            conditions.push('donations.requester_id = ?');
            queryParams.push(filters.requester_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        if (filters.sort === 'oldest') {
            query += ' ORDER BY donations.created_at ASC';
        } else {
            query += ' ORDER BY donations.created_at DESC';
        }

        if (filters.limit) {
            query += ' LIMIT ?';
            queryParams.push(parseInt(filters.limit, 10));
        }

        const [rows] = await db.query(query, queryParams);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT donations.*, 
                   users.username, users.full_name, 
                   req_users.username as requester_username, req_users.full_name as requester_full_name,
                   donor_users.username as donor_username, donor_users.full_name as donor_full_name
            FROM donations 
            JOIN users ON donations.user_id = users.id 
            LEFT JOIN users req_users ON donations.requester_id = req_users.id 
            LEFT JOIN users donor_users ON donations.donor_id = donor_users.id
            WHERE donations.id = ?
        `, [id]);
        return rows[0];
    }

    static async updateStatus(id, status) {
        const [result] = await db.execute('UPDATE donations SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows;
    }

    static async setRequester(id, requester_id) {
        const [result] = await db.execute('UPDATE donations SET status = ?, requester_id = ? WHERE id = ?', ['Requested', requester_id, id]);
        return result.affectedRows;
    }

    static async setDonor(id, donor_id) {
        const [result] = await db.execute('UPDATE donations SET status = ?, donor_id = ? WHERE id = ?', ['Requested', donor_id, id]);
        return result.affectedRows;
    }
}

module.exports = Donation;
