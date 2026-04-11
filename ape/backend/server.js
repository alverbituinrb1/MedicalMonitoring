const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const APP_DATA_DIR = process.env.APE_DB_DIR
  || (process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'APE Monitoring')
    : DATA_DIR);
const DB_PATH = process.env.APE_DB_PATH || path.join(APP_DATA_DIR, 'ape.sqlite');
const birthdayRecords = require('./data/birthdayRecords.json');

const DEFAULT_PERSONNEL = [
  { id: '1001', name: 'John Doe', age: 28, birthday: '1995-05-12', gender: 'Male', lastMedicalDate: '2023-11-20', findings: 'Clear/Healthy', labTests: ['Complete Blood Count (CBC)', 'Urinalysis'], scanFileName: null, scanFileURL: null, history: [], physicalFitness: { bloodPressure: '118/76', heartRate: '72', height: '175', weight: '70', capability: 'Personal Fitness 1: Fully Exercise' }, physicalFitnessStatus: 'Personal Fitness 1: Fully Exercise' },
  { id: '1004', name: 'Juan Dela Cruz', age: 30, birthday: '1994-02-10', gender: 'Male', lastMedicalDate: '2024-02-01', findings: 'Complete', labTests: ['Chest X-Ray', 'Urinalysis'], scanFileName: null, scanFileURL: null, history: [], physicalFitness: { bloodPressure: '120/80', heartRate: '75', height: '170', weight: '72', capability: 'Personal Fitness 1: Fully Exercise' }, physicalFitnessStatus: 'Personal Fitness 1: Fully Exercise' },
  { id: '1002', name: 'Jane Smith', age: 34, birthday: '1989-08-05', gender: 'Female', lastMedicalDate: '2023-10-15', findings: 'Illness Detected', labTests: ['Chest X-Ray', 'Electrocardiogram (ECG)'], scanFileName: null, scanFileURL: null, history: [], physicalFitness: { bloodPressure: '145/92', heartRate: '105', height: '168', weight: '78', capability: 'Personal Fitness 2: Push up, Sit up, Light Weight Exercises' }, physicalFitnessStatus: 'Personal Fitness 2: Overweight - Push up, Sit up, Light Weight Exercises' },
  { id: '1003', name: 'Mark Johnson', age: 41, birthday: '1982-01-30', gender: 'Male', lastMedicalDate: '2024-01-10', findings: 'Pending Review', labTests: ['Drug Test', 'Physical Exam (PE)'], scanFileName: null, scanFileURL: null, history: [], physicalFitness: { bloodPressure: '155/98', heartRate: '118', height: '180', weight: '95', capability: 'Not Qualified / Personal Fitness 3: Not capable to do the fitness required' }, physicalFitnessStatus: 'Not Qualified / Personal Fitness 3: Obese - Not capable to do the fitness required' }
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(payload));
};

const parseBody = (request) => new Promise((resolve, reject) => {
  let rawBody = '';

  request.on('data', (chunk) => {
    rawBody += chunk.toString();
  });

  request.on('end', () => {
    if (!rawBody) {
      resolve({});
      return;
    }

    try {
      resolve(JSON.parse(rawBody));
    } catch (error) {
      reject(error);
    }
  });

  request.on('error', reject);
});

const mergePersonnelRecords = (primaryRecords, recordsToAdd) => {
  const existingIds = new Set(primaryRecords.map((person) => person.id));
  const missingRecords = recordsToAdd.filter((person) => !existingIds.has(person.id));
  return [...primaryRecords, ...missingRecords];
};

const createInitialStore = () => ({
  personnel: mergePersonnelRecords(DEFAULT_PERSONNEL, birthdayRecords),
  archived: []
});

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectory(DATA_DIR);
ensureDirectory(path.dirname(DB_PATH));

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = MEMORY;');

db.exec(`
  CREATE TABLE IF NOT EXISTS personnel_records (
    id TEXT NOT NULL,
    bucket TEXT NOT NULL CHECK (bucket IN ('personnel', 'archived')),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, bucket)
  );
`);

