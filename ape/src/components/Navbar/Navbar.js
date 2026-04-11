import React from 'react';
import './Navbar.css';

const Navbar = ({
  currentView,
  setCurrentView,
  isSidebarOpen,
  setIsSidebarOpen,
  currentUser,
  onLogout
}) => {
  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
      )
    },
    { 
      id: 'calendar', 
      label: 'Calendar', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    }
  ];

  if (currentUser?.role === 'admin') {
    navItems.push({ 
      id: 'form', 
      label: 'Add Personnel', 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
      )
    });
  }

  return (
    <aside className={`navbar-container ${!isSidebarOpen ? 'collapsed' : ''}`}>
      {/* HEADER */}
      <div className="navbar-header">
        <div className="navbar-brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          {isSidebarOpen && <span className="brand-text">APE MONITORING</span>}
        </div>

        <button
          className="toggle-btn"
          onClick={() => setIsSidebarOpen(prev => !prev)}
          title={isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isSidebarOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="navbar-links">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-link ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setCurrentView(item.id)}
            title={!isSidebarOpen ? item.label : undefined}
          >
            <span className="icon">{item.icon}</span>
            {isSidebarOpen && <span className="link-text">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="navbar-footer">
        <div className="user-profile-compact">
          <div className="avatar">{currentUser?.name?.charAt(0).toUpperCase() || 'U'}</div>
          {isSidebarOpen && (
            <div className="user-info">
              <span className="user-name">{currentUser?.name || 'User'}</span>
              <span className="user-role">{currentUser?.role === 'admin' ? 'Administrator' : 'Medical Staff'}</span>
            </div>
          )}
        </div>
        
        <button
          className="nav-link logout-btn"
          onClick={onLogout}
          title={!isSidebarOpen ? "Logout" : undefined}
        >
          <span className="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg-icon">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </span>
          {isSidebarOpen && <span className="link-text">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Navbar;