const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  googleId: { type: String },
  role: {
    type: String,
    enum: ['teacher', 'student'],
    default: 'student'
  },
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Date },
  defaultSettings: {
    type: Object,
    default: {
      profile: {
        fullName: '',
        designation: 'Lecturer',
        department: '',
        institution: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        googleConnected: false,
      },
      general: {
        waitingRoom: true,
        muteOnEntry: true,
        cameraOffOnEntry: false,
        whiteboardPermission: 'View Only',
        lockPdfNavigation: true,
        chatMode: 'Public & Private',
      },
      ai: {
        attendanceTracking: true,
        presenceThreshold: 75,
        inattentivenessThreshold: '20 seconds',
        audioOnlyException: true,
      },
      exam: {
        fullscreenEnforcement: true,
        tabSwitchLimit: 2,
        deviceDetection: true,
        randomizeQuestions: true,
        autoSubmitTimer: true,
      },
      reports: {
        autoExcelReport: true,
        reportColumns: {
          attendanceStatus: true,
          engagementScore: true,
          tabSwitchLogs: true,
          phoneAlerts: true,
          quizMarks: true,
        },
        camera: 'Default Camera',
        microphone: 'Default Microphone',
        speaker: 'Default Speaker',
      },
    },
  },
}, { timestamps: true });

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (err) {
    console.error('Password compare error:', err);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);