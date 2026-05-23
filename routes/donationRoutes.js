const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', isAuthenticated, donationController.getIndex);
router.get('/new', isAuthenticated, donationController.getNew);
router.post('/', isAuthenticated, upload.single('image'), donationController.postNew);
router.post('/:id/request', isAuthenticated, donationController.requestItem);
router.post('/:id/fulfill', isAuthenticated, donationController.fulfillRequest);
router.post('/:id/confirm', isAuthenticated, donationController.confirmDonation);

module.exports = router;
