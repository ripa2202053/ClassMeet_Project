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
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Login error: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login error: No user found for email ${email} (401)`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      console.log(`Login error: User ${email} has no password (Google account) (401)`);
      return res.status(401).json({ message: 'This account uses Google sign-in. Please sign in with Google.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`Login error: Incorrect password for ${email} (401)`);
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
    console.log('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
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

module.exports = { register, login, google };