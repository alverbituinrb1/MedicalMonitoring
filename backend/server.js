const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { app, ensureMongoConnection } = require('./app');

const frontendBuildPath = path.join(__dirname, '..', 'ape', 'build');

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Retrying connection in 10 seconds...');
  setTimeout(() => {
    ensureMongoConnection().catch((error) => {
      console.error('MongoDB reconnect error:', error.message);
    });
  }, 10000);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
ensureMongoConnection()
  .catch((error) => {
    console.error('Initial MongoDB connection error:', error.message);
  })
  .finally(() => {
    app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
  });
