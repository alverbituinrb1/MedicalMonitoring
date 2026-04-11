export const readCollection = (storageKey, fallback = []) => {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Failed to parse local storage key "${storageKey}":`, error);
    return fallback;
  }
};

export const writeCollection = (storageKey, records) => {
  localStorage.setItem(storageKey, JSON.stringify(records));
  return records;
};

export const createRecord = (storageKey, record, existingRecords = []) => {
  const nextRecords = [...existingRecords, record];
  writeCollection(storageKey, nextRecords);
  return nextRecords;
};

export const updateRecord = (storageKey, recordId, nextRecord, existingRecords = []) => {
  const nextRecords = existingRecords.map((record) => (
    record.id === recordId ? nextRecord : record
  ));
  writeCollection(storageKey, nextRecords);
  return nextRecords;
};

export const deleteRecord = (storageKey, recordId, existingRecords = []) => {
  const nextRecords = existingRecords.filter((record) => record.id !== recordId);
  writeCollection(storageKey, nextRecords);
  return nextRecords;
};

export const replaceCollection = (storageKey, records) => {
  writeCollection(storageKey, records);
  return records;
};
