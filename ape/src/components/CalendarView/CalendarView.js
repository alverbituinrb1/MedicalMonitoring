import React, { useMemo, useState } from 'react';
import './CalendarView.css';

const DEFAULT_ITEMS_PER_PAGE = 6;
const PAGE_SIZE_OPTIONS = [6, 10, 15];
const MONTH_CARD_LIMIT = 6;

const CalendarView = ({ birthdaysByMonth, medicalSchedule }) => {
  const currentMonthNumber = new Date().getMonth() + 1;
  const [activeTab, setActiveTab] = useState('medical');
  const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState(String(currentMonthNumber));
  const [medicalQuery, setMedicalQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [activeMedicalSection, setActiveMedicalSection] = useState('overdue');
  const [medicalPages, setMedicalPages] = useState({ overdue: 1, dueSoon: 1, upcoming: 1 });

  const normalizedMedicalSchedule = [...medicalSchedule].sort((left, right) => {
    if (left.daysUntil !== right.daysUntil) return left.daysUntil - right.daysUntil;
    return left.name.localeCompare(right.name);
  });

  const normalizedQuery = medicalQuery.trim().toLowerCase();
  const filteredMedicalSchedule = useMemo(() => {
    if (!normalizedQuery) return normalizedMedicalSchedule;

    return normalizedMedicalSchedule.filter((item) => {
      const searchableText = [item.name, item.agency, item.unit, item.nextMedicalDate]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedMedicalSchedule, normalizedQuery]);

  const scheduleGroups = {
    overdue: filteredMedicalSchedule.filter((item) => item.status === 'Overdue'),
    dueSoon: filteredMedicalSchedule.filter((item) => item.status === 'Due Soon'),
    upcoming: filteredMedicalSchedule.filter((item) => item.status === 'Healthy')
  };

  const medicalSectionConfigs = [
    {
      key: 'overdue',
      title: 'Overdue',
      subtitle: 'Immediate attention required for personnel past the target exam date.',
      dotClass: 'overdue',
      badgeClass: 'danger',
      variant: 'danger',
      emptyText: 'No overdue schedules found.',
      labelBuilder: () => 'Immediate action',
      timingBuilder: (item) => `${Math.abs(item.daysUntil)} days late`
    },
    {
      key: 'dueSoon',
      title: 'Due Soon',
      subtitle: 'Personnel that should be booked within the next 30 days.',
      dotClass: 'due-soon',
      badgeClass: 'warning',
      variant: 'warning',
      emptyText: 'No due-soon schedules found.',
      labelBuilder: () => 'Schedule soon',
      timingBuilder: (item) => `${item.daysUntil} days left`
    },
    {
      key: 'upcoming',
      title: 'Upcoming',
      subtitle: 'Personnel currently on schedule and not yet at risk.',
      dotClass: 'upcoming',
      badgeClass: 'safe',
      variant: 'neutral',
      emptyText: 'No upcoming schedules found.',
      labelBuilder: () => 'On track',
      timingBuilder: (item) => `${item.daysUntil} days ahead`
    }
  ];

  const activeMedicalConfig = medicalSectionConfigs.find((section) => section.key === activeMedicalSection) || medicalSectionConfigs[0];
  const activeMedicalItems = scheduleGroups[activeMedicalConfig.key] || [];

  const totalBirthdays = birthdaysByMonth.reduce((total, month) => total + month.count, 0);
  const normalizedBirthdayGroups = birthdaysByMonth.map((group) => ({
    ...group,
    entries: [...group.entries].sort((left, right) => {
      if (left.day !== right.day) return left.day - right.day;
      return left.name.localeCompare(right.name);
    })
  }));

  const orderedBirthdayGroups = [...normalizedBirthdayGroups].sort((left, right) => {
    const leftOffset = (left.monthNumber - currentMonthNumber + 12) % 12;
    const rightOffset = (right.monthNumber - currentMonthNumber + 12) % 12;
    return leftOffset - rightOffset;
  });

  const selectedBirthdayGroup = normalizedBirthdayGroups.find(
    (group) => String(group.monthNumber) === selectedBirthdayMonth
  ) || orderedBirthdayGroups[0] || null;

  const birthdayPreviewGroups = orderedBirthdayGroups.slice(0, MONTH_CARD_LIMIT);
  const nextBirthdayEntry = orderedBirthdayGroups
    .flatMap((group) => group.entries.map((entry) => ({ ...entry, month: group.month, monthNumber: group.monthNumber })))
    .sort((left, right) => {
      const leftOffset = ((left.monthNumber - currentMonthNumber + 12) % 12) * 100 + left.day;
      const rightOffset = ((right.monthNumber - currentMonthNumber + 12) % 12) * 100 + right.day;
      return leftOffset - rightOffset;
    })[0] || null;

  const handleMedicalPageChange = (key, nextPage, totalPages) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setMedicalPages((current) => ({
      ...current,
      [key]: safePage
    }));
  };

  const handleMedicalQueryChange = (event) => {
    setMedicalQuery(event.target.value);
    setMedicalPages({ overdue: 1, dueSoon: 1, upcoming: 1 });
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(Number(event.target.value));
    setMedicalPages({ overdue: 1, dueSoon: 1, upcoming: 1 });
  };

  const renderMedicalRow = (item, variant, label, timingText) => (
    <div key={item.id} className={`calendar-schedule-item ${variant}`}>
      <div className="schedule-item-primary">
        <div className="item-details">
          <div className="calendar-item-name">{item.name}</div>
          <div className="calendar-item-meta">{item.agency} • {item.unit}</div>
        </div>
      </div>
      <div className="schedule-item-secondary">
        <div className="schedule-item-block">
          <span className="calendar-item-date-label">Status</span>
          <span className={`schedule-status-pill ${variant}`}>{label}</span>
        </div>
        <div className="schedule-item-block">
          <span className="calendar-item-date-label">Exam Date</span>
          <div className="calendar-item-date">{item.nextMedicalDate}</div>
        </div>
        <div className="schedule-item-block urgency">
          <span className="calendar-item-date-label">Time Remaining</span>
          <span className={`calendar-days-late ${variant === 'neutral' ? 'neutral' : variant}`}>{timingText}</span>
        </div>
      </div>
    </div>
  );

  const renderMedicalSection = (key, title, subtitle, dotClass, badgeClass, items, emptyText, variant, labelBuilder, timingBuilder) => {
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    const currentPage = Math.min(medicalPages[key] || 1, totalPages);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pagedItems = items.slice(startIndex, startIndex + itemsPerPage);

    return (
      <section className={`calendar-schedule-section ${variant}`}>
        <div className="calendar-schedule-section-header">
          <div className="calendar-schedule-section-title">
            <span className={`dot ${dotClass}`}></span>
            <div>
              <h3>{title}</h3>
              <p>{subtitle}</p>
            </div>
          </div>
          <span className={`badge ${badgeClass}`}>{items.length}</span>
        </div>

        <div className="column-content">
          {pagedItems.length > 0
            ? pagedItems.map((item) => renderMedicalRow(item, variant, labelBuilder(item), timingBuilder(item)))
            : <div className="calendar-empty">{emptyText}</div>}
        </div>

        {items.length > itemsPerPage && (
          <div className="medical-pagination">
            <div className="medical-pagination-summary">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, items.length)} of {items.length}
            </div>
            <div className="medical-pagination-controls">
              <button
                type="button"
                className="medical-pagination-button"
                onClick={() => handleMedicalPageChange(key, currentPage - 1, totalPages)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="medical-pagination-current">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                className="medical-pagination-button"
                onClick={() => handleMedicalPageChange(key, currentPage + 1, totalPages)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="calendar-view fade-in">
      <div className="calendar-view-header">
        <div className="calendar-title-group">
          <p className="calendar-view-kicker">Schedule Management</p>
          <h1>Calendar Center</h1>
          <div className="calendar-title-badge">Operational planning dashboard</div>
        </div>
        <p className="calendar-view-copy">
          Review medical schedule deadlines and employee birthday records in a dedicated workspace.
        </p>
      </div>

      <div className="calendar-summary-grid">
        <div className="calendar-summary-card overdue">
          <div className="summary-icon" aria-hidden="true">AL</div>
          <div className="summary-info">
            <span className="calendar-summary-label">Overdue Medical</span>
            <strong>{scheduleGroups.overdue.length}</strong>
          </div>
        </div>
        <div className="calendar-summary-card due-soon">
          <div className="summary-icon" aria-hidden="true">30</div>
          <div className="summary-info">
            <span className="calendar-summary-label">Due Soon</span>
            <strong>{scheduleGroups.dueSoon.length}</strong>
          </div>
        </div>
        <div className="calendar-summary-card birthdays">
          <div className="summary-icon" aria-hidden="true">BD</div>
          <div className="summary-info">
            <span className="calendar-summary-label">Total Birthdays</span>
            <strong>{totalBirthdays}</strong>
          </div>
        </div>
      </div>

      <div className="calendar-tabs">
        <button
          type="button"
          className={`calendar-tab ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          Medical Schedule
        </button>
        <button
          type="button"
          className={`calendar-tab ${activeTab === 'birthdays' ? 'active' : ''}`}
          onClick={() => setActiveTab('birthdays')}
        >
          Birthday Calendar
        </button>
      </div>

      <div className="calendar-layout-wrapper">
        {activeTab === 'medical' && (
          <section className="calendar-panel fade-in">
            <div className="calendar-panel-header">
              <div>
                <h2>Medical Schedule Tracking</h2>
                <span className="panel-subtitle">Upcoming and pending evaluations</span>
              </div>
            </div>

            <div className="medical-insight-row">
              <div className="medical-insight-card overdue">
                <span className="medical-insight-label">Needs Immediate Action</span>
                <strong>{scheduleGroups.overdue.length}</strong>
                <p>Personnel whose target exam date has already passed.</p>
              </div>
              <div className="medical-insight-card due-soon">
                <span className="medical-insight-label">Due Within 30 Days</span>
                <strong>{scheduleGroups.dueSoon.length}</strong>
                <p>Personnel who should be scheduled very soon.</p>
              </div>
              <div className="medical-insight-card upcoming">
                <span className="medical-insight-label">On Track</span>
                <strong>{scheduleGroups.upcoming.length}</strong>
                <p>Personnel currently scheduled ahead of deadline.</p>
              </div>
            </div>

            <div className="medical-toolbar">
              <label className="medical-search-field">
                <span className="medical-toolbar-label">Search Personnel</span>
                <input
                  type="search"
                  className="medical-search-input"
                  placeholder="Search by name, agency, unit, or exam date"
                  value={medicalQuery}
                  onChange={handleMedicalQueryChange}
                />
              </label>

              <label className="medical-page-size-field">
                <span className="medical-toolbar-label">Rows Per Page</span>
                <select
                  className="medical-page-size-select"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            {normalizedQuery && (
              <div className="medical-filter-summary">
                Found {filteredMedicalSchedule.length} matching personnel for "{medicalQuery}".
              </div>
            )}

            <div className="medical-section-switcher">
              {medicalSectionConfigs.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  className={`medical-section-chip ${activeMedicalSection === section.key ? 'active' : ''} ${section.variant}`}
                  onClick={() => setActiveMedicalSection(section.key)}
                >
                  <span>{section.title}</span>
                  <strong>{scheduleGroups[section.key].length}</strong>
                </button>
              ))}
            </div>

            <div className="calendar-schedule-sections single-view">
              {renderMedicalSection(
                activeMedicalConfig.key,
                activeMedicalConfig.title,
                activeMedicalConfig.subtitle,
                activeMedicalConfig.dotClass,
                activeMedicalConfig.badgeClass,
                activeMedicalItems,
                activeMedicalConfig.emptyText,
                activeMedicalConfig.variant,
                activeMedicalConfig.labelBuilder,
                activeMedicalConfig.timingBuilder
              )}
            </div>
          </section>
        )}

        {activeTab === 'birthdays' && (
          <section className="calendar-panel fade-in">
            <div className="calendar-panel-header">
              <div>
                <h2>Employee Birthdays</h2>
                <span className="panel-subtitle">Monthly celebration tracker</span>
              </div>
            </div>

            <div className="birthday-filter-row">
              {birthdaysByMonth.map((group) => (
                <button
                  key={group.month}
                  type="button"
                  className={`birthday-filter-chip ${selectedBirthdayMonth === String(group.monthNumber) ? 'active' : ''}`}
                  onClick={() => setSelectedBirthdayMonth(String(group.monthNumber))}
                >
                  {group.month}
                </button>
              ))}
            </div>

            <div className="birthday-dashboard">
              <div className="birthday-overview-rail">
                <div className="birthday-spotlight-card">
                  <span className="birthday-spotlight-label">Selected Month</span>
                  <strong>{selectedBirthdayGroup?.month || 'No Month Selected'}</strong>
                  <p>
                    {selectedBirthdayGroup
                      ? `${selectedBirthdayGroup.count} celebrator${selectedBirthdayGroup.count === 1 ? '' : 's'} tracked.`
                      : 'Birthday data is not available.'}
                  </p>
                </div>

                <div className="birthday-spotlight-card upcoming">
                  <span className="birthday-spotlight-label">Next Celebrator</span>
                  <strong>{nextBirthdayEntry ? `${nextBirthdayEntry.month} ${String(nextBirthdayEntry.day).padStart(2, '0')}` : 'No records'}</strong>
                  <p>{nextBirthdayEntry ? nextBirthdayEntry.name : 'There are no upcoming birthdays to display.'}</p>
                </div>

                <div className="birthday-month-preview-grid">
                  {birthdayPreviewGroups.map((group) => (
                    <button
                      key={group.month}
                      type="button"
                      className={`birthday-month-preview ${selectedBirthdayMonth === String(group.monthNumber) ? 'active' : ''}`}
                      onClick={() => setSelectedBirthdayMonth(String(group.monthNumber))}
                    >
                      <span>{group.month}</span>
                      <strong>{group.count}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="calendar-month-card featured">
                <div className="calendar-month-header">
                  <div className="calendar-month-title">
                    <h3>{selectedBirthdayGroup?.month || 'Birthday Records'}</h3>
                    <p>
                      {selectedBirthdayGroup
                        ? `${selectedBirthdayGroup.count} celebrator${selectedBirthdayGroup.count === 1 ? '' : 's'}`
                        : 'No birthday records available'}
                    </p>
                  </div>
                  <span className="month-count">
                    {selectedBirthdayGroup ? String(selectedBirthdayGroup.monthNumber).padStart(2, '0') : '--'}
                  </span>
                </div>
                {selectedBirthdayGroup?.entries?.length ? (
                  <div className="calendar-month-list compact">
                    {selectedBirthdayGroup.entries.map((entry) => (
                      <div key={entry.id} className="calendar-month-entry">
                        <div className="calendar-month-day">{String(entry.day).padStart(2, '0')}</div>
                        <div className="entry-details">
                          <div className="calendar-item-name">{entry.name}</div>
                          <div className="calendar-item-meta">{entry.agency} • {entry.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="calendar-empty">No birthdays recorded for this month.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
