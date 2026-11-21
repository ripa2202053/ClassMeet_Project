const Announcement = require('../models/Announcement');
const Room = require('../models/Room');

const getAnnouncements = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const room = await Room.findById(classroomId);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) {
      const enrolled = await require('../models/Attendance').findOne({ room: classroomId, student: req.user._id });
      if (!enrolled) return res.status(403).json({ message: 'Not authorized' });
    }
    const items = await Announcement.find({ classroom: classroomId }).sort({ pinned: -1, createdAt: -1 });
    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const createAnnouncement = async (req, res) => {
  try {
    const { classroomId, title, content, attachments } = req.body;
    const room = await Room.findById(classroomId);
    if (!room) return res.status(404).json({ message: 'Classroom not found' });
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    const ann = await Announcement.create({
      classroom: classroomId,
      teacher: req.user._id,
      title,
      content,
      attachments: attachments || [],
    });
    res.status(201).json(ann);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    const room = await Room.findById(ann.classroom);
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    const { title, content, pinned, attachments } = req.body;
    if (title !== undefined) ann.title = title;
    if (content !== undefined) ann.content = content;
    if (pinned !== undefined) ann.pinned = pinned;
    if (attachments !== undefined) ann.attachments = attachments;
    await ann.save();
    res.json(ann);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    const room = await Room.findById(ann.classroom);
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const addComment = async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    const room = await Room.findById(ann.classroom);
    if (room.teacher.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    ann.comments.push({ user: req.user._id, name: req.user.name, text: req.body.text });
    await ann.save();
    res.json(ann);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, addComment };