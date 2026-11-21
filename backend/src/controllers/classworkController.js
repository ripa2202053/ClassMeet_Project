const ClassworkItem = require('../models/ClassworkItem');
const Room = require('../models/Room');

const getItems = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const room = await Room.findById(classroomId);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) {
      const Attendance = require('../models/Attendance');
      const enrolled = await Attendance.findOne({ room: classroomId, student: req.user._id });
      if (!enrolled) return res.status(403).json({ message: 'Not authorized' });
    }
    const items = await ClassworkItem.find({ classroom: classroomId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const createItem = async (req, res) => {
  try {
    const { classroomId, type, title, description, topic, dueDate, points, attachments } = req.body;
    const room = await Room.findById(classroomId);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    const item = await ClassworkItem.create({
      classroom: classroomId,
      teacher: req.user._id,
      type,
      title,
      description,
      topic: topic || '',
      dueDate: dueDate || null,
      points: points || 0,
      attachments: attachments || [],
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const updateItem = async (req, res) => {
  try {
    const item = await ClassworkItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const room = await Room.findById(item.classroom);
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    const { title, description, topic, dueDate, points, attachments } = req.body;
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    if (topic !== undefined) item.topic = topic;
    if (dueDate !== undefined) item.dueDate = dueDate;
    if (points !== undefined) item.points = points;
    if (attachments !== undefined) item.attachments = attachments;
    await item.save();
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const deleteItem = async (req, res) => {
  try {
    const item = await ClassworkItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const room = await Room.findById(item.classroom);
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await ClassworkItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const submitItem = async (req, res) => {
  try {
    const item = await ClassworkItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const room = await Room.findById(item.classroom);
    const Attendance = require('../models/Attendance');
    const enrolled = await Attendance.findOne({ room: item.classroom, student: req.user._id });
    if (!enrolled && room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const existing = item.submissions.find(s => String(s.student) === String(req.user._id));
    if (existing) {
      existing.content = req.body.content || existing.content;
      existing.submittedAt = new Date();
    } else {
      item.submissions.push({
        student: req.user._id,
        studentName: req.user.name,
        content: req.body.content || '',
      });
    }
    await item.save();
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const addSubmissionMarks = async (req, res) => {
  try {
    const item = await ClassworkItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const room = await Room.findById(item.classroom);
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    const { submissionIndex, marks, feedback } = req.body;
    if (item.submissions[submissionIndex]) {
      item.submissions[submissionIndex].marks = marks;
      item.submissions[submissionIndex].feedback = feedback;
      await item.save();
    }
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = { getItems, createItem, updateItem, deleteItem, addSubmissionMarks, submitItem };