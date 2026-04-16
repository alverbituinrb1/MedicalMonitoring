const { mongoose, ensureMongoConnection } = require('../backend/mongo');

module.exports = async (req, res) => {
  try {
    await ensureMongoConnection();
    res.status(200).json({
      server: 'online',
      database: mongoose.connection.readyState === 1 ? 'online' : 'offline'
    });
  } catch (error) {
    res.status(503).json({
      server: 'online',
      database: 'offline',
      error: error.message
    });
  }
};
