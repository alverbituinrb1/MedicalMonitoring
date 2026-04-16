const express = require('express');
const cors = require('cors');

const personnelRoutes = require('./routes/personnelRoutes');
const { mongoose, ensureMongoConnection } = require('./mongo');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()) : true
}));
app.use(express.json({ limit: '50mb' }));

app.use(async (req, res, next) => {
  try {
    await ensureMongoConnection();
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    server: 'online',
    database: mongoose.connection.readyState === 1 ? 'online' : 'offline'
  });
});

app.use('/api/personnel', personnelRoutes);

module.exports = { app, ensureMongoConnection };
