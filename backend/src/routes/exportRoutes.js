const express = require('express');
const router = express.Router();
const { exportAttendance } = require('../controllers/exportController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.get('/attendance/:roomId', protect, teacherOnly, exportAttendance);

module.exports = router;