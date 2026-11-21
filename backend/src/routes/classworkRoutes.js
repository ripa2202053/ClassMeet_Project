const express = require('express');
const router = express.Router();
const { getItems, createItem, updateItem, deleteItem, addSubmissionMarks, submitItem } = require('../controllers/classworkController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.get('/:classroomId', protect, teacherOnly, getItems);
router.post('/', protect, teacherOnly, createItem);
router.put('/:id', protect, teacherOnly, updateItem);
router.delete('/:id', protect, teacherOnly, deleteItem);
router.post('/:id/submissions', protect, teacherOnly, addSubmissionMarks);
router.post('/:id/submit', protect, submitItem);

module.exports = router;