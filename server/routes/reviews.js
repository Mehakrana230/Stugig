const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const User = require('../models/User');
const mongoose = require('mongoose');

// @route   POST /api/reviews
// @desc    Leave a review for any user (no job required)
router.post('/', auth, async (req, res) => {
  const { toUserId, communication, quality, timeliness, comment } = req.body;

  if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
    return res.status(400).json({ message: 'Valid toUserId is required.' });
  }
  if (String(toUserId) === String(req.user.id)) {
    return res.status(400).json({ message: 'You cannot review yourself.' });
  }

  const c = Number(communication), q = Number(quality), t = Number(timeliness);
  if (![c,q,t].every(n => n >= 1 && n <= 5)) {
    return res.status(400).json({ message: 'Each rating must be between 1 and 5.' });
  }

  try {
    const existing = await Review.findOne({ fromUserId: req.user.id, toUserId, jobId: null });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this user.' });

    const review = new Review({
      jobId: new mongoose.Types.ObjectId(), // placeholder — not tied to specific job
      fromUserId: req.user.id,
      toUserId,
      communication: c,
      quality: q,
      timeliness: t,
      comment: comment?.slice(0, 500) || '',
    });
    await review.save();

    // update user average rating
    const allReviews = await Review.find({ toUserId });
    const avg = allReviews.reduce((sum, r) => sum + (r.communication + r.quality + r.timeliness) / 3, 0) / allReviews.length;
    await User.findByIdAndUpdate(toUserId, { 'ratings.average': Number(avg.toFixed(1)), 'ratings.count': allReviews.length });

    const populated = await review.populate('fromUserId', 'username');
    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to submit review.' });
  }
});

module.exports = router;
