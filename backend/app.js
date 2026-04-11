const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const personnelRoutes = require('./routes/personnelRoutes');

const app = express();
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ape-monitoring';

let connectionPromise = null;

const ensureMongoConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    }).finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
};

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
