const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/auth/firebase-login', authController.postFirebaseLogin);

router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);

router.get('/logout', authController.logout);

router.get('/profile', isAuthenticated, authController.getProfile);
router.get('/profile/edit', isAuthenticated, authController.getEditProfile);
router.post('/profile/edit', isAuthenticated, upload.single('profile_picture'), authController.postEditProfile);

module.exports = router;
