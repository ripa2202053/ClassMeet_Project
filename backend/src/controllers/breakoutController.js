const BreakoutRoom = require('../models/BreakoutRoom');
const Attendance = require('../models/Attendance');

const createBreakoutRooms = async (req, res) => {
  try {
    const { mainRoomId, groupCount, duration } = req.body;

    const attendances = await Attendance.find({ room: mainRoomId })
      .populate('student', 'name email');

    const students = attendances.map(att => att.student);

    if (students.length === 0) {
      return res.status(400).json({ message: 'No students in the class' });
    }

    const shuffled = students.sort(() => Math.random() - 0.5);
    const groups = [];
    const groupSize = Math.ceil(shuffled.length / groupCount);

    for (let i = 0; i < groupCount; i++) {
      groups.push(shuffled.slice(i * groupSize, (i + 1) * groupSize));
    }

    await BreakoutRoom.deleteMany({ mainRoom: mainRoomId, isActive: true });

    const breakoutRooms = [];
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].length > 0) {
        const room = await BreakoutRoom.create({
          mainRoom: mainRoomId,
          name: `Group ${i + 1}`,
          participants: groups[i].map(s => s._id),
          duration: duration || 15,
          endTime: new Date(Date.now() + (duration || 15) * 60 * 1000)
        });
        breakoutRooms.push(room);
      }
    }

    const populatedRooms = await BreakoutRoom.find({
      mainRoom: mainRoomId,
      isActive: true
    }).populate('participants', 'name email');

    res.status(201).json(populatedRooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBreakoutRooms = async (req, res) => {
  try {
    const { mainRoomId } = req.params;
    const rooms = await BreakoutRoom.find({
      mainRoom: mainRoomId,
      isActive: true
    }).populate('participants', 'name email');
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endBreakoutRooms = async (req, res) => {
  try {
    const { mainRoomId } = req.params;
    await BreakoutRoom.updateMany(
      { mainRoom: mainRoomId },
      { isActive: false }
    );
    res.json({ message: 'All breakout rooms ended' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyBreakoutRoom = async (req, res) => {
  try {
    const { mainRoomId } = req.params;
    const room = await BreakoutRoom.findOne({
      mainRoom: mainRoomId,
      participants: req.user._id,
      isActive: true
    }).populate('participants', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'No breakout room assigned' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBreakoutRooms, getBreakoutRooms, endBreakoutRooms, getMyBreakoutRoom };