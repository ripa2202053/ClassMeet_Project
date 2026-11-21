const express = require('express');
const router = express.Router();
const {
  createRoom,
  startRoom,
  endRoom,
  joinRoom,
  getRooms,
  getRoomById,
  updateRoom,
  archiveRoom,
  restoreRoom,
  deleteRoom
} = require('../controllers/roomController');
const { protect, teacherOnly } = require('../middleware/authMiddleware');

router.post('/create', protect, teacherOnly, createRoom);
router.put('/start/:id', protect, teacherOnly, startRoom);
router.put('/end/:id', protect, teacherOnly, endRoom);
router.post('/join', protect, joinRoom);
router.get('/my-rooms', protect, teacherOnly, getRooms);
router.get('/:id', protect, getRoomById);
router.put('/:id', protect, teacherOnly, updateRoom);
router.put('/:id/archive', protect, teacherOnly, archiveRoom);
router.put('/:id/restore', protect, teacherOnly, restoreRoom);
router.delete('/:id', protect, teacherOnly, deleteRoom);

module.exports = router;