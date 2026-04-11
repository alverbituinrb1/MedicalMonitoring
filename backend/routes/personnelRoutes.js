const express = require('express');
const router = express.Router();
const Personnel = require('../models/Personnel');

const buildHistoryKey = (record = {}) => ([
  record.date || '',
  record.findings || '',
  record.medicalExamLocation || '',
  record.scanFileName || '',
  record.scanFileURL || '',
  record.physicalFitness?.height || '',
  record.physicalFitness?.weight || '',
  record.physicalFitness?.capability || ''
].join('|'));

const mergeHistoryRecords = (existingHistory = [], incomingHistory = []) => {
  const merged = [];
  const seen = new Set();

  [...existingHistory, ...incomingHistory].forEach((record) => {
    if (!record || typeof record !== 'object') return;
    const key = buildHistoryKey(record);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(record);
  });

  return merged;
};

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
    const existingRecord = await Personnel.findOne({ id: req.params.id });

    if (!existingRecord) {
      return res.status(404).json({ error: 'Personnel record not found' });
    }

    const payload = {
      ...req.body,
      history: mergeHistoryRecords(existingRecord.history, req.body.history)
    };

    await Personnel.findOneAndUpdate({ id: req.params.id }, payload, { new: true });
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

// IMPORT CSV merge/update
router.post('/import', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [];

    for (const record of records) {
      const payload = {
        ...record,
        isArchived: false
      };

      await Personnel.findOneAndUpdate(
        { id: payload.id },
        payload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const allRecords = await Personnel.find({ isArchived: false }).sort({ createdAt: -1 });
    res.json(allRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
