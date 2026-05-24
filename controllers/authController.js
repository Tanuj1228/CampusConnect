const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LostFound = require('../models/LostFound');
const Donation = require('../models/Donation');
const Complaint = require('../models/Complaint');

exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
};

exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.render('login', { error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password.' });
        }

        if (user.status === 'Suspended') {
            return res.render('login', { error: 'Your account has been temporarily suspended. Please contact support.' });
        }

        if (user.status === 'Banned') {
            return res.render('login', { error: 'Your account has been permanently banned from CampusConnect.' });
        }

        await User.updateLastLogin(user.id);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'An error occurred during login.' });
    }
};

exports.getRegister = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('register', { error: null });
};

exports.postRegister = async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;
        
        const domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase();
        if (domain !== 'chitkara.edu.in' && domain !== 'chitkarauniversity.edu.in') {
            return res.render('register', { error: 'Registration restricted. Only college emails (e.g. @chitkara.edu.in) are allowed.' });
        }
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.render('register', { error: 'Email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create(username, email, hashedPassword, full_name);

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('register', { error: 'An error occurred during registration.' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const stats = await User.getUserStats(req.user.id);
        
        // Activity Log
        const UserActivity = require('../models/UserActivity');
        const myActivities = await UserActivity.findByUser(req.user.id, 50);
        
        // Lost & Found Lists
        const myLostFound = await LostFound.findAll({ user_id: req.user.id, is_approved: 'all' });
        const myReturnedItems = await LostFound.findAll({ returned_by_id: req.user.id, is_approved: 'all' });
        const myRecoveredItems = await LostFound.findAll({ received_by_id: req.user.id, is_approved: 'all' });

        // Donations Lists
        const myOffers = await Donation.findAll({ user_id: req.user.id, donation_type: 'offer' });
        const myRequests = await Donation.findAll({ user_id: req.user.id, donation_type: 'request' });

        // Combined Given / Received Donations
        const givenOffers = await Donation.findAll({ user_id: req.user.id, donation_type: 'offer', status: 'Donated' });
        const givenRequests = await Donation.findAll({ donor_id: req.user.id, status: 'Donated' });
        const myDonationsGiven = [...givenOffers, ...givenRequests];

        const receivedOffers = await Donation.findAll({ requester_id: req.user.id, status: 'Donated' });
        const receivedRequests = await Donation.findAll({ user_id: req.user.id, donation_type: 'request', status: 'Donated' });
        const myDonationsReceived = [...receivedOffers, ...receivedRequests];

        // Complaints
        const myComplaints = await Complaint.findByUser(req.user.id);

        // Bookmarks
        const Bookmark = require('../models/Bookmark');
        const savedNotes = await Bookmark.findSavedNotesByUser(req.user.id);
        const savedDonations = await Bookmark.findSavedDonationsByUser(req.user.id);
        const savedLostFound = await Bookmark.findSavedLostFoundsByUser(req.user.id);
        const savedComplaints = await Bookmark.findSavedComplaintsByUser(req.user.id);

        res.render('profile', { 
            profileUser: user, 
            stats, 
            myActivities,
            myLostFound, 
            myReturnedItems,
            myRecoveredItems,
            myOffers,
            myRequests,
            myDonationsGiven,
            myDonationsReceived,
            myComplaints, 
            savedNotes,
            savedDonations,
            savedLostFound,
            savedComplaints,
            error: null, 
            success: null 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.render('edit-profile', { profileUser: user, error: null, success: null });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postEditProfile = async (req, res) => {
    try {
        const { full_name } = req.body;
        const updateData = {};
        
        if (full_name) updateData.full_name = full_name;
        if (req.file) updateData.profile_picture = '/uploads/' + req.file.filename;

        await User.updateProfile(req.user.id, updateData);
        
        const user = await User.findById(req.user.id);
        res.render('edit-profile', { profileUser: user, success: 'Profile updated successfully!', error: null });
    } catch (error) {
        console.error(error);
        const user = await User.findById(req.user.id);
        res.render('edit-profile', { profileUser: user, error: 'Failed to update profile.', success: null });
    }
};

exports.postFirebaseLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ success: false, error: 'Firebase ID token is missing.' });
        }

        const projectId = process.env.FIREBASE_PROJECT_ID;
        if (!projectId) {
            return res.status(500).json({ success: false, error: 'Firebase Project ID is not configured on the server.' });
        }

        // Fetch Google's public certificates dynamically
        const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
        const publicKeys = await response.json();
        
        // Decode header to retrieve key ID (kid)
        const decoded = jwt.decode(idToken, { complete: true });
        if (!decoded || !decoded.header || !decoded.header.kid) {
            return res.status(400).json({ success: false, error: 'Invalid token structure.' });
        }
        
        const cert = publicKeys[decoded.header.kid];
        if (!cert) {
            return res.status(400).json({ success: false, error: 'Invalid token signature kid.' });
        }
        
        // Verify signature and claims using the certificate
        let firebaseUser;
        try {
            firebaseUser = jwt.verify(idToken, cert, {
                algorithms: ['RS256'],
                audience: projectId,
                issuer: `https://securetoken.google.com/${projectId}`
            });
        } catch (verifyErr) {
            console.error('Firebase token verification failed:', verifyErr.message);
            return res.status(401).json({ success: false, error: 'Authentication failed: ' + verifyErr.message });
        }

        const email = firebaseUser.email;
        const domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase();
        if (domain !== 'chitkara.edu.in' && domain !== 'chitkarauniversity.edu.in') {
            return res.status(403).json({ success: false, error: 'Authentication restricted. Only college emails (e.g. @chitkara.edu.in) are allowed.' });
        }

        const name = firebaseUser.name || '';
        
        // Find or create the user in the local database
        let user = await User.findByEmail(email);
        if (!user) {
            // Register a new user automatically
            // Derive a unique username from email
            const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const username = `${emailPrefix}_${randomSuffix}`;
            
            // Set dummy password hash to prevent standard credentials login
            const dummyPasswordHash = await bcrypt.hash('firebase_google_auth_placeholder_' + Math.random(), 10);
            
            const newUserId = await User.create(username, email, dummyPasswordHash, name);
            user = await User.findById(newUserId);
        }

        if (user.status === 'Suspended') {
            return res.status(403).json({ success: false, error: 'Your account has been temporarily suspended. Please contact support.' });
        }

        if (user.status === 'Banned') {
            return res.status(403).json({ success: false, error: 'Your account has been permanently banned from CampusConnect.' });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Sign local application JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.json({ success: true, redirect: '/' });
    } catch (error) {
        console.error('Error in postFirebaseLogin:', error);
        return res.status(500).json({ success: false, error: 'An error occurred during Google authentication.' });
    }
};
