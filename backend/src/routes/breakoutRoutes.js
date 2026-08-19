const express = require('express');
const router = express.Router();
const {
  createBreakoutRooms,
  getBreakoutRooms,
  endBreakoutRooms,
  getMyBreakoutRoom
} = require('../controllers/breakoutController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.post('/create', protect, teacherOnly, createBreakoutRooms);
router.get('/room/:mainRoomId', protect, teacherOnly, getBreakoutRooms);
router.put('/end/:mainRoomId', protect, teacherOnly, endBreakoutRooms);
router.get('/my-room/:mainRoomId', protect, getMyBreakoutRoom);

module.exports = router;