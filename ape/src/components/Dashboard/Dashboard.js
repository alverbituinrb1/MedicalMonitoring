import React, { useRef, useState } from 'react';
import './Dashboard.css';
import { calculateFitness } from '../PatientForm/PatientForm';

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
  today.setHours(0,0,0,0);
  
  const currentYear = today.getFullYear();
  let thisYearBday = new Date(currentYear, bMonth, bDay);
  
  let targetDate;
  if (lastMedicalStr && lastMedicalStr !== 'N/A') {
    const lastMed = new Date(lastMedicalStr);
    // An exam covers them for approx 10 months. Find the first birthday after 10 months.
    let minNext = new Date(lastMed.getFullYear(), lastMed.getMonth() + 10, lastMed.getDate());
    
    let testBday = new Date(minNext.getFullYear(), bMonth, bDay);
    if (testBday < minNext) {
       testBday = new Date(minNext.getFullYear() + 1, bMonth, bDay);
    }
    targetDate = testBday;
  } else {
    // If no record, they are due for the birthday that just passed (or today)
    targetDate = today > thisYearBday ? thisYearBday : new Date(currentYear - 1, bMonth, bDay);
    // If the next one is super close (within 30 days), let's target that.
    const diff = new Date(currentYear, bMonth, bDay) - today;
    if (diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000) {
      targetDate = new Date(currentYear, bMonth, bDay);
    }
  }

  return formatDateKey(targetDate);
};

const getMedicalStatus = (birthdayStr, lastMedicalStr) => {
  if (!birthdayStr || birthdayStr === 'N/A') return 'Unknown';
  const nextDateStr = getNextMedicalDate(birthdayStr, lastMedicalStr);
  if (!nextDateStr || nextDateStr === 'N/A') return 'Unknown';
  
  const nextDate = parseDateKey(nextDateStr);
  if (!nextDate) return 'Unknown';
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const diffTime = nextDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 30) return 'Due Soon';
  return 'Healthy';
};

const getExamReminder = (birthdayStr, lastMedicalStr) => {
  const nextDateStr = getNextMedicalDate(birthdayStr, lastMedicalStr);
  if (!nextDateStr || nextDateStr === 'N/A') {
    return { message: 'Next medical exam schedule is unknown.', level: 'neutral' };
  }
  const nextDate = parseDateKey(nextDateStr);
  if (!nextDate) {
    return { message: 'Next medical exam schedule is unknown.', level: 'neutral' };
  }
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const diffTime = nextDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { message: `Medical exam was overdue by ${Math.abs(diffDays)} days.`, level: 'urgent' };
  } else if (diffDays <= 30) {
    return { message: `Medical exam is due in ${diffDays} days.`, level: 'warning' };
  } else {
    return { message: `Next medical exam is scheduled for ${nextDateStr}.`, level: 'neutral' };
  }
};

const getFitStatus = (findings) => {
  if (findings === 'Pending') return { label: 'Pending Clearance', color: '#facc15' }; 
  return { label: 'Fit to Work', color: '#4ade80' };
};

const getFitnessBadge = (capability) => {
  if (!capability) return { label: 'Unknown', color: '#94a3b8' };
  if (capability.includes('Not Qualified')) return { label: 'Not Qualified', color: '#ef4444' };
  if (capability.includes('Fitness 2')) return { label: 'Fitness 2', color: '#facc15' };
  return { label: 'Fitness 1', color: '#4ade80' };
};

const monthNumberFromBirthday = (birthday) => {
  if (!birthday || birthday === 'N/A') return null;
  const normalized = String(birthday).trim();

  // Birthday values are stored as YYYY-MM-DD. Read the month directly so
  // timezone conversion cannot shift records into the previous month.
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return isoMatch[2];
  }

  const parsed = parseDateKey(normalized) || new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return String(parsed.getMonth() + 1).padStart(2, '0');
};

const birthdayDayFromBirthday = (birthday) => {
  if (!birthday || birthday === 'N/A') return null;
  const normalized = String(birthday).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return Number(isoMatch[3]);
  }

  const parsed = parseDateKey(normalized) || new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getDate();
};

