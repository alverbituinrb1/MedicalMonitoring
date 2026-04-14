const mongoose = require('mongoose');

const deletedPersonnelSchema = new mongoose.Schema({
  originalId: { type: String, required: true },
  deletedAt: { type: Date, default: Date.now },
  deletedFromArchive: { type: Boolean, default: true },
  reason: { type: String, default: 'trashbin' },
  payload: { type: mongoose.Mixed, required: true }
}, { timestamps: true });

module.exports = mongoose.model('DeletedPersonnel', deletedPersonnelSchema);
