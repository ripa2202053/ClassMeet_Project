const User = require('../models/User');

const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      profile: {
        fullName: user.name || '',
        designation: user.defaultSettings?.profile?.designation || 'Lecturer',
        department: user.defaultSettings?.profile?.department || '',
        institution: user.defaultSettings?.profile?.institution || '',
        email: user.email || '',
        googleConnected: !!user.googleId,
      },
      general: user.defaultSettings?.general || {},
      ai: user.defaultSettings?.ai || {},
      exam: user.defaultSettings?.exam || {},
      reports: user.defaultSettings?.reports || {},
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const incoming = req.body || {};
    // Merge profile name into user.name if provided
    if (incoming.profile?.fullName) {
      user.name = incoming.profile.fullName;
    }

    const current = user.defaultSettings || {};
    const mergedGeneral = { ...(current.general || {}), ...(incoming.general || {}) };
    const mergedAi = { ...(current.ai || {}), ...(incoming.ai || {}) };

    // If camera is turned off on entry, disable AI face detection automatically
    if (mergedGeneral.cameraOffOnEntry === true) {
      mergedAi.attendanceTracking = false;
    }

    user.defaultSettings = {
      ...current,
      profile: { ...(current.profile || {}), ...(incoming.profile || {}) },
      general: mergedGeneral,
      ai: mergedAi,
      exam: { ...(current.exam || {}), ...(incoming.exam || {}) },
      reports: { ...(current.reports || {}), ...(incoming.reports || {}) },
    };

    await user.save();
    res.json({ message: 'Settings updated', defaultSettings: user.defaultSettings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSettings, updateSettings };