const upsertRecord = db.prepare(`
  INSERT INTO personnel_records (id, bucket, payload, updated_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(id, bucket) DO UPDATE SET
    payload = excluded.payload,
    updated_at = CURRENT_TIMESTAMP
`);

const deleteBucketRecords = db.prepare('DELETE FROM personnel_records WHERE bucket = ?');
const selectBucketRecords = db.prepare('SELECT payload FROM personnel_records WHERE bucket = ? ORDER BY updated_at ASC, id ASC');
const countRecords = db.prepare('SELECT COUNT(*) AS count FROM personnel_records');

const writeStore = (store) => {
  const nextStore = {
    personnel: Array.isArray(store.personnel) ? store.personnel : [],
    archived: Array.isArray(store.archived) ? store.archived : []
  };

  db.exec('BEGIN');

  try {
    deleteBucketRecords.run('personnel');
    deleteBucketRecords.run('archived');

    nextStore.personnel.forEach((person) => {
      upsertRecord.run(person.id, 'personnel', JSON.stringify(person));
    });

    nextStore.archived.forEach((person) => {
      upsertRecord.run(person.id, 'archived', JSON.stringify(person));
    });

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const readBucket = (bucket) => selectBucketRecords
  .all(bucket)
  .map((row) => {
    try {
      return JSON.parse(row.payload);
    } catch (error) {
      return null;
    }
  })
  .filter(Boolean);

const readStore = () => ({
  personnel: readBucket('personnel'),
  archived: readBucket('archived')
});

const migrateLegacyJsonStore = () => {
  if (countRecords.get().count > 0) {
    return;
  }

  let initialStore = createInitialStore();

  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      initialStore = {
        personnel: Array.isArray(parsed.personnel) ? parsed.personnel : initialStore.personnel,
        archived: Array.isArray(parsed.archived) ? parsed.archived : []
      };
    } catch (error) {
      console.warn('Unable to migrate legacy JSON store, using default seed data instead.');
    }
  }

  writeStore(initialStore);
};

const getBirthdaysByMonth = (records) => MONTH_NAMES.map((monthName, monthIndex) => {
  const entries = records
    .filter((person) => person.birthday && person.birthday !== 'N/A')
    .filter((person) => new Date(person.birthday).getMonth() === monthIndex)
    .sort((left, right) => new Date(left.birthday).getDate() - new Date(right.birthday).getDate())
    .map((person) => ({
      id: person.id,
      name: person.name,
      birthday: person.birthday,
      day: new Date(person.birthday).getDate(),
      agency: person.agency || 'N/A',
      unit: person.unit || 'N/A'
    }));

  return {
    month: monthName,
    monthNumber: monthIndex + 1,
    count: entries.length,
    entries
  };
});

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, port: PORT, database: DB_PATH });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/store') {
    const store = readStore();
    sendJson(response, 200, {
      ...store,
      birthdaysByMonth: getBirthdaysByMonth(store.personnel)
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/birthdays-by-month') {
    const store = readStore();
    sendJson(response, 200, {
      birthdaysByMonth: getBirthdaysByMonth(store.personnel)
    });
    return;
  }

  if (request.method === 'PUT' && requestUrl.pathname === '/api/store') {
    try {
      const body = await parseBody(request);
      const nextStore = {
        personnel: Array.isArray(body.personnel) ? body.personnel : [],
        archived: Array.isArray(body.archived) ? body.archived : []
      };

      writeStore(nextStore);
      sendJson(response, 200, {
        ...nextStore,
        birthdaysByMonth: getBirthdaysByMonth(nextStore.personnel)
      });
    } catch (error) {
      sendJson(response, 400, { error: 'Invalid JSON payload.' });
    }
    return;
  }

  sendJson(response, 404, { error: 'Route not found.' });
});

migrateLegacyJsonStore();

server.listen(PORT, () => {
  console.log(`APE backend running at http://localhost:${PORT}`);
  console.log(`SQLite database ready at ${DB_PATH}`);
});
