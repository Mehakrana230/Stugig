const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { sendOTP } = require('../utils/mailer');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'stugig_jwt_secret_key_change_me';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store: { email -> { otp, expiresAt } }
const otpStore = new Map();

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// @route   POST /api/auth/google-mock
// @desc    Dev-mode Google sign-in simulation
router.post('/google-mock', async (req, res) => {
  try {
    const { role } = req.body;
    const mockEmail = 'google_demo@stugig.dev';
    const mockUsername = 'google_user';

    let user = await User.findOne({ email: mockEmail });
    if (!user) {
      user = new User({
        username: mockUsername,
        email: mockEmail,
        password: await require('bcryptjs').hash('google_mock_pw_' + JWT_SECRET, 10),
        role: role || 'freelancer',
        bio: 'Signed in with Google',
        skills: [],
      });
      await user.save();
    }

    const payload = { id: user._id, username: user.username, email: user.email, role: user.role };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role, bio: user.bio, skills: user.skills },
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Mock Google sign-in failed.' });
  }
});

// @route   POST /api/auth/google
// @desc    Sign in / sign up with Google
router.post('/google', async (req, res) => {
  const { credential, role } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential is required.' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email) return res.status(400).json({ message: 'Unable to retrieve email from Google.' });

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // New user — create account
      const username = (name || email.split('@')[0])
        .replace(/\s+/g, '_')
        .slice(0, 24)
        .toLowerCase();

      // Make username unique if taken
      let finalUsername = username;
      let counter = 1;
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `${username}${counter++}`;
      }

      user = new User({
        username: finalUsername,
        email: email.toLowerCase(),
        password: await bcrypt.hash(googleId + JWT_SECRET, 10), // placeholder password
        role: role || 'freelancer',
        bio: '',
        skills: [],
      });
      await user.save();
    }

    const tokenPayload = { id: user._id, username: user.username, email: user.email, role: user.role };
    jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role, bio: user.bio, skills: user.skills },
      });
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Invalid Google credential.' });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send a 6-digit OTP to the given email
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Check if already registered
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(400).json({ message: 'An account with this email already exists.' });
  }

  const otp = generateOTP();
  otpStore.set(normalizedEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  const emailConfigured =
    process.env.EMAIL_USER &&
    !process.env.EMAIL_USER.includes('your_gmail') &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_PASS.includes('your_app_password');

  if (!emailConfigured) {
    return res.json({ message: 'Email not configured. Use this OTP to test:', otp });
  }

  try {
    await sendOTP(normalizedEmail, otp);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Email send error:', err.message);
    return res.json({ message: 'Email send failed. Use this OTP to test:', otp });
  }
});

// @route   POST /api/auth/signup
// @desc    Register a new user (requires valid OTP)
router.post('/signup', async (req, res) => {
  const { username, email, password, role, otp, bio, skills } = req.body;

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    if (!username || !email || !password || !role || !otp) {
      return res.status(400).json({ message: 'Please fill all fields including the OTP.' });
    }

    const normalizedUsername = String(username).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 24) {
      return res.status(400).json({ message: 'Username must be between 3 and 24 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!['client', 'freelancer'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Role must be either client or freelancer.' });
    }

    // Verify OTP
    const record = otpStore.get(normalizedEmail);
    if (!record) {
      return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // OTP valid — clear it
    otpStore.delete(normalizedEmail);

    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ message: 'User already exists with this email.' });

    user = await User.findOne({ username: normalizedUsername });
    if (user) return res.status(400).json({ message: 'Username is already taken.' });

    user = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role: normalizedRole,
      bio: typeof bio === 'string' ? bio.slice(0, 500) : '',
      skills: Array.isArray(skills) ? skills.filter(Boolean).slice(0, 10) : [],
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { id: user._id, username: user.username, email: user.email, role: user.role };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.status(201).json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role, bio: user.bio, skills: user.skills },
      });
    });
  } catch (err) {
    console.error(err.stack || err);
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: user._id, username: user.username, email: user.email, role: user.role };
    jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role, bio: user.bio, skills: user.skills },
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send OTP to email for password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // Don't reveal whether email exists — but in dev return OTP anyway
    if (process.env.NODE_ENV !== 'production') {
      const otp = generateOTP();
      otpStore.set(`reset_${normalizedEmail}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
      return res.json({ message: 'No account found, but here is a test OTP:', otp });
    }
    return res.json({ message: 'If this email is registered, an OTP has been sent.' });
  }

  const otp = generateOTP();
  otpStore.set(`reset_${normalizedEmail}`, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  const emailConfigured =
    process.env.EMAIL_USER &&
    !process.env.EMAIL_USER.includes('your_gmail') &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_PASS.includes('your_app_password');

  if (!emailConfigured) {
    // Dev mode — return OTP directly in response
    return res.json({ message: 'Email not configured. Use this OTP to test:', otp });
  }

  try {
    await sendOTP(normalizedEmail, otp);
    res.json({ message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Reset email error:', err.message);
    // Fall back to dev OTP display on send failure
    return res.json({ message: 'Email send failed. Use this OTP to test:', otp });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Verify OTP and set new password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const record = otpStore.get(`reset_${normalizedEmail}`);

  if (!record) return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(`reset_${normalizedEmail}`);
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
  }

  otpStore.delete(`reset_${normalizedEmail}`);

  try {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
