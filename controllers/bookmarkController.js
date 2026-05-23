const Bookmark = require('../models/Bookmark');

exports.addBookmark = async (req, res) => {
    try {
        const { item_type, item_id } = req.body;
        await Bookmark.create(req.user.id, item_type, item_id);
        
        // redirect back
        res.redirect('back');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.removeBookmark = async (req, res) => {
    try {
        const { item_type, item_id } = req.body;
        await Bookmark.delete(req.user.id, item_type, item_id);
        
        // redirect back
        res.redirect('back');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getBookmarks = async (req, res) => {
    try {
        const bookmarks = await Bookmark.findByUser(req.user.id);
        res.render('bookmarks/index', { bookmarks });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
