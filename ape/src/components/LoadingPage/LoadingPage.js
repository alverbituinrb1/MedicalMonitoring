import React, { useEffect, useState } from 'react';
import './LoadingPage.css';

const LoadingPage = () => {
  const [loadingText, setLoadingText] = useState('Initializing Systems');

  useEffect(() => {
    const texts = [
      'Initializing Systems...',
      'Connecting to Medical Database...',
      'Fetching Personnel Records...',
      'Syncing Health Statuses...',
      'Almost Ready...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-page-container">
      <div className="loading-content">
        <div className="loading-icon-container">
          <div className="loading-glow"></div>
          <div className="loading-cross-wrapper">
            <div className="medical-cross"></div>
          </div>
          <svg className="loading-spinner-svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" className="spinner-track"></circle>
            <circle cx="50" cy="50" r="45" className="spinner-indicator"></circle>
          </svg>
        </div>
        <h2 className="loading-title">MEDCAR MONITORING</h2>
        <p className="loading-subtitle">{loadingText}</p>
        <div className="loading-progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
