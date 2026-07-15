const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Service = require('../models/Service');

// @route   POST /api/services
// @desc    List a new service (Freelancer only)
router.post('/', auth, async (req, res) => {
  const { title, description, price, deliveryTime, category } = req.body;

  try {
    if (req.user.role !== 'freelancer') {
      return res.status(403).json({ message: 'Only freelancers are permitted to offer services' });
    }

    if (!title || !description || !price || !deliveryTime || !category) {
      return res.status(400).json({ message: 'Please provide all service details' });
    }

    const parsedPrice = Number(price);
    const parsedDeliveryTime = Number(deliveryTime);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ message: 'Price must be a positive number.' });
    }

    if (!Number.isInteger(parsedDeliveryTime) || parsedDeliveryTime <= 0) {
      return res.status(400).json({ message: 'Delivery time must be a positive integer.' });
    }

    const service = new Service({
      title,
      description,
      price: parsedPrice,
      deliveryTime: parsedDeliveryTime,
      category,
      owner: req.user.id,
    });

    await service.save();
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services
// @desc    Get all services with optional filters
router.get('/', async (req, res) => {
  const { category, minPrice, maxPrice, maxDeliveryTime, search } = req.query;

  let query = {};

  if (category && category !== 'All') {
    query.category = category;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (maxDeliveryTime) {
    query.deliveryTime = { $lte: Number(maxDeliveryTime) };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    const services = await Service.find(query)
      .populate('owner', 'username ratings skills bio')
      .sort({ createdAt: -1 });

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
