const Attendance = require('../models/Attendance');
const Room = require('../models/Room');
const ExcelJS = require('exceljs');

const exportAttendance = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).populate('teacher', 'name email');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const attendances = await Attendance.find({ room: roomId })
      .populate('student', 'name email');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    worksheet.columns = [
      { header: 'Student Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Join Time', key: 'joinTime', width: 20 },
      { header: 'Leave Time', key: 'leaveTime', width: 20 },
      { header: 'Face Time (min)', key: 'faceTime', width: 15 },
      { header: 'Attendance %', key: 'attendancePercent', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Mute Count', key: 'muteCount', width: 12 },
      { header: 'Chat Count', key: 'chatCount', width: 12 },
      { header: 'React Count', key: 'reactCount', width: 12 },
      { header: 'Camera Off Count', key: 'cameraOffCount', width: 18 },
      { header: 'Dominant Emotion', key: 'dominantEmotion', width: 18 },
      { header: 'Suspicious', key: 'suspicious', width: 12 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0D1B2A' }
    };

    attendances.forEach((att) => {
      const faceTimeMinutes = Math.floor(att.faceDetectedTime / 60);
      const attendancePercent = ((att.faceDetectedTime / (room.duration * 60)) * 100).toFixed(1);
      const isPresent = attendancePercent >= 75;

      const row = worksheet.addRow({
        name: att.student?.name || 'Unknown',
        email: att.student?.email || 'Unknown',
        joinTime: att.joinTime ? new Date(att.joinTime).toLocaleString() : '-',
        leaveTime: att.leaveTime ? new Date(att.leaveTime).toLocaleString() : '-',
        faceTime: faceTimeMinutes,
        attendancePercent: `${attendancePercent}%`,
        status: isPresent ? 'Present' : 'Absent',
        muteCount: att.muteCount || 0,
        chatCount: att.chatCount || 0,
        reactCount: att.reactCount || 0,
        cameraOffCount: att.cameraOffCount || 0,
        dominantEmotion: att.dominantEmotion || 'neutral',
        suspicious: att.isSuspicious ? 'Yes' : 'No',
      });

      row.getCell('status').font = {
        bold: true,
        color: { argb: isPresent ? '00FF88' : 'FF4444' }
      };
      row.getCell('suspicious').font = {
        bold: true,
        color: { argb: att.isSuspicious ? 'FF4444' : '00FF88' }
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${roomId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { exportAttendance };