const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Personnel = require('../models/Personnel');

const outputDir = path.join(__dirname, '..', '..', 'ape', 'src', 'data');
const outputPath = path.join(outputDir, 'personnelCache.json');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  });

  const [active, archived] = await Promise.all([
    Personnel.find({ isArchived: false }).sort({ createdAt: -1 }).lean(),
    Personnel.find({ isArchived: true }).sort({ updatedAt: -1 }).lean()
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    active,
    archived
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  console.log(`Exported ${active.length} active and ${archived.length} archived personnel records to ${outputPath}`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // Ignore disconnect cleanup errors.
    }
    process.exitCode = 1;
  });
