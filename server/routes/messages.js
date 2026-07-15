const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const { validateAttachments } = require('../utils/uploads');

// @route   GET /api/messages/conversations
// @desc    List all conversation partners for logged-in user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username')
      .populate('receiverId', 'username');

    const seen = new Set();
    const conversations = [];

    for (const message of messages) {
      const otherUser = message.senderId._id.toString() === userId
        ? message.receiverId
        : message.senderId;
      const otherId = otherUser._id.toString();

      if (seen.has(otherId)) continue;
      seen.add(otherId);

      const unreadCount = await Message.countDocuments({
        senderId: otherId,
        receiverId: userId,
        read: false,
      });

      conversations.push({
        user: {
          id: otherId,
          username: otherUser.username,
        },
        lastMessage: message.content || 'Shared a file',
        attachments: message.attachments,
        lastUpdated: message.createdAt,
        unreadCount,
      });
    }

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load conversations' });
  }
});

// @route   GET /api/messages/thread/:userId
// @desc    Get message thread between logged-in user and partner
router.get('/thread/:userId', auth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const partnerId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const thread = await Message.find({
      $or: [
        { senderId: ownerId, receiverId: partnerId },
        { senderId: partnerId, receiverId: ownerId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username')
      .populate('receiverId', 'username');

    await Message.updateMany(
      {
        senderId: partnerId,
        receiverId: ownerId,
        read: false,
      },
      { read: true }
    );

    // Normalize senderId/receiverId to plain strings so frontend isOwn check works
    const normalized = thread.map((m) => ({
      _id: m._id,
      senderId: m.senderId?._id?.toString() ?? m.senderId?.toString(),
      receiverId: m.receiverId?._id?.toString() ?? m.receiverId?.toString(),
      content: m.content,
      attachments: m.attachments,
      read: m.read,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load thread' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { to, content, attachments = [] } = req.body;
    if (!to || (!content && !attachments.length)) {
      return res.status(400).json({ message: 'Please provide a recipient and message content.' });
    }

    const validation = validateAttachments(attachments, { maxItems: 5 });
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    const message = new Message({
      senderId: req.user.id,
      receiverId: to,
      content: content || '',
      attachments: validation.attachments,
      read: false,
    });

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to send message' });
  }
});

module.exports = router;
