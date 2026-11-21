const Room = require('../models/Room');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

const createRoom = async (req, res) => {
  try {
    const { title, duration } = req.body;

    const teacher = await User.findById(req.user._id);

    const room = await Room.create({
      title,
      teacher: req.user._id,
      duration: duration || 60,
      roomSettings: teacher?.defaultSettings || {},
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

    let attendance = await Attendance.findOne({ room: room._id, student: req.user._id });
    if (!attendance) {
      attendance = await Attendance.create({
        room: room._id,
        student: req.user._id,
        joinTime: new Date(),
        totalClassTime: room.duration
      });
    }

    if (!room.isActive) {
      return res.json({ room, attendance, live: false, message: 'Class has not started yet. Classroom opened.' });
    }

    res.json({ room, attendance, live: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRooms = async (req, res) => {
  try {
    const archived = req.query.archived === 'true';
    const rooms = await Room.find({ teacher: req.user._id, archived })
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('teacher', 'name email');
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher._id.toString() !== req.user._id.toString()) {
      const Attendance = require('../models/Attendance');
      const enrolled = await Attendance.findOne({ room: req.params.id, student: req.user._id });
      if (!enrolled) return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title, subject, section } = req.body;
    if (title !== undefined) room.title = title;
    if (subject !== undefined) room.subject = subject;
    if (section !== undefined) room.section = section;
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const archiveRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    room.archived = true;
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    room.archived = false;
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Classroom deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRoom, startRoom, endRoom, joinRoom, getRooms, getRoomById, updateRoom, archiveRoom, restoreRoom, deleteRoom };