const express = require('express');
const router = express.Router();
const {
  createRoom,
  startRoom,
  endRoom,
  joinRoom,
  getRooms
} = require('../controllers/roomController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.post('/create', protect, teacherOnly, createRoom);
router.put('/start/:id', protect, teacherOnly, startRoom);
router.put('/end/:id', protect, teacherOnly, endRoom);
router.post('/join', protect, joinRoom);
router.get('/my-rooms', protect, teacherOnly, getRooms);

module.exports = router;