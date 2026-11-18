const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/teacherController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.get('/settings', protect, teacherOnly, getSettings);
router.put('/settings', protect, teacherOnly, updateSettings);

module.exports = router;