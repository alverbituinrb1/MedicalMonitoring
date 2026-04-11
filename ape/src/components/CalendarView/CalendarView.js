import React, { useState } from 'react';
import './CalendarView.css';

const CalendarView = ({ birthdaysByMonth, medicalSchedule }) => {
  const [activeTab, setActiveTab] = useState('medical');
  const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState('All');
  const currentMonthNumber = new Date().getMonth() + 1;
  const normalizedMedicalSchedule = [...medicalSchedule].sort((left, right) => {
    if (left.daysUntil !== right.daysUntil) return left.daysUntil - right.daysUntil;
    return left.name.localeCompare(right.name);
  });

  const scheduleGroups = {
    overdue: normalizedMedicalSchedule.filter((item) => item.status === 'Overdue'),
    dueSoon: normalizedMedicalSchedule.filter((item) => item.status === 'Due Soon'),
    upcoming: normalizedMedicalSchedule.filter((item) => item.status === 'Healthy').slice(0, 12)
  };

  const totalBirthdays = birthdaysByMonth.reduce((total, month) => total + month.count, 0);
  const normalizedBirthdayGroups = birthdaysByMonth.map((group) => ({
    ...group,
    entries: [...group.entries].sort((left, right) => {
      if (left.day !== right.day) return left.day - right.day;
      return left.name.localeCompare(right.name);
    })
  }));
  const displayedBirthdayGroups = (selectedBirthdayMonth === 'All'
    ? normalizedBirthdayGroups
    : normalizedBirthdayGroups.filter((group) => String(group.monthNumber) === selectedBirthdayMonth))
    .sort((left, right) => {
      if (selectedBirthdayMonth !== 'All') return left.monthNumber - right.monthNumber;
      const leftOffset = (left.monthNumber - currentMonthNumber + 12) % 12;
      const rightOffset = (right.monthNumber - currentMonthNumber + 12) % 12;
      return leftOffset - rightOffset;
    });

  return (
    <div className="calendar-view fade-in">
      <div className="calendar-view-header">
        <div className="calendar-title-group">
          <p className="calendar-view-kicker">Schedule Management</p>
          <h1>Calendar Center</h1>
        </div>
        <p className="calendar-view-copy">
          Review medical schedule deadlines and employee birthday records in a dedicated workspace.
        </p>
      </div>

      <div className="calendar-summary-grid">
        <div className="calendar-summary-card overdue">
          <div className="summary-icon">⚠️</div>
          <div className="summary-info">
            <span className="calendar-summary-label">Overdue Medical</span>
            <strong>{scheduleGroups.overdue.length}</strong>
          </div>
        </div>
        <div className="calendar-summary-card due-soon">
          <div className="summary-icon">⏳</div>
          <div className="summary-info">
            <span className="calendar-summary-label">Due Soon</span>
            <strong>{scheduleGroups.dueSoon.length}</strong>
          </div>
        </div>
        <div className="calendar-summary-card birthdays">
          <div className="summary-icon">🎂</div>
          <div className="summary-info">
            <span className="calendar-summary-label">Total Birthdays</span>
            <strong>{totalBirthdays}</strong>
          </div>
        </div>
      </div>

      <div className="calendar-tabs">
        <button 
          className={`calendar-tab ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          🏥 Medical Schedule
        </button>
        <button 
          className={`calendar-tab ${activeTab === 'birthdays' ? 'active' : ''}`}
          onClick={() => setActiveTab('birthdays')}
        >
          🎂 Birthday Calendar
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

            <div className="calendar-schedule-columns">
              <div className="calendar-schedule-column">
                <div className="column-header">
                  <span className="dot overdue"></span>
                  <h3>Overdue</h3>
                  <span className="badge danger">{scheduleGroups.overdue.length}</span>
                </div>
                <div className="column-content">
                  {scheduleGroups.overdue.length > 0 ? scheduleGroups.overdue.map((item) => (
                    <div key={item.id} className="calendar-schedule-item danger">
                      <div className="item-details">
                        <div className="calendar-item-name">{item.name}</div>
                        <div className="calendar-item-meta">{item.agency} • {item.unit}</div>
                      </div>
                      <div className="item-action">
                        <div className="calendar-item-date">{item.nextMedicalDate}</div>
                        <div className="calendar-days-late">{Math.abs(item.daysUntil)} days late</div>
                      </div>
                    </div>
                  )) : <div className="calendar-empty">No overdue schedules.</div>}
                </div>
              </div>

              <div className="calendar-schedule-column">
                <div className="column-header">
                  <span className="dot due-soon"></span>
                  <h3>Due Soon</h3>
                  <span className="badge warning">{scheduleGroups.dueSoon.length}</span>
                </div>
                <div className="column-content">
                  {scheduleGroups.dueSoon.length > 0 ? scheduleGroups.dueSoon.map((item) => (
                    <div key={item.id} className="calendar-schedule-item warning">
                      <div className="item-details">
                        <div className="calendar-item-name">{item.name}</div>
                        <div className="calendar-item-meta">{item.agency} • {item.unit}</div>
                      </div>
                      <div className="item-action">
                        <div className="calendar-item-date">{item.nextMedicalDate}</div>
                        <div className="calendar-days-late">{item.daysUntil} days left</div>
                      </div>
                    </div>
                  )) : <div className="calendar-empty">No due-soon schedules.</div>}
                </div>
              </div>

              <div className="calendar-schedule-column">
                <div className="column-header">
                  <span className="dot upcoming"></span>
                  <h3>Upcoming</h3>
                  <span className="badge safe">{scheduleGroups.upcoming.length}</span>
                </div>
                <div className="column-content">
                  {scheduleGroups.upcoming.length > 0 ? scheduleGroups.upcoming.map((item) => (
                    <div key={item.id} className="calendar-schedule-item neutral">
                      <div className="item-details">
                        <div className="calendar-item-name">{item.name}</div>
                        <div className="calendar-item-meta">{item.agency} • {item.unit}</div>
                      </div>
                      <div className="item-action">
                        <div className="calendar-item-date">{item.nextMedicalDate}</div>
                        <div className="calendar-days-late neutral">{item.daysUntil} days ahead</div>
                      </div>
                    </div>
                  )) : <div className="calendar-empty">No upcoming schedules.</div>}
                </div>
              </div>
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
              <button
                type="button"
                className={`birthday-filter-chip ${selectedBirthdayMonth === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedBirthdayMonth('All')}
              >
                All Months
              </button>
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

            <div className="calendar-birthday-grid">
              {displayedBirthdayGroups.map((group) => (
                <div key={group.month} className="calendar-month-card">
                  <div className="calendar-month-header">
                    <div className="calendar-month-title">
                      <h3>{group.month}</h3>
                      <p>{group.count} celebrator{group.count === 1 ? '' : 's'}</p>
                    </div>
                    <span className="month-count">{String(group.monthNumber).padStart(2, '0')}</span>
                  </div>
                  {group.entries.length > 0 ? (
                    <div className="calendar-month-list">
                      {group.entries.map((entry) => (
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
                    <div className="calendar-empty">No birthdays recorded.</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
