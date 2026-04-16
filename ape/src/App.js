import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Navbar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import PatientForm from './components/PatientForm/PatientForm';
import Login from './components/Login/Login';
import CalendarView from './components/CalendarView/CalendarView';
import { BIRTHDAY_RECORDS_2026 } from './data/birthdayRecords';
import LoadingPage from './components/LoadingPage/LoadingPage';
import './App.css';

const DEFAULT_ADMIN_PASSWORD = 'admin123';
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api/personnel'
  : '/api/personnel';
const HEALTHCHECK_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api/health'
  : '/api/health';
const ACTIVE_CACHE_KEY = 'ape-active-personnel-cache';
const ARCHIVED_CACHE_KEY = 'ape-archived-personnel-cache';
const BUNDLED_ACTIVE_RECORDS = Array.isArray(BIRTHDAY_RECORDS_2026) ? BIRTHDAY_RECORDS_2026 : [];

const CSV_HEADERS = [
  'id',
  'name',
  'age',
  'birthday',
  'gender',
  'designation',
  'unit',
  'agency',
  'bloodType',
  'lastMedicalDate',
  'findings',
  'medicalExamLocation',
  'physicalFitnessStatus',
  'height',
  'weight',
  'fitnessCapability',
  'scanFileName'
];

const escapeCsvValue = (value) => {
  const normalized = value == null ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const parseCsvLine = (line, delimiter = ',') => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

const normalizeImportedPersonnel = (row, rowIndex) => {
  const id = row.id?.trim() || `${Date.now()}-${rowIndex}`;
  const height = row.height?.trim() || 'N/A';
  const weight = row.weight?.trim() || 'N/A';
  const capability = row.fitnessCapability?.trim() || 'Personal Fitness 1: Fully Exercise';

  return {
    id,
    name: row.name?.trim() || `Imported Personnel ${rowIndex + 1}`,
    age: row.age?.trim() || 'N/A',
    birthday: row.birthday?.trim() || 'N/A',
    gender: row.gender?.trim() || 'Not Specified',
    designation: row.designation?.trim() || 'N/A',
    unit: row.unit?.trim() || 'N/A',
    agency: row.agency?.trim() || 'N/A',
    bloodType: row.bloodType?.trim() || 'N/A',
    lastMedicalDate: row.lastMedicalDate?.trim() || 'N/A',
    findings: row.findings?.trim() || 'Complete',
    medicalExamLocation: row.medicalExamLocation?.trim() || 'Unknown',
    physicalFitnessStatus: row.physicalFitnessStatus?.trim() || capability,
    physicalFitness: {
      height,
      weight,
      capability
    },
    scanFileName: row.scanFileName?.trim() || null,
    scanFileURL: null,
    history: []
  };
};

const exportPersonnelToCsv = (records) => {
  const rows = records.map((person) => ([
    person.id,
    person.name,
    person.age,
    person.birthday,
    person.gender,
    person.designation,
    person.unit,
    person.agency,
    person.bloodType,
    person.lastMedicalDate,
    person.findings,
    person.medicalExamLocation,
    person.physicalFitnessStatus,
    person.physicalFitness?.height,
    person.physicalFitness?.weight,
    person.physicalFitness?.capability,
    person.scanFileName
  ].map(escapeCsvValue).join(',')));

  return [CSV_HEADERS.join(','), ...rows].join('\n');
};

const parsePersonnelCsv = (csvText) => {
  const lines = csvText
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('The CSV file must include a header row and at least one data row. Use the "Export CSV" button to download a blank template first!');
  }

  const firstLine = lines[0].replace(/^\uFEFF/, '');

  // Auto-detect delimiter
  let delimiter = ',';
  if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  } else if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = '\t';
  }

  const headers = parseCsvLine(firstLine, delimiter).map((header) => header.trim());
  const missingHeaders = CSV_HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Invalid CSV format! The file is missing the following system columns: ${missingHeaders.join(', ')}`);
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line, delimiter);
    const row = headers.reduce((accumulator, header, index) => {
      accumulator[header] = values[index] ?? '';
      return accumulator;
    }, {});

    return normalizeImportedPersonnel(row, rowIndex);
  });
};

const getBirthdayMonthAndDay = (birthday) => {
  if (!birthday || birthday === 'N/A') return null;
  const normalized = String(birthday).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      monthIndex: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3])
    };
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    monthIndex: parsed.getMonth(),
    day: parsed.getDate()
  };
};

const getBirthdaysByMonth = (records) => {
  const monthNames = [
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

  return monthNames.map((month, monthIndex) => {
    const entries = records
      .map((person) => ({
        ...person,
        birthdayParts: getBirthdayMonthAndDay(person.birthday)
      }))
      .filter((person) => person.birthdayParts && person.birthdayParts.monthIndex === monthIndex)
      .sort((left, right) => left.birthdayParts.day - right.birthdayParts.day)
      .map((person) => ({
        id: person.id,
        name: person.name,
        birthday: person.birthday,
        day: person.birthdayParts.day,
        agency: person.agency || 'N/A',
        unit: person.unit || 'N/A'
      }));

    return {
      month,
      monthNumber: monthIndex + 1,
      count: entries.length,
      entries
    };
  });
};

const formatDateKey = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateKey = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return null;
  const [year, month, day] = String(dateStr).split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNextMedicalDate = (birthdayStr, lastMedicalStr) => {
  if (!birthdayStr || birthdayStr === 'N/A') return 'N/A';
  const bDate = new Date(birthdayStr);
  if (isNaN(bDate.getTime())) return 'N/A';

  const bMonth = bDate.getMonth();
  const bDay = bDate.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  let thisYearBday = new Date(currentYear, bMonth, bDay);

  let targetDate;
  if (lastMedicalStr && lastMedicalStr !== 'N/A') {
    const lastMed = new Date(lastMedicalStr);
    let minNext = new Date(lastMed.getFullYear(), lastMed.getMonth() + 10, lastMed.getDate());

    let testBday = new Date(minNext.getFullYear(), bMonth, bDay);
    if (testBday < minNext) {
      testBday = new Date(minNext.getFullYear() + 1, bMonth, bDay);
    }
    targetDate = testBday;
  } else {
    targetDate = today > thisYearBday ? thisYearBday : new Date(currentYear - 1, bMonth, bDay);
    const diff = new Date(currentYear, bMonth, bDay) - today;
    if (diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000) {
      targetDate = new Date(currentYear, bMonth, bDay);
    }
  }

  return formatDateKey(targetDate);
};

const getMedicalSchedule = (records) => records
  .map((person) => {
    const nextMedicalDate = getNextMedicalDate(person.birthday, person.lastMedicalDate);
    if (nextMedicalDate === 'N/A') {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = parseDateKey(nextMedicalDate);
    if (!targetDate) {
      return null;
    }
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    let status = 'Healthy';
    if (diffDays < 0) {
      status = 'Overdue';
    } else if (diffDays <= 30) {
      status = 'Due Soon';
    }

    return {
      id: person.id,
      name: person.name,
      unit: person.unit || 'N/A',
      agency: person.agency || 'N/A',
      nextMedicalDate,
      daysUntil: diffDays,
      status
    };
  })
  .filter(Boolean)
  .sort((left, right) => new Date(left.nextMedicalDate) - new Date(right.nextMedicalDate));

const readCachedRecords = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to read cache for ${key}:`, error);
    return [];
  }
};

