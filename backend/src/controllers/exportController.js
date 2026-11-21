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
      { header: 'Student Name', key: 'name', width: 22 },
      { header: 'Student ID', key: 'id', width: 16 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Attendance %', key: 'attendancePercent', width: 14 },
      { header: 'Flagged Activities', key: 'flagged', width: 16 },
      { header: 'Camera Off Events', key: 'cameraOff', width: 16 },
      { header: 'Mute / Tab Events', key: 'muteTab', width: 16 },
      { header: 'Chat Messages', key: 'chat', width: 14 },
      { header: 'Reactions', key: 'reactions', width: 12 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0D1B2A' }
    };

    attendances.forEach((att) => {
      const attendancePercent = att.totalClassTime > 0
        ? ((att.faceDetectedTime / (att.totalClassTime * 60)) * 100).toFixed(1)
        : 0;
      const isPresent = attendancePercent >= 75;

      worksheet.addRow({
        name: att.student?.name || 'Unknown',
        id: att.student?._id ? String(att.student._id) : (att.student?.email || '-'),
        present: isPresent ? 'Yes' : 'No',
        absent: isPresent ? 'No' : 'Yes',
        attendancePercent: `${attendancePercent}%`,
        flagged: att.isSuspicious ? 1 : 0,
        cameraOff: att.cameraOffCount || 0,
        muteTab: att.muteCount || 0,
        chat: att.chatCount || 0,
        reactions: att.reactCount || 0,
      });
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

const exportAttendancePdf = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).populate('teacher', 'name email');
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const attendances = await Attendance.find({ room: roomId }).populate('student', 'name email');

    if (!attendances || attendances.length === 0) {
      return res.status(404).json({ message: 'No attendance records available for this class.' });
    }

    const escape = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    let content = '';
    const push = (str) => { content += str + '\n'; };

    push('BT');
    push('/F1 18 Tf');
    push('50 760 Td');
    push(`(${escape('ClassMeet Attendance Report')}) Tj`);
    push('0 -24 Td');
    push('/F1 12 Tf');
    push(`(${escape('Class: ' + (room.title || ''))}) Tj`);
    push('0 -16 Td');
    push(`(${escape('Export Date: ' + new Date().toLocaleString())}) Tj`);
    push('0 -16 Td');
    const presentCount = attendances.filter(a => a.isPresent).length;
    const absentCount = attendances.length - presentCount;
    push(`(${escape('Total: ' + attendances.length + '  Present: ' + presentCount + '  Absent: ' + absentCount)}) Tj`);
    push('0 -24 Td');

    // Table header
    push('/F1 11 Tf');
    push(`(Student Name) Tj`);
    // We'll position columns manually using Td offsets
    push('ET');

    // Draw table rows with simple text positioning
    let y = 680;
    const rowHeight = 16;
    const colX = [50, 260, 420, 500];

    const drawText = (x, yy, text, size = 10) => {
      return `BT /F1 ${size} Tf ${x} ${yy} Td (${escape(text)}) Tj ET`;
    };

    // Header row
    content += drawText(colX[0], y, 'Student Name', 11) + '\n';
    content += drawText(colX[1], y, 'Student ID', 11) + '\n';
    content += drawText(colX[2], y, 'Present', 11) + '\n';
    content += drawText(colX[3], y, 'Absent', 11) + '\n';
    y -= rowHeight;

    attendances.forEach((att) => {
      const name = att.student?.name || 'Unknown';
      const id = att.student?._id ? String(att.student._id).slice(-8) : (att.student?.email || '-');
      const present = att.isPresent ? 'Yes' : 'No';
      const absent = att.isPresent ? 'No' : 'Yes';
      content += drawText(colX[0], y, name, 10) + '\n';
      content += drawText(colX[1], y, id, 10) + '\n';
      content += drawText(colX[2], y, present, 10) + '\n';
      content += drawText(colX[3], y, absent, 10) + '\n';
      y -= rowHeight;
      if (y < 60) { y = 60; } // stop
    });

    const stream = content;
    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
4 0 obj
<< /Length ${Buffer.byteLength(stream, 'utf8')} >>
stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 65535 f 
0000000058 65535 f 
0000000115 65535 f 
0000000266 65535 f 
0000000340 65535 f 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + Buffer.byteLength(stream, 'utf8')}
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${(room.title || 'Class').replace(/\\s+/g, '_')}_Attendance_Report.pdf`);
    res.send(Buffer.from(pdf, 'utf8'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { exportAttendance, exportAttendancePdf };