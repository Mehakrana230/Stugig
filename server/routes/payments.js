const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Stripe = require('stripe');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

const stripe = process.env.STRIPE_KEY ? new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2023-08-01',
}) : null;

// @route   POST /api/payments/demo
// @desc    Create a simulated escrow payment (no real Stripe needed)
router.post('/demo', auth, async (req, res) => {
  const { jobId, freelancerId, amount } = req.body;

  if (!jobId || !freelancerId || !amount) {
    return res.status(400).json({ message: 'jobId, freelancerId, and amount are required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(freelancerId)) {
    return res.status(400).json({ message: 'Invalid job or freelancer id.' });
  }

  try {
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    if (String(job.postedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the job client can initiate payment.' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Payment can only be created for an open job.' });
    }

    const existing = await Payment.findOne({ jobId, status: { $in: ['escrowed', 'released'] } });
    if (existing) return res.status(400).json({ message: 'Payment already exists for this job.' });

    const amountNum = Number(amount);
    if (amountNum < 1) return res.status(400).json({ message: 'Amount must be at least $1.' });

    const payment = new Payment({
      jobId,
      clientId: req.user.id,
      freelancerId,
      amount: amountNum,
      stripePaymentIntentId: `demo_${Date.now()}`,
      status: 'escrowed',
    });
    await payment.save();

    job.status = 'in_progress';
    await job.save();

    res.status(201).json({ payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to create demo payment.' });
  }
});

// @route   POST /api/payments/:paymentId/refund
// @desc    Refund an escrowed payment
router.post('/:paymentId/refund', auth, async (req, res) => {
  const { paymentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ message: 'Invalid payment id.' });
  }
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });
    if (String(payment.clientId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Only the client can refund this payment.' });
    }
    if (payment.status !== 'escrowed') {
      return res.status(400).json({ message: 'Only escrowed payments can be refunded.' });
    }
    payment.status = 'refunded';
    await payment.save();

    const job = await Job.findById(payment.jobId);
    if (job) { job.status = 'open'; await job.save(); }

    res.json({ payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to refund payment.' });
  }
});

// @route   POST /api/payments/create-intent
// @desc    Create a Stripe PaymentIntent for a job and hold funds in escrow
router.post('/create-intent', auth, async (req, res) => {
  const { jobId, freelancerId, amount } = req.body;

  if (!jobId || !freelancerId || !amount) {
    return res.status(400).json({ message: 'jobId, freelancerId, and amount are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(freelancerId)) {
    return res.status(400).json({ message: 'Invalid job or freelancer id' });
  }

  try {
    if (!stripe) {
      return res.status(503).json({ message: 'Stripe is not configured for this environment.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the job client can initiate payment' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ message: 'Payment can only be created for an open job' });
    }

    const existingPayment = await Payment.findOne({ jobId, status: { $in: ['escrowed', 'released'] } });
    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already exists for this job' });
    }

    const amountInCents = Math.round(Number(amount) * 100);
    if (amountInCents < 50) {
      return res.status(400).json({ message: 'Amount must be at least $0.50' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      capture_method: 'manual',
      metadata: {
        jobId,
        clientId: req.user.id,
        freelancerId,
      },
      description: `Escrow payment for job ${job.title}`,
    });

    const payment = new Payment({
      jobId,
      clientId: req.user.id,
      freelancerId,
      amount: Number(amount),
      stripePaymentIntentId: paymentIntent.id,
      status: 'escrowed',
    });
    await payment.save();

    job.status = 'in_progress';
    await job.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      payment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to create payment intent' });
  }
});

// @route   POST /api/payments/:paymentId/complete
// @desc    Capture escrowed funds and release payment to freelancer
router.post('/:paymentId/complete', auth, async (req, res) => {
  const { paymentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ message: 'Invalid payment id' });
  }

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.clientId.toString() !== req.user.id && payment.freelancerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to complete this payment' });
    }

    if (payment.status !== 'escrowed') {
      return res.status(400).json({ message: 'Payment is not in escrow' });
    }

    const paymentIntent = await stripe.paymentIntents.capture(payment.stripePaymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Unable to capture payment' });
    }

    payment.status = 'released';
    await payment.save();

    const job = await Job.findById(payment.jobId);
    if (job) {
      job.status = 'completed';
      await job.save();
    }

    res.json({ payment, paymentIntent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to complete payment' });
  }
});

// @route   GET /api/payments/history
// @desc    Get payment history for client or freelancer
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ clientId: req.user.id }, { freelancerId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate('jobId', 'title status')
      .populate('clientId', 'username')
      .populate('freelancerId', 'username');

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load payment history' });
  }
});

module.exports = router;
