const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);

    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      console.log('Registration Error: Please fill all required fields (400)');
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    if (password.length < 6) {
      console.log('Registration Error: Password must be at least 6 characters (400)');
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const safeRole = String(role || 'student').toLowerCase().trim();
    if (!['teacher', 'student'].includes(safeRole)) {
      console.log(`Registration Error: Invalid role "${role}" (400)`);
      return res.status(400).json({ message: 'Role must be "student" or "teacher"' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      console.log(`Registration Error: User already exists for ${email} (400)`);
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: safeRole
    });

    console.log(`Registration success: ${user.email} created (${user.role})`);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.log('Registration Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      console.log('Registration Error: User already exists (duplicate key) (400)');
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: 'Internal server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      console.log('Login error: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (mongoose.connection.readyState !== 1) {
      console.error('Login error: MongoDB is not connected. readyState:', mongoose.connection.readyState);
      return res.status(503).json({
        message: 'Database connection failed. Please ensure your IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0).'
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      console.log(`Login error: No user found for email ${cleanEmail} (401)`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      console.log(`Login error: User ${cleanEmail} has no password (Google account) (401)`);
      return res.status(401).json({ message: 'This account uses Google sign-in. Please sign in with Google.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`Login error: Incorrect password for ${cleanEmail} (401)`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.name === 'MongooseError' || error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
      return res.status(503).json({
        message: 'Database connection timeout. Please check your internet or whitelist IP 0.0.0.0/0 in MongoDB Atlas.'
      });
    }
    res.status(500).json({ message: error.message || 'Internal server error during login' });
  }
};

const google = async (req, res) => {
  try {
    const { credential, role } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        role: role || 'student',
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).json({ message: 'Google authentication failed' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    console.log(`[ClassMeet] Password Reset OTP for ${cleanEmail}: ${otp}`);

    // If EMAIL_USER and EMAIL_PASS are set in .env, send real email via Nodemailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: `"ClassMeet" <${process.env.EMAIL_USER}>`,
          to: cleanEmail,
          subject: 'ClassMeet - Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #233740; margin-top: 0;">ClassMeet Password Reset</h2>
              <p style="color: #4b626d; font-size: 14px; line-height: 1.5;">
                You requested a password reset for your ClassMeet account. Enter the verification code below on the reset page:
              </p>
              <div style="background: #eef4f7; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #233740;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
                This code will expire in 15 minutes. If you did not request this, please ignore this email.
              </p>
            </div>
          `
        });

        return res.json({
          success: true,
          message: 'Verification code sent to your email address.'
        });
      } catch (mailErr) {
        console.error('Mail send error:', mailErr);
        return res.status(500).json({
          message: `Email could not be delivered: ${mailErr.message}. Make sure your Gmail App Password in .env is correct.`
        });
      }
    } else {
      // SMTP not yet configured in .env
      console.warn('[ClassMeet] SMTP not configured. To send live emails, add EMAIL_USER and EMAIL_PASS in backend/.env');
      return res.json({
        success: true,
        devOtp: otp,
        isDevMode: true,
        message: `Verification code generated! (Dev mode: OTP is ${otp}. To receive real emails, set EMAIL_USER & EMAIL_PASS in backend/.env)`
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error processing password reset' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`Password reset success for user: ${cleanEmail}`);
    return res.json({ success: true, message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

module.exports = { register, login, google, forgotPassword, resetPassword };