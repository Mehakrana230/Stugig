const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('StuGig API Server is running...');
});

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the StuGig API Gateway!', status: 'Healthy' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
