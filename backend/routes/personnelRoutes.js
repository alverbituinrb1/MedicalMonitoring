const express = require('express');
const router = express.Router();
const Personnel = require('../models/Personnel');
const DeletedPersonnel = require('../models/DeletedPersonnel');

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

const buildMedicalSnapshotKey = (record = {}) => JSON.stringify({
  lastMedicalDate: record.lastMedicalDate || '',
  findings: record.findings || '',
  medicalExamLocation: record.medicalExamLocation || '',
  physicalFitnessStatus: record.physicalFitnessStatus || '',
  physicalFitness: {
    bloodPressure: record.physicalFitness?.bloodPressure || '',
    heartRate: record.physicalFitness?.heartRate || '',
    height: record.physicalFitness?.height || '',
    weight: record.physicalFitness?.weight || '',
    capability: record.physicalFitness?.capability || ''
  },
  scanFileName: record.scanFileName || '',
  scanFileURL: record.scanFileURL || ''
});

const hasMedicalRecordChanges = (existingRecord = {}, nextRecord = {}) => (
  buildMedicalSnapshotKey(existingRecord) !== buildMedicalSnapshotKey(nextRecord)
);

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const buildDuplicateSignature = (record = {}) => ([
  normalizeText(record.name),
  normalizeText(record.birthday),
  normalizeText(record.agency),
  normalizeText(record.unit)
].join('|'));
const hasActiveDuplicate = async (record) => {
  if (!record) return false;

  if (record.id) {
    const duplicateById = await Personnel.exists({
      id: record.id,
      isArchived: false
    });

    if (duplicateById) {
      return true;
    }
  }

  const activeCandidates = await Personnel.find({ isArchived: false })
    .select('name birthday agency unit')
    .lean();

  const recordSignature = buildDuplicateSignature(record);
  if (!recordSignature.replace(/\|/g, '')) {
    return false;
  }

  return activeCandidates.some((candidate) => buildDuplicateSignature(candidate) === recordSignature);
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
    const records = await Personnel.find({ isArchived: true }).sort({ updatedAt: -1 }).lean();
    const recordsWithDuplicateState = await Promise.all(records.map(async (record) => ({
      ...record,
      hasActiveDuplicate: await hasActiveDuplicate(record)
    })));
    res.json(recordsWithDuplicateState);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET permanently deleted personnel log
router.get('/deleted', async (req, res) => {
  try {
    const records = await DeletedPersonnel.find({}).sort({ deletedAt: -1 }).limit(100);
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

    if (hasMedicalRecordChanges(existingRecord, payload)) {
      await DeletedPersonnel.create({
        originalId: existingRecord.id,
        deletedAt: new Date(),
        deletedFromArchive: Boolean(existingRecord.isArchived),
        reason: 'medical-update',
        payload: existingRecord.toObject()
      });
    }

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

// DELETE moves active records to Trashbin; archived records are permanently deleted and logged
router.delete('/:id', async (req, res) => {
  try {
    const record = await Personnel.findOne({ id: req.params.id });

    if (!record) {
      return res.status(404).json({ error: 'Personnel record not found' });
    }

    if (!record.isArchived) {
      record.isArchived = true;
      await record.save();

      return res.json({ success: true, action: 'archived', record });
    }

    await DeletedPersonnel.create({
      originalId: record.id,
      deletedAt: new Date(),
      deletedFromArchive: true,
      reason: 'trashbin',
      payload: record.toObject()
    });

    await Personnel.deleteOne({ id: req.params.id });

    return res.json({
      success: true,
      action: 'deleted',
      deletedId: req.params.id
    });
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
