const express = require('express');
const router = express.Router();
const { exportAttendance, exportAttendancePdf } = require('../controllers/exportController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.get('/attendance/:roomId', protect, teacherOnly, exportAttendance);
router.get('/attendance-pdf/:roomId', protect, teacherOnly, exportAttendancePdf);

module.exports = router;