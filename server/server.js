const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stugig';
const JWT_SECRET = process.env.JWT_SECRET || 'stugig_jwt_secret_key_change_me';

// Middleware
// Log incoming requests for debugging connectivity
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || req.ip}`)
  next()
})

// Enable CORS (allowing client origin by env or any)
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }))
app.use(express.json())

// Database Connection
mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('Connected to MongoDB successfully.')
    console.log(`Mongo URI: ${MONGO_URI}`)
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
    // don't exit immediately to allow debugging in dev
  })

// Health check endpoint
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Routes Registration
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/services', require('./routes/services'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/assistant', require('./routes/assistant').router);
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.send('StuGig Express Server is running with MongoDB connection.');
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  socket.join(userId);

  socket.on('send_message', async ({ to, content, attachments = [] }) => {
    if (!to || (!content && !attachments.length)) return;

    try {
      const message = new Message({
        senderId: userId,
        receiverId: to,
        content: content || '',
        attachments,
        read: false,
      });

      await message.save();
      const payload = {
        id: message._id,
        senderId: userId,
        receiverId: to,
        content: message.content,
        attachments: message.attachments,
        read: message.read,
        createdAt: message.createdAt,
      };

      io.to(to).to(userId).emit('new_message', payload);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  });

  socket.on('typing', ({ to, isTyping }) => {
    if (!to) return;
    socket.to(to).emit('typing', {
      from: userId,
      isTyping: !!isTyping,
    });
  });

  socket.on('disconnect', () => {
    socket.leave(userId);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
