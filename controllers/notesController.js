const Note = require('../models/Note');

exports.getIndex = async (req, res) => {
    try {
        const Department = require('../models/Department');
        const Bookmark = require('../models/Bookmark');
        
        const departments = await Department.findAll();
        
        const selectedDeptId = req.query.department ? parseInt(req.query.department, 10) : null;
        const selectedYear = req.query.year ? parseInt(req.query.year, 10) : null;
        const selectedSemester = req.query.semester ? parseInt(req.query.semester, 10) : null;
        
        let selectedDept = null;
        if (selectedDeptId) {
            selectedDept = await Department.findById(selectedDeptId);
        }

        let semesterSubjects = [];
        if (selectedDeptId && selectedSemester) {
            const Subject = require('../models/Subject');
            semesterSubjects = await Subject.findByDepartmentAndSemester(selectedDeptId, selectedSemester);
        }
        
        const filters = {
            keyword: req.query.keyword,
            sort: req.query.sort,
            department_id: selectedDeptId,
            semester: selectedSemester,
            current_user_id: req.user ? req.user.id : null
        };
        
        const notes = await Note.findAll(filters);
        
        // Group notes by subject
        let groupedNotes = {};
        notes.forEach(note => {
            const subj = note.subject || 'General';
            if (!groupedNotes[subj]) {
                groupedNotes[subj] = [];
            }
            groupedNotes[subj].push(note);
        });
        
        let savedNoteIds = [];
        if (req.user) {
            const userBookmarks = await Bookmark.findByUser(req.user.id, 'Note');
            savedNoteIds = userBookmarks.map(b => b.item_id);
        }

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_noteGrid', { notes, savedNoteIds });
        }
        
        res.render('notes/index', { 
            notes, 
            departments, 
            selectedDept, 
            selectedYear, 
            selectedSemester, 
            groupedNotes, 
            savedNoteIds,
            filters,
            semesterSubjects
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.downloadNote = async (req, res) => {
    try {
        await Note.incrementDownload(req.params.id);
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).send('Not Found');
        res.redirect(note.file_url);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getNew = async (req, res) => {
    try {
        const Department = require('../models/Department');
        const departments = await Department.findAll();
        res.render('notes/new', { departments });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postNew = async (req, res) => {
    try {
        const { title, description, subject_id, semester, branch, department_id, note_type, link_url } = req.body;
        
        let file_url = null;
        if (note_type === 'link') {
            file_url = link_url;
            if (!file_url) return res.status(400).send('Link URL is required');
        } else {
            file_url = req.file ? `/uploads/${req.file.filename}` : null;
            if (!file_url) return res.status(400).send('File is required');
        }

        // Fetch subject name from subject_id
        const Subject = require('../models/Subject');
        const subjectObj = await Subject.findById(subject_id);
        const subjectName = subjectObj ? subjectObj.name : 'Unknown';

        const Note = require('../models/Note');
        await Note.create(req.user.id, title, description, file_url, subjectName, semester, branch, department_id, note_type, subject_id);
        
        // Log user activity
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'UPLOAD_NOTE', `Uploaded study notes: "${title}" for subject "${subjectName}"`);

        // Send email notification
        const { sendEmail } = require('../config/mailer');
        sendEmail({
            to: req.user.email,
            subject: `[CampusConnect] Study Notes Uploaded (Pending Approval): "${title}"`,
            text: `Hello ${req.user.full_name || req.user.username},\n\nYou have successfully uploaded your study notes: "${title}" under the subject "${subjectName}" on CampusConnect.\n\nPlease note: Your notes will be visible to other students once they are reviewed and approved by the administrator.\n\nThank you for contributing to our community!\n\nBest regards,\nCampusConnect Team`,
            html: `<h3>Hello ${req.user.full_name || req.user.username},</h3>
                   <p>You have successfully uploaded your study notes: <strong>"${title}"</strong> under the subject <strong>"${subjectName}"</strong> on CampusConnect.</p>
                   <p><strong>Please note:</strong> Your notes will be visible to other students once they are reviewed and approved by the administrator.</p>
                   <p>Thank you for contributing to our community!</p>
                   <p>Best regards,<br>CampusConnect Team</p>`
        }).catch(err => console.error("Error sending note upload email:", err));

        res.redirect('/notes');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.apiGetSubjects = async (req, res) => {
    try {
        const { department_id, semester } = req.query;
        if (!department_id || !semester) {
            return res.status(400).json({ error: 'Missing parameters' });
        }
        const Subject = require('../models/Subject');
        const subjects = await Subject.findByDepartmentAndSemester(department_id, semester);
        res.json(subjects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.apiGetNotes = async (req, res) => {
    try {
        const { subject_id } = req.query;
        if (!subject_id) {
            return res.status(400).json({ error: 'Missing subject_id' });
        }
        const notes = await Note.findAll({ subject_id, is_approved: 'all' });
        res.json(notes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};
