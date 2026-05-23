const Donation = require('../models/Donation');
const Notification = require('../models/Notification');

exports.getIndex = async (req, res) => {
    try {
        const filters = {
            keyword: req.query.keyword,
            category: req.query.category,
            status: req.query.status,
            sort: req.query.sort
        };
        
        // Prevent public users from querying completed/donated items directly via status filter
        if (filters.status === 'Donated') {
            filters.status = '';
        }

        // Fetch separate lists for Offers vs Requests, excluding completed (Donated) items
        const offers = await Donation.findAll({ ...filters, exclude_status: 'Donated', donation_type: 'offer' });
        const requests = await Donation.findAll({ ...filters, exclude_status: 'Donated', donation_type: 'request' });

        let savedDonationIds = [];
        if (req.user) {
            const Bookmark = require('../models/Bookmark');
            const bookmarkDonations = await Bookmark.findByUser(req.user.id, 'Donation');
            savedDonationIds = bookmarkDonations.map(b => b.item_id);
        }

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_donationGrid', { donations: [...offers, ...requests], savedDonationIds });
        }
        res.render('donations/index', { offers, requests, filters, savedDonationIds });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getNew = (req, res) => {
    res.render('donations/new', { error: null, item: {} });
};

exports.postNew = async (req, res) => {
    try {
        const { title, description, contact_info, category, donation_type } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        const type = donation_type || 'offer';

        // Contact Info Validation
        const contact = contact_info ? contact_info.trim() : '';
        const isDigitsOnly = /^\d+$/.test(contact);
        let errorMsg = null;
        
        if (isDigitsOnly) {
            if (contact.length !== 10) {
                errorMsg = 'Contact number must be exactly 10 digits.';
            }
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contact)) {
                errorMsg = 'Please provide a valid 10-digit contact number or a valid email address.';
            }
        }

        if (errorMsg) {
            return res.render('donations/new', {
                error: errorMsg,
                item: { title, description, contact_info, category, donation_type }
            });
        }

        await Donation.create(req.user.id, title, description, image_url, contact, category, type);

        // Log user activity
        const UserActivity = require('../models/UserActivity');
        const actDesc = type === 'request' ? `Requested item: "${title}"` : `Offered to donate: "${title}"`;
        await UserActivity.create(req.user.id, type === 'request' ? 'POST_REQUEST' : 'POST_OFFER', actDesc);

        // Send email
        const { sendEmail } = require('../config/mailer');
        const mailSub = type === 'request' ? `[CampusConnect] Material Request Listed: "${title}"` : `[CampusConnect] Donation Offer Listed: "${title}"`;
        const mailBodyText = type === 'request' 
            ? `Hello ${req.user.full_name || req.user.username},\n\nYour material request for "${title}" has been successfully posted. We will notify you when a student offers to fulfill it!\n\nBest regards,\nCampusConnect Team`
            : `Hello ${req.user.full_name || req.user.username},\n\nYour donation offer for "${title}" has been successfully listed. Thank you for helping your fellow students!\n\nBest regards,\nCampusConnect Team`;
        
        sendEmail({
            to: req.user.email,
            subject: mailSub,
            text: mailBodyText,
            html: `<h3>Hello ${req.user.full_name || req.user.username},</h3><p>${mailBodyText.split('\n\n')[1]}</p><p>Best regards,<br>CampusConnect Team</p>`
        });

        res.redirect('/donations');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.requestItem = async (req, res) => {
    try {
        const item = await Donation.findById(req.params.id);
        if (!item || item.status !== 'Available') return res.status(400).send('Item not available for request');

        if (item.user_id === req.user.id) {
            return res.status(403).send('Creators cannot request their own items');
        }

        await Donation.setRequester(req.params.id, req.user.id);

        // Notify owner
        await Notification.create(item.user_id, `${req.user.username} has requested your donation "${item.title}".`, `/donations`);
        const io = req.app.get('socketio');
        io.to(`user-${item.user_id}`).emit('notification', { message: `${req.user.username} has requested your donation "${item.title}".` });

        // Log activity for requester
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'REQUEST_DONATION', `Requested donation item "${item.title}" from @${item.username}`);

        // Send email to owner (donor)
        const { sendEmail } = require('../config/mailer');
        const User = require('../models/User');
        const donorUser = await User.findById(item.user_id);
        if (donorUser) {
            sendEmail({
                to: donorUser.email,
                subject: `[CampusConnect] Donation Requested: "${item.title}"`,
                text: `Hello ${donorUser.full_name || donorUser.username},\n\nStudent @${req.user.username} (${req.user.full_name || ''}) has requested your donation item "${item.title}".\n\nPlease coordinate with them via the details listed. Thank you for your generosity!\n\nBest regards,\nCampusConnect Team`,
                html: `<h3>Hello ${donorUser.full_name || donorUser.username},</h3>
                       <p>Student <strong>@${req.user.username}</strong> has requested your donation item <strong>"${item.title}"</strong>.</p>
                       <p>Please coordinate with them via the details listed.</p>
                       <p>Best regards,<br>CampusConnect Team</p>`
            });
        }

        // Send email to requester (recipient)
        sendEmail({
            to: req.user.email,
            subject: `[CampusConnect] Donation Requested: "${item.title}"`,
            text: `Hello ${req.user.full_name || req.user.username},\n\nYou have successfully requested the donation item "${item.title}" from @${item.username}.\n\nContact Details: ${item.contact_info}\n\nBest regards,\nCampusConnect Team`,
            html: `<h3>Hello ${req.user.full_name || req.user.username},</h3>
                   <p>You have successfully requested the donation item <strong>"${item.title}"</strong> from @${item.username}.</p>
                   <p><strong>Donor Contact Details:</strong> ${item.contact_info}</p>
                   <p>Best regards,<br>CampusConnect Team</p>`
        });

        res.redirect('/donations');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.fulfillRequest = async (req, res) => {
    try {
        const item = await Donation.findById(req.params.id);
        if (!item || item.donation_type !== 'request' || item.status !== 'Available') {
            return res.status(400).send('Request item not available for donation');
        }

        if (item.user_id === req.user.id) {
            return res.status(403).send('You cannot fulfill your own requested item');
        }

        await Donation.setDonor(req.params.id, req.user.id);

        // Notify requester (post creator)
        const notifyMsg = `${req.user.username} has offered to donate "${item.title}" for your request!`;
        await Notification.create(item.user_id, notifyMsg, `/donations`);
        
        const io = req.app.get('socketio');
        io.to(`user-${item.user_id}`).emit('notification', { message: notifyMsg });

        // Log activity for donor
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'FULFILL_REQUEST', `Offered to fulfill demand request "${item.title}" for @${item.username}`);

        // Send email to requester (recipient)
        const { sendEmail } = require('../config/mailer');
        const User = require('../models/User');
        const requesterUser = await User.findById(item.user_id);
        if (requesterUser) {
            sendEmail({
                to: requesterUser.email,
                subject: `[CampusConnect] Request Fulfill Offered: "${item.title}"`,
                text: `Hello ${requesterUser.full_name || requesterUser.username},\n\nStudent @${req.user.username} has offered to fulfill your request for "${item.title}"!\n\nPlease reach out to coordinate the exchange.\n\nBest regards,\nCampusConnect Team`,
                html: `<h3>Hello ${requesterUser.full_name || requesterUser.username},</h3>
                       <p>Student <strong>@${req.user.username}</strong> has offered to fulfill your request for <strong>"${item.title}"</strong>!</p>
                       <p>Please reach out to coordinate the exchange.</p>
                       <p>Best regards,<br>CampusConnect Team</p>`
            });
        }

        // Send email to donor
        sendEmail({
            to: req.user.email,
            subject: `[CampusConnect] Offered to Fulfill Request: "${item.title}"`,
            text: `Hello ${req.user.full_name || req.user.username},\n\nYou have offered to fulfill the request for "${item.title}" posted by @${item.username}.\n\nRequester Contact Info: ${item.contact_info}\n\nBest regards,\nCampusConnect Team`,
            html: `<h3>Hello ${req.user.full_name || req.user.username},</h3>
                   <p>You have offered to fulfill the request for <strong>"${item.title}"</strong> posted by @${item.username}.</p>
                   <p><strong>Requester Contact Info:</strong> ${item.contact_info}</p>
                   <p>Best regards,<br>CampusConnect Team</p>`
        });

        res.redirect('/donations');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.confirmDonation = async (req, res) => {
    try {
        const item = await Donation.findById(req.params.id);
        if (!item || item.status !== 'Requested') return res.status(400).send('Invalid confirmation request');

        let isAuthorized = false;
        let recipientId = null;
        let donorId = null;

        if (item.donation_type === 'request') {
            recipientId = item.user_id;
            donorId = item.donor_id;
            if (req.user.id === recipientId || req.user.id === donorId || req.user.role === 'admin') {
                isAuthorized = true;
            }
        } else {
            donorId = item.user_id;
            recipientId = item.requester_id;
            if (req.user.id === donorId || req.user.id === recipientId || req.user.role === 'admin') {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).send('Unauthorized');
        }

        await Donation.updateStatus(req.params.id, 'Donated');

        // Notify the other party
        const io = req.app.get('socketio');
        const notifierId = req.user.id;
        const targetNotifyId = (notifierId === donorId) ? recipientId : donorId;

        let notifyMsg = "";
        if (notifierId === donorId) {
            notifyMsg = `The donation handover for "${item.title}" has been confirmed by the donor!`;
        } else {
            notifyMsg = `The donation handover for "${item.title}" has been confirmed by the recipient!`;
        }

        if (targetNotifyId) {
            await Notification.create(targetNotifyId, notifyMsg, `/donations`);
            io.to(`user-${targetNotifyId}`).emit('notification', { message: notifyMsg });
        }

        // Send Email and Log Activity for both donor and recipient
        const User = require('../models/User');
        const UserActivity = require('../models/UserActivity');
        const { sendEmail } = require('../config/mailer');

        const donorUser = await User.findById(donorId);
        const recipientUser = await User.findById(recipientId);

        if (donorUser) {
            sendEmail({
                to: donorUser.email,
                subject: `[CampusConnect] Donation Handover Completed: "${item.title}"`,
                text: `Hello ${donorUser.full_name || donorUser.username},\n\nThe handover for "${item.title}" has been successfully completed and confirmed!\n\nYou donated this item to: @${recipientUser ? recipientUser.username : 'another student'}.\n\nThank you for your generosity!\n\nBest regards,\nCampusConnect Team`,
                html: `<h3>Hello ${donorUser.full_name || donorUser.username},</h3>
                       <p>The handover for the item <strong>"${item.title}"</strong> has been successfully completed and confirmed!</p>
                       <p>You donated this item to: <strong>@${recipientUser ? recipientUser.username : 'another student'}</strong>.</p>
                       <p>Thank you for your generosity!</p>
                       <p>Best regards,<br>CampusConnect Team</p>`
            });
            await UserActivity.create(donorUser.id, 'DONATE_ITEM_SUCCESS', `Successfully donated "${item.title}" to @${recipientUser ? recipientUser.username : 'N/A'}`);
        }

        if (recipientUser) {
            sendEmail({
                to: recipientUser.email,
                subject: `[CampusConnect] Donation Handover Completed: "${item.title}"`,
                text: `Hello ${recipientUser.full_name || recipientUser.username},\n\nThe handover for "${item.title}" has been successfully completed and confirmed!\n\nYou received this item from: @${donorUser ? donorUser.username : 'another student'}.\n\nBest regards,\nCampusConnect Team`,
                html: `<h3>Hello ${recipientUser.full_name || recipientUser.username},</h3>
                       <p>The handover for the item <strong>"${item.title}"</strong> has been successfully completed and confirmed!</p>
                       <p>You received this item from: <strong>@${donorUser ? donorUser.username : 'another student'}</strong>.</p>
                       <p>Best regards,<br>CampusConnect Team</p>`
            });
            await UserActivity.create(recipientUser.id, 'RECEIVE_ITEM_SUCCESS', `Successfully received item "${item.title}" from @${donorUser ? donorUser.username : 'N/A'}`);
        }

        res.redirect('/donations');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
