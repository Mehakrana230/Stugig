const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
const Review = require('../models/Review');
const { validateAttachments } = require('../utils/uploads');

// @route   GET /api/users/search
// @desc    Search users by username (requires auth)
router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json([])
    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user.id },
    })
      .select('username role bio')
      .limit(10)
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Search failed' })
  }
})

// @route   GET /api/users/:userId
// @desc    Get user profile details, services, and reviews
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch user's services if freelancer
    let services = [];
    if (user.role === 'freelancer') {
      services = await Service.find({ owner: user._id });
    }

    const reviews = await Review.find({ toUserId: user._id })
      .populate('fromUserId', 'username')
      .sort({ createdAt: -1 });

    const average = reviews.length
      ? ((reviews.reduce((sum, review) => sum + ((review.communication + review.quality + review.timeliness) / 3), 0) / reviews.length) || 0).toFixed(1)
      : 0;

    res.json({
      user: {
        ...user.toObject(),
        averageRating: Number(average),
      },
      services,
      reviews,
    });
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's profile details
router.put('/profile', auth, async (req, res) => {
  const { bio, skills, attachments } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.trim().length > 500) {
        return res.status(400).json({ message: 'Bio must be a string with at most 500 characters.' });
      }
      user.bio = bio;
    }

    if (skills !== undefined) {
      if (!Array.isArray(skills) || skills.length > 10) {
        return res.status(400).json({ message: 'Skills must be an array with at most 10 entries.' });
      }
      user.skills = skills.filter((skill) => typeof skill === 'string' && skill.trim()).slice(0, 10);
    }

    if (attachments !== undefined) {
      const validation = validateAttachments(attachments, { maxItems: 3 });
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.message });
      }
      user.attachments = validation.attachments;
    }

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio,
      skills: user.skills,
      attachments: user.attachments || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
