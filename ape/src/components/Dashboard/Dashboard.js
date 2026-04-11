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

const Dashboard = ({
  personnelList,
  archivedPersonnel,
  birthdaysByMonth,
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
  dataSource
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Both');
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editFindings, setEditFindings] = useState('Complete');
  const [editPhysical, setEditPhysical] = useState({ height: '', weight: '' });
  const [editFitnessCategory, setEditFitnessCategory] = useState('Auto');
  const [editPhysicalFitnessStatus, setEditPhysicalFitnessStatus] = useState('Personal Fitness 1: Fully Exercise');
  const [editMedicalExamLocation, setEditMedicalExamLocation] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [sortArchived, setSortArchived] = useState('newest');
  const [showSummary, setShowSummary] = useState(false);
  const tableSectionRef = useRef(null);
  const birthdayGroups = birthdaysByMonth || [];
  const nextMedicalSchedules = medicalSchedule || [];

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

  const filteredPatients = showArchived ? sortedArchived.map(p => ({
    ...p,
    computedStatus: getMedicalStatus(p.birthday, p.lastMedicalDate),
    nextMedicalDate: getNextMedicalDate(p.birthday, p.lastMedicalDate)
  })) : personnelWithStatus.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesMonth = true;
    if (filterMonth !== 'All' && patient.birthday && patient.birthday !== 'N/A') {
      const bDate = new Date(patient.birthday);
      if (!isNaN(bDate.getTime())) {
        const mm = String(bDate.getMonth() + 1).padStart(2, '0');
        matchesMonth = mm === filterMonth;
      }
    } else if (filterMonth !== 'All') {
      matchesMonth = false;
    }

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
  }).sort((a, b) => a.name.localeCompare(b.name));

  const healthyCount = personnelWithStatus.filter(p => p.computedStatus === 'Healthy').length;
  const dueSoonCount = personnelWithStatus.filter(p => p.computedStatus === 'Due Soon').length;
  const overdueCount = personnelWithStatus.filter(p => p.computedStatus === 'Overdue').length;
  const dueSoonSchedules = nextMedicalSchedules.filter((item) => item.status === 'Due Soon');
  const overdueSchedules = nextMedicalSchedules.filter((item) => item.status === 'Overdue');
  const upcomingSchedules = nextMedicalSchedules.filter((item) => item.status === 'Healthy').slice(0, 6);

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

  const handleStatusCardClick = (status) => {
    setFilterStatus((current) => (current === status ? 'Both' : status));
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
          <button 
            className="minimal-select"
            onClick={() => setShowArchived(!showArchived)}
            style={{ background: showArchived ? '#4ade80' : '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {showArchived ? 'View Current Records' : 'View Trashbin (Archive)'}
          </button>

          {!showArchived && currentUser?.role === 'admin' && (
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

              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
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

      {!showArchived && currentUser?.role === 'admin' && (
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

      {false && !showArchived && (
        <div className="birthday-overview">
          <div className="birthday-overview-header">
            <h2>Birthday Calendar</h2>
            <p>All birthdays from January to December, grouped by month.</p>
          </div>
          <div className="birthday-grid">
            {birthdayGroups.map((group) => (
              <div key={group.month} className="birthday-card">
                <div className="birthday-card-header">
                  <h3>{group.month}</h3>
                  <span>{group.count}</span>
                </div>
                {group.entries.length > 0 ? (
                  <div className="birthday-list">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="birthday-entry">
                        <div className="birthday-day">{entry.day}</div>
                        <div className="birthday-meta">
                          <div className="birthday-name">{entry.name}</div>
                          <div className="birthday-subtext">{entry.agency} • {entry.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="birthday-empty">No birthdays recorded.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={tableSectionRef} className="records-section-header">
        <div>
          <p className="panel-kicker">{showArchived ? 'Trashbin' : 'Records Table'}</p>
          <h2>{showArchived ? 'Trashbin Records' : (filterStatus !== 'Both' ? `${filterStatus} Personnel` : (searchTerm ? 'Search Results' : 'Personnel List'))}</h2>
        </div>
        <p className="records-section-copy">
          {showArchived
            ? 'Review archived employee files separately from active personnel.'
            : (filterStatus !== 'Both' ? `Currently filtered to show only ${filterStatus} records.` : 'Showing all personnel records from the live system.')}
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
            {filteredPatients.length > 0 ? (
              filteredPatients.map(patient => {
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
                            onClick={() => setPatientToDelete(patient)}
                            title="Delete Permanently"
                          >
                            Delete Forever
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

      {!showArchived && (
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
      )}      {/* Delete Confirmation Modal */}
      {patientToDelete && (
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
