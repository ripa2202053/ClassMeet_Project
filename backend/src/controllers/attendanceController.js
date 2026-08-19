const Attendance = require('../models/Attendance');
const Room = require('../models/Room');

const updateAttendance = async (req, res) => {
  try {
    const { roomId, faceDetectedTime, muteCount, chatCount, reactCount, cameraOffCount } = req.body;

    let attendance = await Attendance.findOne({
      room: roomId,
      student: req.user._id
    });

    if (!attendance) {
      attendance = await Attendance.create({
        room: roomId,
        student: req.user._id,
        joinTime: new Date(),
      });
    }

    const room = await Room.findById(roomId);
    const totalClassSeconds = room.duration * 60;
    const requiredFaceTime = totalClassSeconds * 0.75;
    const isPresent = faceDetectedTime >= requiredFaceTime;

    attendance.faceDetectedTime = faceDetectedTime;
    attendance.muteCount = muteCount || 0;
    attendance.chatCount = chatCount || 0;
    attendance.reactCount = reactCount || 0;
    attendance.cameraOffCount = cameraOffCount || 0;
    attendance.isPresent = isPresent;
    attendance.totalClassTime = room.duration;

    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const leaveClass = async (req, res) => {
  try {
    const { roomId } = req.body;

    const attendance = await Attendance.findOne({
      room: roomId,
      student: req.user._id
    });

    if (attendance) {
      attendance.leaveTime = new Date();
      await attendance.save();
    }

    res.json({ message: 'Left class successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FINALIZE ATTENDANCE: Called when teacher ends the class
// Accepts an array of student attendance snapshots from the server's
// in-memory tracker and upserts the final Attendance documents in MongoDB.
// ────────────────────────────────────────────────────────────────────────────
const finalizeAttendance = async (req, res) => {
  try {
    const { roomId, students } = req.body;

    if (!roomId || !Array.isArray(students)) {
      return res.status(400).json({ message: 'roomId and students array required' });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const results = [];

    for (const s of students) {
      if (!s.studentId) continue;

      let attendance = await Attendance.findOne({ room: roomId, student: s.studentId });

      if (!attendance) {
        attendance = await Attendance.create({
          room: roomId,
          student: s.studentId,
          joinTime: new Date(),
          totalClassTime: room.duration,
        });
      }

      attendance.faceDetectedTime = s.faceTime || 0;
      attendance.totalClassTime = room.duration;
      attendance.isPresent = s.isPresent || false;
      attendance.dominantEmotion = s.emotion || 'neutral';
      attendance.isSuspicious = s.isSuspicious || false;

      await attendance.save();
      results.push(attendance);
    }

    res.json({ message: 'Attendance finalized', saved: results.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRoomAttendance = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const attendances = await Attendance.find({ room: roomId })
      .populate('student', 'name email')
      .sort({ createdAt: -1 });

    const report = attendances.map((att) => {
      const facePercent = att.totalClassTime > 0
        ? ((att.faceDetectedTime / (att.totalClassTime * 60)) * 100).toFixed(1)
        : 0;

      return {
        _id: att._id,
        student: att.student,
        joinTime: att.joinTime,
        leaveTime: att.leaveTime,
        faceDetectedTime: att.faceDetectedTime,
        facePercent,
        isPresent: att.isPresent,
        muteCount: att.muteCount,
        chatCount: att.chatCount,
        reactCount: att.reactCount,
        cameraOffCount: att.cameraOffCount
      };
    });

    res.json({ room, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const attendances = await Attendance.find({ student: req.user._id })
      .populate('room', 'title duration roomCode')
      .sort({ createdAt: -1 });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateAttendance, leaveClass, finalizeAttendance, getRoomAttendance, getStudentAttendance };
