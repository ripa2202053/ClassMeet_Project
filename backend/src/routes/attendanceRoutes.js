const express = require('express');
const router = express.Router();
const {
  updateAttendance,
  leaveClass,
  finalizeAttendance,
  getRoomAttendance,
  getStudentAttendance,
  correctAttendance
} = require('../controllers/attendanceController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.post('/update', protect, updateAttendance);
router.post('/leave', protect, leaveClass);
router.post('/finalize', protect, teacherOnly, finalizeAttendance);
router.get('/room/:roomId', protect, teacherOnly, getRoomAttendance);
router.get('/my-attendance', protect, getStudentAttendance);
router.post('/correct', protect, teacherOnly, correctAttendance);

module.exports = router;
