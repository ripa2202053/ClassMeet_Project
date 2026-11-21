const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  addComment
} = require('../controllers/announcementController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.get('/:classroomId', protect, teacherOnly, getAnnouncements);
router.post('/', protect, teacherOnly, createAnnouncement);
router.put('/:id', protect, teacherOnly, updateAnnouncement);
router.delete('/:id', protect, teacherOnly, deleteAnnouncement);
router.post('/:id/comments', protect, teacherOnly, addComment);

module.exports = router;