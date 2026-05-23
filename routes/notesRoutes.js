const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', isAuthenticated, notesController.getIndex);
router.get('/new', isAuthenticated, notesController.getNew);
router.post('/', isAuthenticated, upload.single('file'), notesController.postNew);
router.get('/download/:id', isAuthenticated, notesController.downloadNote);
router.get('/api/subjects', isAuthenticated, notesController.apiGetSubjects);
router.get('/api/notes', isAuthenticated, notesController.apiGetNotes);

module.exports = router;
