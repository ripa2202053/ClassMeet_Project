const Room = require('../models/Room');
const Attendance = require('../models/Attendance');

const createRoom = async (req, res) => {
  try {
    const { title, duration } = req.body;

    const room = await Room.create({
      title,
      teacher: req.user._id,
      duration: duration || 60
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    room.isActive = true;
    room.startTime = new Date();
    await room.save();

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.isActive = false;
    room.endTime = new Date();
    await room.save();

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(400).json({ message: 'Class has not started yet' });
    }

    const attendance = await Attendance.create({
      room: room._id,
      student: req.user._id,
      joinTime: new Date(),
      totalClassTime: room.duration
    });

    res.json({ room, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ teacher: req.user._id })
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRoom, startRoom, endRoom, joinRoom, getRooms };