const writeCachedRecords = (key, records) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    console.error(`Failed to write cache for ${key}:`, error);
  }
};

const checkBackendHealth = async () => {
  try {
    const res = await fetch(HEALTHCHECK_URL);
    const data = await res.json();
    return res.ok && data.server === 'online';
  } catch (error) {
    return false;
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [personnelList, setPersonnelList] = useState([]);
  const [archivedPersonnel, setArchivedPersonnel] = useState([]);
  const [deletedPersonnelLog, setDeletedPersonnelLog] = useState([]);
  const [birthdaysByMonth, setBirthdaysByMonth] = useState([]);
  const [medicalSchedule, setMedicalSchedule] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [dataSource, setDataSource] = useState('live');
  const [isLoading, setIsLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [showBirthdayNotifications, setShowBirthdayNotifications] = useState(false);
  const [showBirthdayWidget, setShowBirthdayWidget] = useState(true);
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    mode: null,
    title: '',
    description: '',
    nextView: null,
    currentPassword: '',
    newPassword: '',
    error: ''
  });

  const closePasswordModal = () => {
    setPasswordModal({
      isOpen: false,
      mode: null,
      title: '',
      description: '',
      nextView: null,
      currentPassword: '',
      newPassword: '',
      error: ''
    });
  };

  const handleViewChange = (nextView) => {
    if (nextView === 'personnel-trashbin' && currentUser?.role === 'admin') {
      setPasswordModal({
        isOpen: true,
        mode: 'unlock-trashbin',
        title: 'Archive Access',
        description: 'Enter the admin password to open the Personnel Trashbin.',
        nextView,
        currentPassword: '',
        newPassword: '',
        error: ''
      });
      return;
    }

    setCurrentView(nextView);
  };

  const handleChangeAdminPassword = () => {
    if (currentUser?.role !== 'admin') {
      return;
    }

    setPasswordModal({
      isOpen: true,
      mode: 'change-password',
      title: 'Change Admin Password',
      description: 'Update the admin password for this session only. This change is not saved locally.',
      nextView: null,
      currentPassword: '',
      newPassword: '',
      error: ''
    });
  };

  const submitPasswordModal = () => {
    if (passwordModal.mode === 'unlock-trashbin') {
      if (passwordModal.currentPassword !== adminPassword) {
        setPasswordModal((current) => ({ ...current, error: 'Invalid admin password.' }));
        return;
      }

      const nextView = passwordModal.nextView || 'personnel-trashbin';
      closePasswordModal();
      setCurrentView(nextView);
      return;
    }

    if (passwordModal.mode === 'change-password') {
      if (passwordModal.currentPassword !== adminPassword) {
        setPasswordModal((current) => ({ ...current, error: 'Current admin password is incorrect.' }));
        return;
      }

      const trimmedPassword = passwordModal.newPassword.trim();
      if (!trimmedPassword) {
        setPasswordModal((current) => ({ ...current, error: 'The new admin password cannot be empty.' }));
        return;
      }

      setAdminPassword(trimmedPassword);
      closePasswordModal();
      alert('Admin password updated for this session.');
    }
  };

  const replaceArchivedRecords = (records) => {
    const nextArchived = Array.isArray(records) ? records : [];
    setArchivedPersonnel(nextArchived);
    writeCachedRecords(ARCHIVED_CACHE_KEY, nextArchived);
  };

  const removeArchivedRecordFromCache = (id) => {
    setArchivedPersonnel((prev) => {
      const nextArchived = prev.filter((person) => person.id !== id);
      writeCachedRecords(ARCHIVED_CACHE_KEY, nextArchived);
      return nextArchived;
    });
  };

  const refreshArchivedFromServer = async () => {
    const archiveRes = await fetch(`${API_BASE_URL}/archived`);
    const archiveData = await archiveRes.json();

    if (!archiveRes.ok || archiveData.error) {
      throw new Error(archiveData.error || 'Failed to refresh Trashbin records');
    }

    replaceArchivedRecords(archiveData);
    return archiveData;
  };

  const fetchBackendData = useCallback(async () => {
    try {
      const [activeRes, archiveRes, deletedResult] = await Promise.all([
        fetch(API_BASE_URL),
        fetch(`${API_BASE_URL}/archived`),
        fetch(`${API_BASE_URL}/deleted`)
          .then(async (response) => {
            const data = await response.json();
            return { ok: response.ok, data };
          })
          .catch((error) => ({ ok: false, error }))
      ]);
      const activeData = await activeRes.json();
      const archiveData = await archiveRes.json();

      if (!activeRes.ok || !archiveRes.ok) {
        throw new Error(activeData.error || archiveData.error || 'Backend request failed');
      }

      if (!activeData.error) {
        setPersonnelList(activeData);
        writeCachedRecords(ACTIVE_CACHE_KEY, activeData);
      }
      if (!archiveData.error) {
        replaceArchivedRecords(archiveData);
      }
      if (deletedResult.ok && !deletedResult.data?.error) {
        setDeletedPersonnelLog(Array.isArray(deletedResult.data) ? deletedResult.data : []);
      }
      setBackendStatus('online');
      setDataSource('live');
      setTimeout(() => setIsLoading(false), 2000);
    } catch (err) {
      const cachedActive = readCachedRecords(ACTIVE_CACHE_KEY);
      const cachedArchived = readCachedRecords(ARCHIVED_CACHE_KEY);
      if (cachedActive.length || cachedArchived.length) {
        setPersonnelList(cachedActive);
        setArchivedPersonnel(cachedArchived);
        setDataSource('cache');
      } else if (BUNDLED_ACTIVE_RECORDS.length) {
        setPersonnelList(BUNDLED_ACTIVE_RECORDS);
        setArchivedPersonnel([]);
        writeCachedRecords(ACTIVE_CACHE_KEY, BUNDLED_ACTIVE_RECORDS);
        writeCachedRecords(ARCHIVED_CACHE_KEY, []);
        setDataSource('bundled');
      } else {
        setDataSource('empty');
      }
      setBackendStatus(await checkBackendHealth() ? 'online' : 'offline');
      setTimeout(() => setIsLoading(false), 2000);
      console.error("Failed to fetch from MongoDB backend:", err);
    }
  }, []);

  useEffect(() => {
    fetchBackendData();
    const refreshInterval = setInterval(() => {
      fetchBackendData();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchBackendData]);

  useEffect(() => {
    setMedicalSchedule(getMedicalSchedule(personnelList));
    setBirthdaysByMonth(getBirthdaysByMonth(personnelList));
  }, [personnelList]);

  const currentMonthNumber = new Date().getMonth() + 1;
  const currentBirthdayGroup = birthdaysByMonth.find((group) => group.monthNumber === currentMonthNumber) || null;
  const currentMonthBirthdays = currentBirthdayGroup?.entries || [];
  const currentMonthLabel = currentBirthdayGroup?.month || new Date().toLocaleString('en-US', { month: 'long' });

  useEffect(() => {
    if (currentView === 'personnel-list' || currentView === 'personnel-trashbin') {
      setIsSidebarOpen(false);
    }
  }, [currentView]);

  const addPersonnel = async (newPersonnel) => {
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPersonnel)
      });
      const updatedList = await res.json();
      if (!res.ok || updatedList.error) throw new Error(updatedList.error);
      setPersonnelList(updatedList);
      writeCachedRecords(ACTIVE_CACHE_KEY, updatedList);
      setBackendStatus('online');
      setDataSource('live');
    } catch (error) {
      setBackendStatus('offline');
      alert("Failed to add: " + error.message);
      console.error('Failed to add personnel', error);
    }
  };

  const deletePersonnel = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to move personnel to Trashbin');
      }
      setPersonnelList(prev => {
        const nextActive = prev.filter(p => p.id !== id);
        writeCachedRecords(ACTIVE_CACHE_KEY, nextActive);
        return nextActive;
      });
      setArchivedPersonnel(prev => {
        const alreadyExists = prev.some((person) => person.id === data.record?.id);
        const nextArchived = alreadyExists
          ? prev.map((person) => (person.id === data.record.id ? data.record : person))
          : [data.record, ...prev];
        writeCachedRecords(ARCHIVED_CACHE_KEY, nextArchived);
        return nextArchived;
      });
      setBackendStatus('online');
      setDataSource('live');
    } catch (error) {
      setBackendStatus('offline');
      console.error('Failed to delete personnel', error);
    }
  };

  const updatePersonnel = async (updatedPersonnel) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${updatedPersonnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPersonnel)
      });
      const updatedList = await res.json();
      if (!res.ok || updatedList.error) {
        throw new Error(updatedList.error || 'Failed to update personnel');
      }
      setPersonnelList(updatedList);
      writeCachedRecords(ACTIVE_CACHE_KEY, updatedList);
      setBackendStatus('online');
      setDataSource('live');
    } catch (error) {
      setBackendStatus('offline');
      console.error('Failed to update personnel', error);
    }
  };

  const importPersonnelCsv = (file) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const importedPersonnel = parsePersonnelCsv(reader.result);
        const res = await fetch(`${API_BASE_URL}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedPersonnel)
        });
        const updatedList = await res.json();

        if (!res.ok || updatedList.error) {
          throw new Error(updatedList.error || 'Failed to communicate with DB');
        }

        setPersonnelList(updatedList);
        writeCachedRecords(ACTIVE_CACHE_KEY, updatedList);
        setBackendStatus('online');
        setDataSource('live');
        alert(`Successfully imported or updated ${importedPersonnel.length} personnel records in MongoDB.`);
      } catch (error) {
        setBackendStatus('offline');
        console.error("Import error detail:", error);
        alert(error.message || 'Failed to import the CSV file to MongoDB.');
      }
    };

    reader.onerror = () => {
      alert('Unable to read the selected CSV file.');
    };

    reader.readAsText(file);
  };

  const exportPersonnelCsv = () => {
    const csvContent = exportPersonnelToCsv(personnelList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = downloadUrl;
    link.download = `ape-personnel-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const archivePersonnel = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}/archive`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setPersonnelList(prev => {
          const nextActive = prev.filter(p => p.id !== id);
          writeCachedRecords(ACTIVE_CACHE_KEY, nextActive);
          return nextActive;
        });
        setArchivedPersonnel(prev => {
          const nextArchived = [data.record, ...prev];
          writeCachedRecords(ARCHIVED_CACHE_KEY, nextArchived);
          return nextArchived;
        });
        setBackendStatus('online');
        setDataSource('live');
      }
    } catch (error) {
      setBackendStatus('offline');
      console.error('Failed to archive personnel', error);
    }
  };

  const unarchivePersonnel = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}/unarchive`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore personnel');
      }
      removeArchivedRecordFromCache(id);
      setPersonnelList(prev => {
        const nextActive = [data.record, ...prev];
        writeCachedRecords(ACTIVE_CACHE_KEY, nextActive);
        return nextActive;
      });
      setBackendStatus('online');
      setDataSource('live');
    } catch (error) {
      if (error.message === 'Personnel record not found') {
        try {
          await refreshArchivedFromServer();
          setBackendStatus('online');
          setDataSource('live');
          alert('This Trashbin item was no longer in the live database, so the list was refreshed to remove the stale cached record.');
          return;
        } catch (refreshError) {
          console.error('Failed to refresh Trashbin after restore miss', refreshError);
        }
      }
      setBackendStatus('offline');
      alert(error.message || 'Failed to restore personnel.');
      console.error('Failed to restore personnel', error);
    }
  };

  const deleteArchived = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete personnel from Trashbin');
      }
      setArchivedPersonnel(prev => {
        const nextArchived = prev.filter(p => p.id !== id);
        writeCachedRecords(ARCHIVED_CACHE_KEY, nextArchived);
        return nextArchived;
      });
      const deletedRes = await fetch(`${API_BASE_URL}/deleted`);
      const deletedResult = await deletedRes.json();
      if (deletedRes.ok && !deletedResult.error) {
        setDeletedPersonnelLog(Array.isArray(deletedResult) ? deletedResult : []);
      }
      setBackendStatus('online');
      setDataSource('live');
      alert('Record removed from Trashbin and stored in Deleted Archive.');
    } catch (error) {
      if (error.message === 'Personnel record not found') {
        try {
          await refreshArchivedFromServer();
          setBackendStatus('online');
          setDataSource('live');
          alert('This Trashbin item was no longer in the live database, so the list was refreshed to remove the stale cached record.');
          return;
        } catch (refreshError) {
          console.error('Failed to refresh Trashbin after delete miss', refreshError);
        }
      }
      setBackendStatus('offline');
      alert(error.message || 'Failed to delete personnel from Trashbin.');
      console.error('Failed to delete personnel from Trashbin', error);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} adminPassword={adminPassword} />;
  }

  return (
    <div className="App">
      <Sidebar
        currentView={currentView}
        setCurrentView={handleViewChange}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentUser={currentUser}
        onChangeAdminPassword={handleChangeAdminPassword}
        onLogout={() => {
          setCurrentUser(null);
          setCurrentView('dashboard');
        }}
      />

      <div className={`main-content ${isSidebarOpen ? '' : 'expanded'}`}>
        <div className="birthday-notification-shell">
          {showBirthdayWidget ? (
            <>
              <div className="birthday-widget-actions">
                <button
                  type="button"
                  className="birthday-widget-hide-btn"
                  onClick={() => {
                    setShowBirthdayNotifications(false);
                    setShowBirthdayWidget(false);
                  }}
                  title="Hide birthday widget"
                >
                  Hide
                </button>
              </div>
              <button
                type="button"
                className={`birthday-bell-btn ${showBirthdayNotifications ? 'open' : ''}`}
                onClick={() => setShowBirthdayNotifications((current) => !current)}
                title={`${currentMonthBirthdays.length} birthday notification${currentMonthBirthdays.length === 1 ? '' : 's'} for ${currentMonthLabel}`}
              >
                <span className="birthday-bell-icon">🎂</span>
                {currentMonthBirthdays.length > 0 && <span className="birthday-bell-count">{currentMonthBirthdays.length}</span>}
              </button>

              {showBirthdayNotifications && (
                <div className="birthday-popover">
                  <div className="birthday-popover-header">
                    <div>
                      <p className="birthday-popover-kicker">Monthly Birthday Notice</p>
                      <h3>{currentMonthLabel} Celebrators</h3>
                    </div>
                    <span className="birthday-popover-badge">{currentMonthBirthdays.length}</span>
                  </div>

                  {currentMonthBirthdays.length > 0 ? (
                    <div className="birthday-popover-list">
                      {currentMonthBirthdays
                        .slice()
                        .sort((left, right) => {
                          if (left.day !== right.day) return left.day - right.day;
                          return left.name.localeCompare(right.name);
                        })
                        .map((entry) => (
                          <div key={entry.id} className="birthday-popover-item">
                            <div className="birthday-popover-day">{String(entry.day).padStart(2, '0')}</div>
                            <div className="birthday-popover-meta">
                              <strong>{entry.name}</strong>
                              <span>{entry.agency} / {entry.unit}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="birthday-popover-empty">No birthdays recorded for {currentMonthLabel}.</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className="birthday-widget-show-btn"
              onClick={() => setShowBirthdayWidget(true)}
              title="Show birthday widget"
            >
              Show birthdays
            </button>
          )}
        </div>

        {(currentView === 'personnel-list' || currentView === 'personnel-trashbin') && (
          <button
            type="button"
            className="sidebar-visibility-btn"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            {isSidebarOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
        )}
        {currentView === 'dashboard' ? (
          <Dashboard
            personnelList={personnelList}
            archivedPersonnel={archivedPersonnel}
            deletedPersonnelLog={deletedPersonnelLog}
            medicalSchedule={medicalSchedule}
            onDeletePersonnel={deletePersonnel}
            onArchivePersonnel={archivePersonnel}
            onUnarchivePersonnel={unarchivePersonnel}
            onDeleteArchived={deleteArchived}
            onUpdatePersonnel={updatePersonnel}
            onImportCsv={importPersonnelCsv}
            onExportCsv={exportPersonnelCsv}
            currentUser={currentUser}
            backendStatus={backendStatus}
            dataSource={dataSource}
            viewMode="dashboard"
          />
        ) : currentView === 'personnel-list' || currentView === 'personnel-trashbin' ? (
          <Dashboard
            personnelList={personnelList}
            archivedPersonnel={archivedPersonnel}
            deletedPersonnelLog={deletedPersonnelLog}
            medicalSchedule={medicalSchedule}
            onDeletePersonnel={deletePersonnel}
            onArchivePersonnel={archivePersonnel}
            onUnarchivePersonnel={unarchivePersonnel}
            onDeleteArchived={deleteArchived}
            onUpdatePersonnel={updatePersonnel}
            onImportCsv={importPersonnelCsv}
            onExportCsv={exportPersonnelCsv}
            currentUser={currentUser}
            backendStatus={backendStatus}
            dataSource={dataSource}
            viewMode="personnel-list"
            initialShowArchived={currentView === 'personnel-trashbin'}
          />
        ) : currentView === 'calendar' ? (
          <CalendarView
            birthdaysByMonth={birthdaysByMonth}
            medicalSchedule={medicalSchedule}
          />
        ) : (
          <PatientForm onAddPersonnel={addPersonnel} navigateBack={() => setCurrentView('dashboard')} />
        )}
        <footer style={{ textAlign: 'center', padding: '25px 0 10px', color: '#64748b', fontSize: '0.85rem', marginTop: 'auto', width: '100%' }}>
          &copy; {new Date().getFullYear()} All rights reserved ALVER BITUIN
        </footer>
      </div>

      {passwordModal.isOpen && (
        <div className="app-modal-overlay" onClick={closePasswordModal}>
          <div className="app-modal-card password-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="password-modal-header">
              <span className="password-modal-kicker">Security Check</span>
              <h2>{passwordModal.title}</h2>
              <p>{passwordModal.description}</p>
            </div>

            <div className="password-modal-body">
              <label className="password-modal-label">
                {passwordModal.mode === 'change-password' ? 'Current Password' : 'Admin Password'}
              </label>
              <input
                type="password"
                className="password-modal-input"
                value={passwordModal.currentPassword}
                onChange={(event) => setPasswordModal((current) => ({ ...current, currentPassword: event.target.value, error: '' }))}
                placeholder="Enter password"
                autoFocus
              />

              {passwordModal.mode === 'change-password' && (
                <>
                  <label className="password-modal-label">New Password</label>
                  <input
                    type="password"
                    className="password-modal-input"
                    value={passwordModal.newPassword}
                    onChange={(event) => setPasswordModal((current) => ({ ...current, newPassword: event.target.value, error: '' }))}
                    placeholder="Enter new password"
                  />
                </>
              )}

              {passwordModal.error && <p className="password-modal-error">{passwordModal.error}</p>}
            </div>

            <div className="password-modal-actions">
              <button type="button" className="password-modal-btn secondary" onClick={closePasswordModal}>
                Cancel
              </button>
              <button type="button" className="password-modal-btn primary" onClick={submitPasswordModal}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
