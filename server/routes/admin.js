const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');
const Payment = require('../models/Payment');

const requireAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id).select('role');
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete another admin.' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to delete user.' });
  }
});

router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load users.' });
  }
});

router.put('/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['client', 'freelancer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.role = role;
    await user.save();
    res.json({ message: 'User role updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to update role.' });
  }
});

router.get('/jobs', auth, requireAdmin, async (req, res) => {
  try {
    const jobs = await Job.find().populate('postedBy', 'username').sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load jobs.' });
  }
});

router.put('/jobs/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (status) {
      job.status = status;
      await job.save();
    }

    res.json({ message: 'Job updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to update job.' });
  }
});

router.get('/earnings', auth, requireAdmin, async (req, res) => {
  try {
    const payments = await Payment.find().populate('jobId', 'title').populate('clientId', 'username').populate('freelancerId', 'username').sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load commission log.' });
  }
});

module.exports = router;
