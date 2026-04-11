const mongoose = require('mongoose');

const physicalFitnessSchema = new mongoose.Schema({
  bloodPressure: String,
  heartRate: String,
  height: String,
  weight: String,
  capability: String
}, { _id: false });

const personnelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  age: mongoose.Mixed,
  birthday: String,
  gender: String,
  designation: String,
  unit: String,
  agency: String,
  bloodType: String,
  lastMedicalDate: String,
  findings: String,
  medicalExamLocation: String,
  physicalFitnessStatus: String,
  physicalFitness: physicalFitnessSchema,
  scanFileName: String,
  scanFileURL: String,
  history: [mongoose.Mixed],
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Personnel', personnelSchema);
