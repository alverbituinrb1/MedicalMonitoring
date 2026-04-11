const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Personnel = require('../models/Personnel');

const dataFilePath = path.join(__dirname, '..', '..', 'ape', 'src', 'data', 'birthdayRecords.js');

function loadBirthdayRecords() {
  const source = fs.readFileSync(dataFilePath, 'utf8');
  const transformed = source.replace(
    /export\s+const\s+\w+\s*=/,
    'module.exports ='
  );

  const sandbox = {
    module: { exports: null },
    exports: {}
  };

  vm.runInNewContext(transformed, sandbox, { filename: dataFilePath });
  return sandbox.module.exports;
}

async function run() {
  const records = loadBirthdayRecords();

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No birthday records found to import.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  await Personnel.deleteMany({ isArchived: false });
  await Personnel.insertMany(
    records.map((record) => ({
      ...record,
      isArchived: false
    }))
  );

  const count = await Personnel.countDocuments({ isArchived: false });
  console.log(`Imported ${count} active personnel records.`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors during failure cleanup.
    }
    process.exitCode = 1;
  });
