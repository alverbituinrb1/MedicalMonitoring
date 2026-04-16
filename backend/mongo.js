const mongoose = require('mongoose');
require('dotenv').config();

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

module.exports = {
  mongoose,
  ensureMongoConnection
};
