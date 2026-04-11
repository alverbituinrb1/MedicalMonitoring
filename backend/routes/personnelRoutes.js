const express = require('express');
const router = express.Router();
const Personnel = require('../models/Personnel');

// GET all active personnel
router.get('/', async (req, res) => {
  try {
    const records = await Personnel.find({ isArchived: false }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all archived personnel
router.get('/archived', async (req, res) => {
  try {
    const records = await Personnel.find({ isArchived: true }).sort({ updatedAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE new personnel
router.post('/', async (req, res) => {
  try {
    const record = new Personnel({ ...req.body, isArchived: false });
    await record.save();
    const allRecords = await Personnel.find({ isArchived: false }).sort({ createdAt: -1 });
    res.json(allRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE existing personnel
router.put('/:id', async (req, res) => {
  try {
    await Personnel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    const allRecords = await Personnel.find({ isArchived: false }).sort({ createdAt: -1 });
    res.json(allRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ARCHIVE a personnel
router.put('/:id/archive', async (req, res) => {
  try {
    const record = await Personnel.findOneAndUpdate({ id: req.params.id }, { isArchived: true }, { new: true });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UNARCHIVE a personnel
router.put('/:id/unarchive', async (req, res) => {
  try {
    const record = await Personnel.findOneAndUpdate({ id: req.params.id }, { isArchived: false }, { new: true });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE entirely (permanent from trashbin)
router.delete('/:id', async (req, res) => {
  try {
    await Personnel.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORT CSV replacement
router.post('/import', async (req, res) => {
  try {
    const records = req.body; 
    // Delete existing active records to match user's "replaceCollection"
    await Personnel.deleteMany({ isArchived: false });
    const toInsert = records.map(r => ({ ...r, isArchived: false }));
    await Personnel.insertMany(toInsert);
    const allRecords = await Personnel.find({ isArchived: false }).sort({ createdAt: -1 });
    res.json(allRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
