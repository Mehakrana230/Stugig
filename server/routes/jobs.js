const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const Bid = require('../models/Bid');
const Review = require('../models/Review');

// @route   POST /api/jobs
// @desc    Create a new job posting (Client only)
router.post('/', auth, async (req, res) => {
  const { title, description, budget, deadline, category } = req.body;

  try {
    // Check role
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients are permitted to post jobs' });
    }

    if (!title || !description || !budget || !deadline || !category) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const job = new Job({
      title,
      description,
      budget,
      deadline,
      category,
      postedBy: req.user.id,
    });

    await job.save();
    res.status(201).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/jobs
// @desc    Get all open jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' })
      .populate('postedBy', 'username ratings')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/jobs/:id/bids
// @desc    Submit a bid/proposal on a job (Freelancer only)
router.post('/:id/bids', auth, async (req, res) => {
  const { quote, deliveryTime, proposalText } = req.body;

  try {
    // Check role
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers are permitted to submit bids' });
    }

    // Verify job exists
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Job is no longer open for bidding' });
    }

    // Check if bid already exists from this freelancer
    let existingBid = await Bid.findOne({ jobId: req.params.id, freelancerId: req.user.id });
    if (existingBid) {
      return res.status(400).json({ message: 'You have already placed a bid on this job' });
    }

    if (!quote || !deliveryTime || !proposalText) {
      return res.status(400).json({ message: 'Please enter all proposal fields' });
    }

    const bid = new Bid({
      jobId: req.params.id,
      freelancerId: req.user.id,
      quote,
      deliveryTime,
      proposalText,
    });

    await bid.save();
    res.status(201).json(bid);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/complete', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the client or admin can mark a job complete.' });
    }

    job.status = 'completed';
    await job.save();
    res.json({ message: 'Job marked complete.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to complete job.' });
  }
});

router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { toUserId, communication, quality, timeliness, comment } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed jobs can be reviewed.' });
    }

    const existingReview = await Review.findOne({ jobId: req.params.id, fromUserId: req.user.id });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this job.' });
    }

    if (!toUserId || ![1, 2, 3, 4, 5].includes(Number(communication)) || ![1, 2, 3, 4, 5].includes(Number(quality)) || ![1, 2, 3, 4, 5].includes(Number(timeliness))) {
      return res.status(400).json({ message: 'Please provide valid ratings for communication, quality, and timeliness.' });
    }

    const review = new Review({
      jobId: req.params.id,
      fromUserId: req.user.id,
      toUserId,
      communication: Number(communication),
      quality: Number(quality),
      timeliness: Number(timeliness),
      comment: comment || '',
    });

    await review.save();
    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to create review.' });
  }
});

// @route   PUT /api/jobs/:id/bids/:bidId
// @desc    Accept or decline a bid (client only)
router.put('/:id/bids/:bidId', auth, async (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be accepted or rejected.' });
  }
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (String(job.postedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the job client can accept or decline bids.' });
    }
    const bid = await Bid.findById(req.params.bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found.' });

    bid.status = status;
    await bid.save();

    // If accepting, reject all other bids for this job
    if (status === 'accepted') {
      await Bid.updateMany(
        { jobId: req.params.id, _id: { $ne: bid._id } },
        { status: 'rejected' }
      );
    }

    res.json({ bid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to update bid.' });
  }
});

// @desc    Get all bids for a job (Authorized users only)
router.get('/:id/bids', auth, async (req, res) => {
  try {
    // Verify job
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Allow postedBy client or bidders to view bids
    const bids = await Bid.find({ jobId: req.params.id })
      .populate('freelancerId', 'username ratings skills bio')
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