const monthNumberFromDateValue = (dateValue) => {
  if (!dateValue || dateValue === 'N/A') return null;
  const parsed = parseDateKey(String(dateValue).trim()) || new Date(String(dateValue).trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return String(parsed.getMonth() + 1).padStart(2, '0');
};

const Dashboard = ({
  personnelList,
  archivedPersonnel,
  deletedPersonnelLog,
  medicalSchedule,
  onDeletePersonnel,
  onArchivePersonnel,
  onUnarchivePersonnel,
  onDeleteArchived,
  onUpdatePersonnel,
  onImportCsv,
  onExportCsv,
  currentUser,
  backendStatus,
  dataSource,
  viewMode = 'dashboard',
  initialShowArchived = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Both');
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [selectedDeletedEntry, setSelectedDeletedEntry] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editFindings, setEditFindings] = useState('Complete');
  const [editPhysical, setEditPhysical] = useState({ height: '', weight: '' });
  const [editFitnessCategory, setEditFitnessCategory] = useState('Auto');
  const [editPhysicalFitnessStatus, setEditPhysicalFitnessStatus] = useState('Personal Fitness 1: Fully Exercise');
  const [editMedicalExamLocation, setEditMedicalExamLocation] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [showArchived, setShowArchived] = useState(initialShowArchived);
  const [sortArchived, setSortArchived] = useState('newest');
  const [showSummary, setShowSummary] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tableSectionRef = useRef(null);
  const nextMedicalSchedules = medicalSchedule || [];
  const deletedLogEntries = Array.isArray(deletedPersonnelLog) ? deletedPersonnelLog : [];
  const ITEMS_PER_PAGE = 15;

  const getProfiles = (personnel) => {
    if (!personnel) return [];
    const past = personnel.history || [];
    const current = {
      date: personnel.lastMedicalDate,
      findings: personnel.findings,
      labTests: personnel.labTests,
      scanFileName: personnel.scanFileName,
      scanFileURL: personnel.scanFileURL,
      physicalFitness: personnel.physicalFitness || { bloodPressure: 'N/A', heartRate: 'N/A', height: 'N/A', weight: 'N/A', capability: 'Profile Fitness 1: Fully Exercise' },
      physicalFitnessStatus: personnel.physicalFitnessStatus || (personnel.physicalFitness?.capability || 'Personal Fitness 1: Fully Exercise')
    };
    return [...past, current];
  };
  const deletedEntryProfiles = selectedDeletedEntry
    ? getProfiles(selectedDeletedEntry.payload || {}).filter((profile) => profile && (profile.date || profile.findings || profile.scanFileURL || profile.medicalExamLocation || profile.physicalFitness))
    : [];

  // Compute displayed list
  const displayedList = showArchived ? archivedPersonnel : personnelList;
  const sortedArchived = showArchived ? [...archivedPersonnel].sort((a, b) => {
    const dateA = new Date(a.lastMedicalDate || '1970-01-01');
    const dateB = new Date(b.lastMedicalDate || '1970-01-01');
    return sortArchived === 'newest' ? dateB - dateA : dateA - dateB;
  }) : [];

  const [fullViewImage, setFullViewImage] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);

  // Compute stats
  const personnelWithStatus = displayedList.map(p => ({
    ...p,
    computedStatus: getMedicalStatus(p.birthday, p.lastMedicalDate),
    nextMedicalDate: getNextMedicalDate(p.birthday, p.lastMedicalDate)
  }));

  const currentYear = new Date().getFullYear();
  const baseYears = [];
  for (let y = 2024; y <= currentYear; y++) {
    baseYears.push(y.toString());
  }

  const availableYears = Array.from(
    new Set([
      ...baseYears,
      ...displayedList
        .map(p => {
          if (!p.lastMedicalDate || p.lastMedicalDate === 'N/A') return null;
          const d = new Date(p.lastMedicalDate);
          return isNaN(d.getTime()) ? null : String(d.getFullYear());
        })
        .filter(y => y)
    ])
  ).sort((a, b) => b - a);

  const isScheduleMonthMode = viewMode !== 'personnel-list' && filterStatus !== 'Both';

  const filteredPatients = showArchived ? sortedArchived.map(p => ({
    ...p,
    computedStatus: getMedicalStatus(p.birthday, p.lastMedicalDate),
    nextMedicalDate: getNextMedicalDate(p.birthday, p.lastMedicalDate)
  })) : personnelWithStatus.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth === 'All'
      ? true
      : (isScheduleMonthMode
        ? monthNumberFromDateValue(patient.nextMedicalDate) === filterMonth
        : monthNumberFromBirthday(patient.birthday) === filterMonth);

    let matchesYear = true;
    if (filterYear !== 'All') {
      if (patient.lastMedicalDate && patient.lastMedicalDate !== 'N/A') {
        const lDate = new Date(patient.lastMedicalDate);
        if (!isNaN(lDate.getTime())) {
          matchesYear = String(lDate.getFullYear()) === filterYear;
        } else {
          matchesYear = false;
        }
      } else {
        matchesYear = false;
      }
    }

    let matchesStatus = true;
    if (filterStatus !== 'Both') {
      matchesStatus = patient.computedStatus === filterStatus;
    }

    return matchesSearch && matchesMonth && matchesYear && matchesStatus;
  }).sort((a, b) => {
    if (filterMonth !== 'All') {
      const leftDay = birthdayDayFromBirthday(a.birthday) ?? 99;
      const rightDay = birthdayDayFromBirthday(b.birthday) ?? 99;
      if (leftDay !== rightDay) return leftDay - rightDay;
    }
    return a.name.localeCompare(b.name);
  });

  const healthyCount = personnelWithStatus.filter(p => p.computedStatus === 'Healthy').length;
  const dueSoonCount = personnelWithStatus.filter(p => p.computedStatus === 'Due Soon').length;
  const overdueCount = personnelWithStatus.filter(p => p.computedStatus === 'Overdue').length;
  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / ITEMS_PER_PAGE));
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const dueSoonSchedules = nextMedicalSchedules.filter((item) => item.status === 'Due Soon');
  const overdueSchedules = nextMedicalSchedules.filter((item) => item.status === 'Overdue');
  const upcomingSchedules = nextMedicalSchedules.filter((item) => item.status === 'Healthy').slice(0, 6);
  const statusFocusedPersonnel = filterStatus === 'Both'
    ? []
    : personnelWithStatus
      .filter((person) => person.computedStatus === filterStatus)
      .filter((person) => filterMonth === 'All' || monthNumberFromDateValue(person.nextMedicalDate) === filterMonth)
      .sort((a, b) => {
        if (filterMonth !== 'All') {
          const leftDay = parseDateKey(a.nextMedicalDate)?.getDate() ?? 99;
          const rightDay = parseDateKey(b.nextMedicalDate)?.getDate() ?? 99;
          if (leftDay !== rightDay) return leftDay - rightDay;
        }
        return a.name.localeCompare(b.name);
      });

  const handleUpdateRecord = () => {
    if (!editDate) {
      alert("Please select the new medical date.");
      return;
    }

    // Archive the old record
    const archiveRecord = {
      date: selectedPersonnel.lastMedicalDate,
      findings: selectedPersonnel.findings || 'Complete',
      medicalExamLocation: selectedPersonnel.medicalExamLocation || 'Unknown',
      scanFileName: selectedPersonnel.scanFileName,
      scanFileURL: selectedPersonnel.scanFileURL,
      physicalFitness: selectedPersonnel.physicalFitness || { height: 'N/A', weight: 'N/A' }
    };

    const updatedHistory = selectedPersonnel.history ? [...selectedPersonnel.history] : [];
    
    // Only archive if there was actually a previous valid date (not 'N/A' or empty)
    if (archiveRecord.date && archiveRecord.date !== 'N/A') {
      updatedHistory.push(archiveRecord);
    }

    const updated = {
      ...selectedPersonnel,
      lastMedicalDate: editDate,
      findings: editFindings,
      physicalFitness: { 
        ...editPhysical, 
        capability: editFitnessCategory === 'Auto' ? calculateFitness(editPhysical.height, editPhysical.weight) : editFitnessCategory
      },
      physicalFitnessStatus: editPhysicalFitnessStatus === 'Auto'
        ? (calculateFitness(editPhysical.height, editPhysical.weight))
        : editPhysicalFitnessStatus,
      medicalExamLocation: editMedicalExamLocation || 'Unknown',
      scanFileName: editFile ? editFile.name : selectedPersonnel.scanFileName,
      scanFileURL: editFile ? editFile.url : selectedPersonnel.scanFileURL,
      history: updatedHistory
    };
    onUpdatePersonnel(updated);
    setSelectedPersonnel(null);
    setActiveProfile(null);
    setIsEditMode(false);
    setEditDate('');
    setEditFile(null);
    setEditFitnessCategory('Auto');
  };

  const jumpToPersonnelList = () => {
    window.requestAnimationFrame(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  React.useEffect(() => {
    if (viewMode === 'personnel-list') {
      jumpToPersonnelList();
    }
  }, [viewMode]);

  React.useEffect(() => {
    setShowArchived(initialShowArchived);
  }, [initialShowArchived]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMonth, filterYear, filterStatus, showArchived, viewMode]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleStatusCardClick = (status) => {
    setFilterStatus((current) => (current === status ? 'Both' : status));
    jumpToPersonnelList();
  };

  const handleMonthFilterChange = (value) => {
    setFilterMonth(value);
    jumpToPersonnelList();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title-block">
          <p className="dashboard-eyebrow">Employee Medical Dashboard</p>
          <h1>{showArchived ? 'Archived Personnel Records' : 'Personnel Overview'}</h1>
          <div className={`backend-status-chip backend-status-${backendStatus || 'checking'}`}>
            <span className="backend-status-dot" />
            <span>
              Backend {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking'}
            </span>
          </div>
        </div>
        <div className="filters-container">
          {!showArchived && currentUser?.role === 'admin' && (
            <>
              {false && (
                <>
              <label 
                className="minimal-select" 
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px outset rgba(255, 255, 255, 0.2)', cursor: 'pointer', display: 'inline-block' }}
                title="Upload personnel list from CSV to MongoDB"
              >
                📥 Import CSV
                <input 
                  type="file" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onImportCsv(e.target.files[0]);
                      e.target.value = '';
                    }
                  }} 
                />
              </label>

              <button 
                className="minimal-select" 
                onClick={onExportCsv}
                style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px outset rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}
                title="Download current personnel list as CSV"
              >
                📤 Export CSV
              </button>

                </>
              )}

              <select
                value={filterMonth}
                onChange={(e) => handleMonthFilterChange(e.target.value)}
                className="minimal-select"
              >
                <option value="All">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="minimal-select"
              >
                <option value="All">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>



              <div className="search-wrapper static">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search personnel..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </>
          )}
          {!showArchived && currentUser?.role !== 'admin' && (
            <>
              <select
                value={filterMonth}
                onChange={(e) => handleMonthFilterChange(e.target.value)}
                className="minimal-select"
              >
                <option value="All">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="minimal-select"
              >
                <option value="All">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <div className="search-wrapper static">
                <span className="search-icon">Filter</span>
                <input
                  type="text"
                  placeholder="Search personnel..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </>
          )}
          {showArchived && (
            <select
              value={sortArchived}
              onChange={(e) => setSortArchived(e.target.value)}
              className="minimal-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          )}
        </div>
      </div>

      {!showArchived && (
        <div className="storage-banner">
          <strong>MongoDB record storage</strong>
          <span>
            {backendStatus === 'online'
              ? 'Personnel records are connected to the live backend and synced through MongoDB.'
              : dataSource === 'cache'
                ? 'Live backend is unavailable right now, but the latest saved personnel list from this device is still loaded.'
                : dataSource === 'bundled'
                  ? 'Live backend is unavailable, so the system loaded the bundled personnel list and saved it locally on this device.'
                : backendStatus === 'offline'
                  ? 'The backend is currently unreachable, and no saved personnel cache is available yet on this device.'
                  : 'Checking backend connection before syncing personnel records.'}
          </span>
        </div>
      )}

      {!showArchived && currentUser?.role === 'admin' && viewMode !== 'personnel-list' && (
        <div className="stats-grid" style={{ cursor: 'pointer' }}>
          <div 
            className="stat-card healthy"
            style={{ opacity: filterStatus === 'Both' || filterStatus === 'Healthy' ? 1 : 0.4, transition: '0.3s', outline: filterStatus === 'Healthy' ? '2px solid #4ade80' : 'none' }}
            onClick={() => handleStatusCardClick('Healthy')}
            title="Click to filter by Healthy"
          >
            <span className="stat-title">Healthy (Completed)</span>
            <span className="stat-value" style={{ color: '#4ade80' }}>{healthyCount}</span>
          </div>
          <div 
            className="stat-card due"
            style={{ opacity: filterStatus === 'Both' || filterStatus === 'Due Soon' ? 1 : 0.4, transition: '0.3s', outline: filterStatus === 'Due Soon' ? '2px solid #facc15' : 'none' }}
            onClick={() => handleStatusCardClick('Due Soon')}
            title="Click to filter by Due Soon"
          >
            <span className="stat-title">Due Soon</span>
            <span className="stat-value" style={{ color: '#facc15' }}>{dueSoonCount}</span>
          </div>
          <div 
            className="stat-card overdue"
            style={{ opacity: filterStatus === 'Both' || filterStatus === 'Overdue' ? 1 : 0.4, transition: '0.3s', outline: filterStatus === 'Overdue' ? '2px solid #ef4444' : 'none' }}
            onClick={() => handleStatusCardClick('Overdue')}
            title="Click to filter by Overdue"
          >
            <span className="stat-title">Overdue</span>
            <span className="stat-value" style={{ color: '#ef4444' }}>{overdueCount}</span>
          </div>
        </div>
      )}

      {!showArchived && viewMode !== 'personnel-list' && filterStatus !== 'Both' && (
        <section className="overview-panel focused-status-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Focused List</p>
              <h2>{filterMonth !== 'All' ? `${filterStatus} ${new Date(`2000-${filterMonth}-01`).toLocaleString('en-US', { month: 'long' })} Schedule` : `${filterStatus} Personnel`}</h2>
            </div>
            <span className={`panel-badge ${filterStatus === 'Overdue' ? 'status-badge-pill danger' : filterStatus === 'Due Soon' ? 'status-badge-pill warning' : 'status-badge-pill safe'}`}>
              {statusFocusedPersonnel.length} records
            </span>
          </div>
          <p className="panel-description">
            {filterMonth !== 'All'
              ? `Showing ${filterStatus} personnel whose next medical date falls in ${new Date(`2000-${filterMonth}-01`).toLocaleString('en-US', { month: 'long' })}.`
              : filterStatus === 'Overdue'
                ? 'Personnel whose medical exam target date has already passed.'
                : filterStatus === 'Due Soon'
                  ? 'Personnel who need attention within the next 30 days.'
                  : 'Personnel currently marked healthy and on schedule.'}
          </p>
          <div className="focused-status-list">
            {statusFocusedPersonnel.length > 0 ? (
              statusFocusedPersonnel.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={`focused-status-item ${person.computedStatus.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => {
                    setSelectedPersonnel(person);
                    const profiles = getProfiles(person);
                    setActiveProfile(profiles.length > 0 ? profiles[profiles.length - 1] : null);
                    setEditPhysicalFitnessStatus(person.physicalFitnessStatus || person.physicalFitness?.capability || 'Personal Fitness 1: Fully Exercise');
                    setEditFitnessCategory('Auto');
                  }}
                >
                  <div className="focused-status-main">
                    <strong>{person.name}</strong>
                    <span>{person.agency || 'N/A'} / {person.unit || 'N/A'}</span>
                  </div>
                  <div className="focused-status-side">
                    <span>{person.nextMedicalDate}</span>
                    <small>{person.findings || 'Complete'}</small>
                  </div>
                </button>
              ))
            ) : (
              <div className="calendar-empty">No personnel match this status right now.</div>
            )}
          </div>
        </section>
      )}

      {viewMode === 'personnel-list' && (
        <>
          {showArchived && (
            <section className="overview-panel deleted-log-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Deleted History</p>
                  <h2>Trashbin History</h2>
                </div>
                <span className="panel-badge">{deletedLogEntries.length} logged</span>
              </div>
              <p className="panel-description">
                This section keeps a review trail of personnel stored in Trashbin so previous medical records can still be reviewed.
              </p>
              <div className="deleted-log-list">
                {deletedLogEntries.length > 0 ? (
                  deletedLogEntries.map((entry) => {
                    const payload = entry.payload || {};
                    const deletedAt = entry.deletedAt ? new Date(entry.deletedAt) : null;
                    const isMedicalUpdateSnapshot = entry.reason === 'medical-update';
                    return (
                      <div key={entry._id || `${entry.originalId}-${entry.deletedAt}`} className="deleted-log-item">
                        <div className="deleted-log-main">
                          <strong>{payload.name || 'Unknown Personnel'}</strong>
                          <span>
                            #{entry.originalId} / {payload.agency || 'N/A'} / {payload.unit || 'N/A'}
                            {isMedicalUpdateSnapshot ? ' / Previous medical version' : ''}
                          </span>
                        </div>
                        <div className="deleted-log-side">
                          <span>{deletedAt ? deletedAt.toLocaleString() : 'Unknown time'}</span>
                          <small>{payload.lastMedicalDate || 'No medical date recorded'}</small>
                          <button
                            type="button"
                            className="action-btn deleted-log-view-btn"
                            onClick={() => {
                              const payload = entry.payload || {};
                              const profiles = getProfiles(payload);
                              setSelectedDeletedEntry(entry);
                              setActiveProfile(profiles.length > 0 ? profiles[profiles.length - 1] : null);
                            }}
                          >
                            {isMedicalUpdateSnapshot ? 'View Previous Record' : 'View Deleted Record'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="calendar-empty">No permanently deleted personnel recorded yet.</div>
                )}
              </div>
            </section>
          )}

          <div ref={tableSectionRef} className="records-section-header">
            <div>
              <p className="panel-kicker">{showArchived ? 'Trashbin' : 'Personnel List'}</p>
              <h2>{showArchived ? 'Trashbin Records' : (filterMonth !== 'All' ? `${new Date(`2000-${filterMonth}-01`).toLocaleString('en-US', { month: 'long' })} Birthdays` : (filterStatus !== 'Both' ? `${filterStatus} Personnel` : (searchTerm ? 'Search Results' : 'Personnel List')))}</h2>
            </div>
            <p className="records-section-copy">
              {showArchived
                ? 'Review archived employee files separately from active personnel.'
                : (filterMonth !== 'All'
                  ? `Showing personnel whose birthdays fall in ${new Date(`2000-${filterMonth}-01`).toLocaleString('en-US', { month: 'long' })}.`
                  : (filterStatus !== 'Both' ? `Currently filtered to show only ${filterStatus} records.` : 'Showing all personnel records from the live system.'))}
            </p>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Gender</th>
                  <th>Last Medical Exam</th>
                  <th>Fitness Level</th>
                  <th>Physical Fitness Status</th>
                  <th>Fitness Category</th>
                  <th>Next Exam</th>
                  <th>Medical Status</th>
                  <th>Findings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.length > 0 ? (
                  paginatedPatients.map(patient => {
                    const fitnessBadge = getFitnessBadge(patient.physicalFitness?.capability);
                    const scheduleReminder = getExamReminder(patient.birthday, patient.lastMedicalDate);
                    return (
                      <tr key={patient.id}>
                        <td style={{ color: '#94a3b8' }}>#{patient.id}</td>
                        <td style={{ fontWeight: 500, color: '#fff' }}>{patient.name}</td>
                        <td>{patient.gender}</td>
                        <td>{patient.lastMedicalDate || 'N/A'}</td>
                        <td>
                          <span style={{ color: fitnessBadge.color, fontWeight: 700, fontSize: '0.9rem' }}>
                            {fitnessBadge.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
                            {patient.physicalFitnessStatus || patient.physicalFitness?.capability || 'Not Assessed'}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 600 }}>
                            {patient.physicalFitness?.capability || 'Not Assessed'}
                          </span>
                        </td>
                        <td>
                          <div>{patient.nextMedicalDate}</div>
                          {scheduleReminder.level !== 'info' && (
                            <div style={{ marginTop: '6px', color: scheduleReminder.level === 'overdue' ? '#f87171' : '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>
                              {scheduleReminder.level === 'overdue' ? 'Overdue' : 'Upcoming'}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge status-${patient.computedStatus.replace(/\s+/g, '-').toLowerCase()}`}>
                            {patient.computedStatus}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: patient.findings === 'Pending' ? '#facc15' : '#4ade80', fontSize: '0.9rem', fontWeight: 600 }}>
                            {patient.findings || 'Complete'}
                          </span>
                          <div style={{ fontSize: '0.75rem', marginTop: '4px', color: getFitStatus(patient.findings || 'Complete').color, border: `1px solid ${getFitStatus(patient.findings || 'Complete').color}`, display: 'inline-block', padding: '1px 6px', borderRadius: '4px' }}>
                            {getFitStatus(patient.findings || 'Complete').label}
                          </div>
                        </td>
                        <td>
                          <button
                            className="action-btn"
                            onClick={() => {
                               setSelectedPersonnel(patient);
                               const profiles = getProfiles(patient);
                               setActiveProfile(profiles.length > 0 ? profiles[profiles.length - 1] : null);
                               setEditPhysicalFitnessStatus(patient.physicalFitnessStatus || patient.physicalFitness?.capability || 'Personal Fitness 1: Fully Exercise');
                               setEditFitnessCategory('Auto');
                            }}
                          >
                            View Record
                          </button>
                          {!showArchived && currentUser?.role === 'admin' && (
                            <button
                              className="action-btn archive-btn"
                              style={{ marginLeft: '10px', background: '#f87171', color: '#fff' }}
                              onClick={() => onArchivePersonnel(patient.id)}
                              title="Move to Trash"
                            >
                              Trash Record
                            </button>
                          )}
                          {showArchived && currentUser?.role === 'admin' && (
                            <>
                              <button
                                className="action-btn"
                                style={{ marginLeft: '10px', background: '#4ade80', color: '#000' }}
                                onClick={() => onUnarchivePersonnel(patient.id)}
                                title="Restore Record"
                              >
                                Restore
                              </button>
                              <button
                                className="action-btn delete-btn"
                                style={{ marginLeft: '10px' }}
                                onClick={() => {
                                  const confirmed = window.confirm(`Permanently delete ${patient.name || 'this record'} from Trashbin? This cannot be undone.`);
                                  if (confirmed) {
                                    onDeleteArchived(patient.id);
                                  }
                                }}
                                title="Permanently Delete Record"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                      {searchTerm ? `No personnel found matching "${searchTerm}"` : 'No personnel found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredPatients.length > 0 && (
            <div className="pagination-bar">
              <span className="pagination-summary">
                Page {currentPage} of {totalPages} / {filteredPatients.length} records
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="minimal-select pagination-btn"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                    .map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`minimal-select pagination-btn ${page === currentPage ? 'active-page' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                </span>
                <button
                  type="button"
                  className="minimal-select pagination-btn"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!showArchived && viewMode !== 'personnel-list' && (
        <div className="dashboard-overview-grid">

          <section className="overview-panel summary-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="panel-kicker">Overview</p>
                <h2>Medical records summary</h2>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="panel-badge">{personnelList.length} active</span>
                <button 
                  onClick={() => setShowSummary(!showSummary)}
                  className="minimal-select"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  {showSummary ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {showSummary && (
              <>
                <p className="panel-description">
                  A quick summary of current record volume and examination workload for the medical team.
                </p>
                <div className="summary-list">
                  <div className="summary-row">
                    <span className="summary-label">Active personnel records</span>
                    <strong className="summary-value">{personnelList.length}</strong>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Archived records</span>
                    <strong className="summary-value">{archivedPersonnel.length}</strong>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Due within 30 days</span>
                    <strong className="summary-value summary-warning">{dueSoonSchedules.length}</strong>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Currently overdue</span>
                    <strong className="summary-value summary-danger">{overdueSchedules.length}</strong>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Scheduled and on track</span>
                    <strong className="summary-value summary-safe">{upcomingSchedules.length}</strong>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {selectedPersonnel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedPersonnel.name} <span style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: 500 }}>#{selectedPersonnel.id}</span></h2>
              <button className="close-btn" onClick={() => { setSelectedPersonnel(null); setActiveProfile(null); setIsEditMode(false); }}>✕</button>
            </div>
            
            <div className="modal-tabs">
              {getProfiles(selectedPersonnel).map((profile, index) => (
                <button 
                  key={index}
                  className={`tab-btn ${activeProfile === profile ? 'active' : ''}`}
                  onClick={() => { setActiveProfile(profile); setIsEditMode(false); }}
                >
                  {profile.date || 'Current Record'}
                </button>
              ))}
              {!showArchived && currentUser?.role === 'admin' && (
                <button 
                  className={`tab-btn add-new-btn ${isEditMode ? 'active' : ''}`}
                  onClick={() => { setIsEditMode(true); setActiveProfile(null); }}
                >
                  + Update Record
                </button>
              )}
            </div>

            {isEditMode ? (
              <div className="edit-record-form">
                <h3>Update Medical Information</h3>
                <div className="form-group">
                  <label className="form-label">Date of Medical Exam</label>
                  <input type="date" className="premium-input" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Medical Summary / Findings</label>
                  <textarea 
                    className="premium-input" 
                    rows="4" 
                    value={editFindings} 
                    onChange={e => setEditFindings(e.target.value)}
                    placeholder="Enter detailed medical findings, notes, or status (e.g. Complete, Pending, specific conditions...)"
                    style={{ resize: 'vertical', minHeight: '100px', lineHeight: '1.5' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fitness Category (Capability)</label>
                  <select className="premium-select" value={editFitnessCategory} onChange={(e) => setEditFitnessCategory(e.target.value)}>
                    <option value="Auto">Auto-calculate from BMI</option>
                    <option value="Profile Fitness 1: Fully Exercise">Profile Fitness 1: Fully Exercise</option>
                    <option value="Fitness 2: Partial Exercise">Fitness 2: Partial Exercise</option>
                    <option value="Not Qualified">Not Qualified</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Physical Fitness Status</label>
                  <select className="premium-select" value={editPhysicalFitnessStatus} onChange={(e) => setEditPhysicalFitnessStatus(e.target.value)}>
                    <option value="Auto">Auto-calculate from BMI</option>
                    <option value="Personal Fitness 1: Fully Exercise">Personal Fitness 1: Fully Exercise</option>
                    <option value="Personal Fitness 2: Partial Exercise">Personal Fitness 2: Partial Exercise</option>
                    <option value="Not Qualified">Not Qualified</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Medical Exam Location</label>
                  <input type="text" className="premium-input" placeholder="e.g. Health Clinic" value={editMedicalExamLocation} onChange={(e) => setEditMedicalExamLocation(e.target.value)} />
                </div>
                <div className="stats-input-grid">
                  <div className="form-group">
                    <label className="form-label">Height (cm)</label>
                    <input type="number" className="premium-input" placeholder="cm" value={editPhysical.height} onChange={(e) => setEditPhysical({ ...editPhysical, height: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input type="number" className="premium-input" placeholder="kg" value={editPhysical.weight} onChange={(e) => setEditPhysical({ ...editPhysical, weight: e.target.value })} />
                  </div>
                </div>
                {/* Note: File upload simplified here depending on previous setup */}
                <div className="file-upload-wrapper">
                  <input type="file" className="file-upload-input" onChange={(e) => {
                     const file = e.target.files[0];
                     if (file) {
                       const url = URL.createObjectURL(file);
                       setEditFile({ name: file.name, url: url });
                     }
                  }} />
                  <div style={{ color: '#60a5fa', fontWeight: 600 }}>{editFile ? editFile.name : 'Click or drag a file to upload Medical Exam Scan'}</div>
                </div>
                
                <div className="action-buttons">
                  <button className="btn-secondary" onClick={() => setIsEditMode(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleUpdateRecord}>Save Record</button>
                </div>
              </div>
            ) : activeProfile ? (
              <div className="modal-details">
                <div className="detail-card">
                  <h3>Personal Information</h3>
                  <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{selectedPersonnel.name}</span></div>
                  <div className="detail-row"><span className="detail-label">Gender</span><span className="detail-value">{selectedPersonnel.gender}</span></div>
                  <div className="detail-row"><span className="detail-label">Birthday</span><span className="detail-value">{selectedPersonnel.birthday}</span></div>
                  <div className="detail-row"><span className="detail-label">Age</span><span className="detail-value">{selectedPersonnel.age}</span></div>
                  <div className="detail-row"><span className="detail-label">Designation</span><span className="detail-value">{selectedPersonnel.designation}</span></div>
                  <div className="detail-row"><span className="detail-label">Unit/Office</span><span className="detail-value">{selectedPersonnel.unit}</span></div>
                  <div className="detail-row"><span className="detail-label">Agency</span><span className="detail-value">{selectedPersonnel.agency}</span></div>
                  <div className="detail-row"><span className="detail-label">Blood Type</span><span className="detail-value">{selectedPersonnel.bloodType || 'N/A'}</span></div>
                </div>
                <div className="detail-card">
                  <h3>Medical Summary</h3>
                  <div className="detail-row"><span className="detail-label">Medical Date</span><span className="detail-value">{activeProfile.date || 'N/A'}</span></div>
                  <div className="detail-row" style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span className="detail-label">Location</span>
                    <span className="detail-value" style={{ textAlign: 'right', paddingLeft: '30px', maxWidth: '70%', wordBreak: 'break-word', lineHeight: '1.4' }}>
                      {activeProfile.medicalExamLocation || selectedPersonnel.medicalExamLocation || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="vitals-grid" style={{ marginBottom: '20px' }}>
                    <div className="vital-box"><span className="label">Height (cm)</span><span className="value">{activeProfile.physicalFitness?.height || 'N/A'}</span></div>
                    <div className="vital-box"><span className="label">Weight (kg)</span><span className="value">{activeProfile.physicalFitness?.weight || 'N/A'}</span></div>
                    <div className="vital-box"><span className="label">Total BMI</span><span className="value">{
                      (activeProfile.physicalFitness?.height && activeProfile.physicalFitness?.height !== 'N/A' && activeProfile.physicalFitness?.weight && activeProfile.physicalFitness?.weight !== 'N/A')
                        ? (parseFloat(activeProfile.physicalFitness.weight) / Math.pow(parseFloat(activeProfile.physicalFitness.height) / 100, 2)).toFixed(1)
                        : 'N/A'
                    }</span></div>
                  </div>

                  <div className="detail-row"><span className="detail-label">Fitness Status</span><span className="detail-value" style={{ color: '#fbbf24' }}>{activeProfile.physicalFitnessStatus || activeProfile.physicalFitness?.capability || 'N/A'}</span></div>
                  <div className="detail-row"><span className="detail-label">Capability Category</span><span className="detail-value" style={{ color: '#60a5fa' }}>{activeProfile.physicalFitness?.capability || 'N/A'}</span></div>
                  
                  <div className="findings-block" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '20px' }}>
                    <span className="detail-label" style={{ display: 'block', marginBottom: '10px', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Notes & Findings</span>
                    <div style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontStyle: activeProfile.findings ? 'normal' : 'italic' }}>
                      {activeProfile.findings || 'No detailed findings recorded.'}
                    </div>
                  </div>
                </div>
                {activeProfile.scanFileURL && (
                  <div className="detail-card" style={{ gridColumn: '1 / -1' }}>
                    <h3>Medical Document Scan</h3>
                    <div className="scan-preview-container" onClick={() => setFullViewImage(activeProfile.scanFileURL)} style={{ cursor: 'pointer', maxWidth: '300px' }}>
                      <img src={activeProfile.scanFileURL} alt="Medical Scan" className="scan-image" />
                      <div className="ai-scan-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <span className="ai-scan-text" style={{ textShadow: 'none', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '8px', color: '#fff', animation: 'none' }}>Click to Expand</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                No records to display.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDeletedEntry && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedDeletedEntry.payload?.name || 'Deleted Personnel'} <span style={{ color: '#94a3b8', fontSize: '1.2rem', fontWeight: 500 }}>#{selectedDeletedEntry.originalId}</span></h2>
              <button className="close-btn" onClick={() => { setSelectedDeletedEntry(null); setActiveProfile(null); }}>×</button>
            </div>

            <div className="modal-tabs">
              {deletedEntryProfiles.length > 0 ? deletedEntryProfiles.map((profile, index) => (
                <button
                  key={`${selectedDeletedEntry.originalId}-${index}`}
                  className={`tab-btn ${activeProfile === profile ? 'active' : ''}`}
                  onClick={() => setActiveProfile(profile)}
                >
                  {profile.date || `Record ${index + 1}`}
                </button>
              )) : (
                <button className="tab-btn active" type="button">Deleted Snapshot</button>
              )}
            </div>

            <div className="modal-details">
              <div className="detail-card">
                <h3>Deleted Personnel Info</h3>
                <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{selectedDeletedEntry.payload?.name || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Gender</span><span className="detail-value">{selectedDeletedEntry.payload?.gender || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Birthday</span><span className="detail-value">{selectedDeletedEntry.payload?.birthday || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Age</span><span className="detail-value">{selectedDeletedEntry.payload?.age || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Agency</span><span className="detail-value">{selectedDeletedEntry.payload?.agency || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Unit</span><span className="detail-value">{selectedDeletedEntry.payload?.unit || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Deleted At</span><span className="detail-value">{selectedDeletedEntry.deletedAt ? new Date(selectedDeletedEntry.deletedAt).toLocaleString() : 'Unknown time'}</span></div>
                <div className="detail-row"><span className="detail-label">Source</span><span className="detail-value">{selectedDeletedEntry.deletedFromArchive ? 'Trashbin / Archived' : 'Active Records'}</span></div>
              </div>

              <div className="detail-card">
                <h3>Medical Record Snapshot</h3>
                <div className="detail-row"><span className="detail-label">Last Medical Date</span><span className="detail-value">{selectedDeletedEntry.payload?.lastMedicalDate || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Location</span><span className="detail-value">{selectedDeletedEntry.payload?.medicalExamLocation || 'Unknown'}</span></div>
                <div className="detail-row"><span className="detail-label">Findings</span><span className="detail-value">{selectedDeletedEntry.payload?.findings || 'Complete'}</span></div>
                <div className="detail-row"><span className="detail-label">Fitness Status</span><span className="detail-value">{selectedDeletedEntry.payload?.physicalFitnessStatus || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Capability</span><span className="detail-value">{selectedDeletedEntry.payload?.physicalFitness?.capability || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Height</span><span className="detail-value">{selectedDeletedEntry.payload?.physicalFitness?.height || 'N/A'}</span></div>
                <div className="detail-row"><span className="detail-label">Weight</span><span className="detail-value">{selectedDeletedEntry.payload?.physicalFitness?.weight || 'N/A'}</span></div>
                <div className="findings-block" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '20px' }}>
                  <span style={{ display: 'block', marginBottom: '10px', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Previous Medical Notes</span>
                  <div style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {selectedDeletedEntry.payload?.findings || 'No detailed findings recorded.'}
                  </div>
                </div>
              </div>

              <div className="detail-card" style={{ gridColumn: '1 / -1', minHeight: 'unset' }}>
                <h3>Previous Medical History</h3>
                {Array.isArray(selectedDeletedEntry.payload?.history) && selectedDeletedEntry.payload.history.length > 0 ? (
                  <div className="deleted-history-list">
                    {selectedDeletedEntry.payload.history.map((record, index) => (
                      <div key={`${selectedDeletedEntry.originalId}-history-${index}`} className="deleted-history-item">
                        <strong>{record.date || `History ${index + 1}`}</strong>
                        <span>{record.medicalExamLocation || 'Unknown'} / {record.findings || 'No notes'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="calendar-empty">No previous medical history recorded for this deleted personnel.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {false && patientToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>⚠️</div>
            <h2 style={{fontSize: '1.8rem', color:'#fff'}}>Confirm Deletion</h2>
            <p style={{ margin: '15px 0', color: '#e2e8f0', fontSize: '1.05rem', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong>{patientToDelete.name}</strong>?
            </p>
            <p style={{ color: '#ef4444', fontSize: '0.95rem', marginBottom: '25px', fontWeight: 600 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setPatientToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
                onClick={() => {
                  if (showArchived) {
                    onDeleteArchived(patientToDelete.id);
                  } else {
                    onDeletePersonnel(patientToDelete.id);
                  }
                  setPatientToDelete(null);
                }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Overlay */}
      {fullViewImage && (
        <div className="fullscreen-overlay" onClick={() => setFullViewImage(null)}>
          <div className="fullscreen-content-wrapper">
            <button className="fullscreen-close" onClick={() => setFullViewImage(null)}>✕</button>
            <img src={fullViewImage} alt="Full View Medical Certificate" className="fullscreen-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
