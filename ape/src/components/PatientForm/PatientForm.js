import React, { useState } from 'react';
import './PatientForm.css';

const tabs = [
  { id: 'name', label: 'Name' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'age', label: 'Age' },
  { id: 'gender', label: 'Gender' },
  { id: 'employment', label: 'Employment Info' },
  { id: 'physical', label: 'Vital Signs & Fitness' },
  { id: 'lastMedical', label: 'Last Exam' },
  { id: 'scan', label: 'Scan (JPG/PNG)' }
];

export const getBMI = (heightCm, weightKg) => {
  const height = parseFloat(heightCm);
  const weight = parseFloat(weightKg);
  if (!height || !weight || height <= 0) return null;
  const heightM = height / 100;
  return weight / (heightM * heightM);
};

export const calculateFitness = (h, w) => {
  if (!h || !w) {
    return 'Personal Fitness 1: Fully Exercise';
  }

  const bmi = getBMI(h, w);
  if (bmi === null) return 'Personal Fitness 1: Fully Exercise';

  if (bmi < 18.5) return 'Not Qualified / Personal Fitness 3: Underweight - Not capable to do the fitness required';
  if (bmi >= 18.5 && bmi < 25) return 'Personal Fitness 1: Fully Exercise';
  if (bmi >= 25 && bmi < 30) return 'Personal Fitness 2: Overweight - Push up, Sit up, Light Weight Exercises';
  return 'Not Qualified / Personal Fitness 3: Obese - Not capable to do the fitness required';
};

export const getVitalStatus = (type, val, extraVal = null) => {
  if (!val || val === 'N/A') return null;
  if (type === 'height') {
    const h = parseFloat(val);
    if (isNaN(h)) return null;
    if (h < 120 || h > 220) return { label: 'Out of Standard', color: '#ef4444' };
    return { label: 'Standard', color: '#4ade80' };
  }
  if (type === 'weight') {
    const w = parseFloat(val);
    const h = parseFloat(extraVal) / 100;
    if (isNaN(w)) return null;
    if (!isNaN(h) && h > 0) {
      const bmi = w / (h * h);
      if (bmi >= 30 || bmi < 18.5) return { label: 'Out of Standard', color: '#ef4444' };
      return { label: 'Standard', color: '#4ade80' };
    }
    return null;
  }
  if (type === 'bmi') {
    const bmi = parseFloat(val);
    if (isNaN(bmi)) return null;
    if (bmi < 18.5 || bmi >= 30) return { label: 'Out of Standard', color: '#ef4444' };
    return { label: 'Standard', color: '#4ade80' };
  }
  return null;
};

const PatientForm = ({ onAddPersonnel, navigateBack }) => {
  const [activeTab, setActiveTab] = useState('name');
  const [isScanning, setIsScanning] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthday: '',
    age: '',
    gender: '',
    designation: '',
    unit: '',
    agency: '',
    bloodType: '',
    height: '',
    weight: '',
    fitnessStatus: 'Personal Fitness 1: Fully Exercise',
    lastMedicalDate: '',
    findings: 'Complete',
    medicalExamLocation: '',
    scanFileName: null,
    scanFileURL: null,
  });

  // Calculate age when birthday changes
  const handleBirthdayChange = (e) => {
    const bdate = e.target.value;
    setFormData({ ...formData, birthday: bdate });
    
    if (bdate) {
      const birthDateObj = new Date(bdate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        calculatedAge--;
      }
      setFormData(prev => ({ ...prev, age: calculatedAge >= 0 ? calculatedAge : '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Auto-fill height and weight when BP and HR are entered - removed, now manual
  // useEffect(() => {
  //   if (formData.bloodPressure && formData.heartRate && !formData.height && !formData.weight) {
  //     setFormData(prev => ({
  //       ...prev,
  //       height: '170',
  //       weight: '70'
  //     }));
  //   }
  // }, [formData.bloodPressure, formData.heartRate]);

  const handleGenderSelect = (gender) => {
    setFormData({ ...formData, gender });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid JPG or PNG medical certificate file.");
        return;
      }

      const lowerFileName = file.name.toLowerCase();
      const medicalKeywords = ['medical', 'record', 'scan', 'report', 'xray', 'ecg', 'ultrasound', 'lab', 'laboratory', 'health', 'certificate', 'prescription'];
      const hasMedicalKeyword = medicalKeywords.some(keyword => lowerFileName.includes(keyword));

      if (!hasMedicalKeyword) {
        alert("Only medical-related scan images are allowed. Please upload a medical certificate, report, or scan file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({ ...prev, scanFileName: file.name, scanFileURL: event.target.result }));
        setIsScanning(true);
        setTimeout(() => {
          setIsScanning(false);
        }, 600);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateTab = (tabId) => {
    switch (tabId) {
      case 'name':
        if (!formData.firstName.trim() || !formData.lastName.trim()) return 'Please fill in both first and last name.';
        break;
      case 'birthday':
        if (!formData.birthday) return 'Please select a birthday.';
        break;
      case 'age':
        if (!String(formData.age).trim()) return 'Please enter age.';
        break;
      case 'gender':
        if (!formData.gender) return 'Please select a gender.';
        break;
      case 'employment':
        if (!formData.designation.trim() || !formData.unit.trim() || !formData.agency.trim()) return 'Please fill in designation, unit, and agency.';
        break;
      case 'physical':
        if (!String(formData.height).trim() || !String(formData.weight).trim()) return 'Please fill in height and weight.';
        break;
      case 'lastMedical':
        if (!formData.lastMedicalDate || !formData.medicalExamLocation.trim()) return 'Please fill in the date of last medical exam and location.';
        break;
      case 'scan':
        if (!formData.scanFileName) return 'Please upload a medical certificate scan.';
        break;
      default:
        break;
    }
    return '';
  };

  const handleTabClick = (targetTabId) => {
    if (targetTabId === activeTab) return;

    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);
    
    // Allow going backwards freely
    if (targetIndex < currentIndex) {
      setActiveTab(targetTabId);
      return;
    }

    // Block skipping multiple steps
    if (targetIndex > currentIndex + 1) {
      alert("Please complete the steps in order.");
      return;
    }

    // Validate current tab before moving forward
    const errorMsg = validateTab(activeTab);
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    setActiveTab(targetTabId);
  };

  const goNext = () => {
    const errorMsg = validateTab(activeTab);
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    } else {
      const generatedId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `personnel-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const newPersonnel = {
        id: generatedId,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        designation: formData.designation || 'N/A',
        unit: formData.unit || 'N/A',
        agency: formData.agency || 'N/A',
        bloodType: formData.bloodType || 'N/A',
        age: formData.age || 'N/A',
        birthday: formData.birthday || 'N/A',
        gender: formData.gender || 'Not Specified',
        physicalFitness: {
          height: formData.height || 'N/A',
          weight: formData.weight || 'N/A',
          capability: calculateFitness(formData.height, formData.weight)
        },
        physicalFitnessStatus: formData.fitnessStatus || calculateFitness(formData.height, formData.weight),
        lastMedicalDate: formData.lastMedicalDate || new Date().toISOString().split('T')[0], // Default to today
        findings: formData.findings || 'Complete',
        medicalExamLocation: formData.medicalExamLocation || 'Unknown',
        scanFileName: formData.scanFileName || null,
        scanFileURL: formData.scanFileURL || null
      };
      if (onAddPersonnel) onAddPersonnel(newPersonnel);
      if (navigateBack) navigateBack();
    }
  };

  const goBack = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  const bmiValue = getBMI(formData.height, formData.weight);
  const heightStatus = getVitalStatus('height', formData.height);
  const weightStatus = getVitalStatus('weight', formData.weight, formData.height);
  const bmiStatus = getVitalStatus('bmi', bmiValue);

  return (
    <div className="patient-form-container">
      <div className="folder-wrapper">
        {/* Tab Header (Looks like manila folder tabs) */}
        <div className="folder-tabs">
          {tabs.map((tab, idx) => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab);
            const isFutureTab = idx > currentIndex;
            const isTabDisabled = isFutureTab && (idx > currentIndex + 1 || validateTab(activeTab) !== '');
            return (
              <div 
                key={tab.id}
                className={`folder-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => !isTabDisabled && handleTabClick(tab.id)}
                style={isTabDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {tab.label}
              </div>
            );
          })}
        </div>

        {/* Folder Body (Glassmorphism card) */}
        <div className="folder-body">
          <div className="tab-content" key={activeTab}>
            
            {/* NAME TAB */}
            {activeTab === 'name' && (
              <div className="form-group">
                <label>First Name</label>
                <input 
                  type="text" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="e.g. John" 
                  autoFocus 
                />
                
                <label style={{marginTop: '15px'}}>Last Name</label>
                <input 
                  type="text" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="e.g. Doe" 
                />
              </div>
            )}

            {/* BIRTHDAY TAB */}
            {activeTab === 'birthday' && (
              <div className="form-group">
                <label>Date of Birth</label>
                <input 
                  type="date" 
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleBirthdayChange}
                  className="form-input" 
                />
                <p style={{fontSize: '0.85rem', color: '#94a3b8', marginTop: '10px'}}>
                  Selecting a birthday will automatically calculate the age.
                </p>
              </div>
            )}

            {/* AGE TAB */}
            {activeTab === 'age' && (
              <div className="form-group">
                <label>Age</label>
                <input 
                  type="number" 
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="e.g. 25" 
                />
              </div>
            )}

            {/* GENDER TAB */}
            {activeTab === 'gender' && (
              <div className="form-group">
                <label style={{textAlign: 'center', marginBottom: '15px'}}>Select Gender</label>
                <div className="gender-selector">
                  {['Male', 'Female', 'Other'].map(g => (
                    <div 
                      key={g}
                      className={`gender-option ${formData.gender === g ? 'selected' : ''}`}
                      onClick={() => handleGenderSelect(g)}
                    >
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EMPLOYMENT TAB */}
            {activeTab === 'employment' && (
              <div className="form-group">
                <label>Designation / Job Title</label>
                <input 
                  type="text" 
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="e.g. Software Engineer" 
                />
                
                <label style={{marginTop: '15px'}}>Unit / Office</label>
                <input 
                  type="text" 
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="e.g. IT Department" 
                />

                <label style={{marginTop: '15px'}}>Agency / Company</label>
                <input 
                  type="text" 
                  name="agency"
                  value={formData.agency}
                  onChange={handleChange}
                  className="form-input" 
                  placeholder="e.g. Acme Corp" 
                />
              </div>
            )}

            {/* PHYSICAL FITNESS TAB */}
            {activeTab === 'physical' && (
              <div className="form-group">
                <label>Height (cm)</label>
                <div style={{position: 'relative', marginBottom: '15px'}}>
                  <input type="text" name="height" value={formData.height} onChange={handleChange} className="form-input" placeholder="175" style={{ width: '100%', paddingRight: '120px' }} />
                  {getVitalStatus('height', formData.height) && (
                    <span style={{color: getVitalStatus('height', formData.height).color, fontSize: '0.8rem', fontWeight: 'bold', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)'}}>{getVitalStatus('height', formData.height).label}</span>
                  )}
                </div>
                
                <label>Weight (kg)</label>
                <div style={{position: 'relative', marginBottom: '15px'}}>
                  <input type="text" name="weight" value={formData.weight} onChange={handleChange} className="form-input" placeholder="70" style={{ width: '100%', paddingRight: '120px' }} />
                  {getVitalStatus('weight', formData.weight, formData.height) && (
                    <span style={{color: getVitalStatus('weight', formData.weight, formData.height).color, fontSize: '0.8rem', fontWeight: 'bold', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)'}}>{getVitalStatus('weight', formData.weight, formData.height).label}</span>
                  )}
                </div>
                
                <label>Blood Type</label>
                <select 
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                  className="form-input"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
                >
                  <option value="">Select Blood Type (Optional)</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>

                <div style={{ marginTop: '25px', padding: '15px', border: '1px solid rgba(96, 165, 250, 0.3)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.4)' }}>
                  <label style={{ color: '#60a5fa', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Automated Fitness Classification</label>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 15px 0' }}>The system evaluates fitness based on BMI calculated from height and weight.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))', gap: '18px', marginBottom: '22px' }}>
                    <div style={{ padding: '16px', minHeight: '120px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(59, 130, 246, 0.35)' }}>
                      <div style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '8px' }}>Height</div>
                      <div style={{ color: heightStatus?.color || '#cbd5e1', fontWeight: 800, fontSize: '1rem' }}>{heightStatus?.label || 'Not enough data'}</div>
                    </div>
                    <div style={{ padding: '16px', minHeight: '120px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(59, 130, 246, 0.35)' }}>
                      <div style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '8px' }}>Weight</div>
                      <div style={{ color: weightStatus?.color || '#cbd5e1', fontWeight: 800, fontSize: '1rem' }}>{weightStatus?.label || 'Not enough data'}</div>
                    </div>
                    <div style={{ padding: '16px', minHeight: '120px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(59, 130, 246, 0.35)' }}>
                      <div style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '8px' }}>Total BMI</div>
                      <div style={{ color: bmiStatus?.color || '#cbd5e1', fontWeight: 800, fontSize: '1rem' }}>{bmiStatus?.label || 'Not enough data'}</div>
                      {bmiValue !== null && (
                        <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#94a3b8' }}>{bmiValue.toFixed(1)}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '12px', border: '1px dashed #60a5fa', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.6)', marginTop: '4px', fontSize: '0.9rem', color: '#fff' }}>
                    {calculateFitness(formData.height, formData.weight)}
                  </div>
                  <div style={{ marginTop: '18px', padding: '20px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(96, 165, 250, 0.35)' }}>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '1rem', color: '#60a5fa' }}>Physical Fitness Status</label>
                    <select
                      name="fitnessStatus"
                      value={formData.fitnessStatus}
                      onChange={handleChange}
                      className="form-input"
                      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#fff', padding: '14px 16px', fontSize: '0.98rem' }}
                    >
                      <option value="Personal Fitness 1: Fully Exercise">Fitness 1: Fully Exercise</option>
                      <option value="Personal Fitness 2: Overweight - Push up, Sit up, Light Weight Exercises">Fitness 2: Limited Exercise</option>
                      <option value="Not Qualified / Personal Fitness 3: Obese - Not capable to do the fitness required">Fitness 3: Not Qualified</option>
                    </select>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '12px' }}>
                      Choose the physical fitness status based on medical review or keep the automated recommendation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LAST EXAM TAB */}
            {activeTab === 'lastMedical' && (
              <div className="form-group">
                <label>Date of Last Medical Exam</label>
                <input 
                  type="date" 
                  name="lastMedicalDate"
                  value={formData.lastMedicalDate}
                  onChange={handleChange}
                  className="form-input" 
                />
                
                <label style={{marginTop: '15px'}}>Medical Findings / Status</label>
                <select 
                  name="findings"
                  value={formData.findings}
                  onChange={handleChange}
                  className="form-input"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
                >
                  <option value="Complete">Complete</option>
                  <option value="Pending">Pending</option>
                </select>

                <div style={{ marginTop: '20px', backgroundColor: 'rgba(15,23,42,0.4)', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <label style={{ display: 'block', marginBottom: '10px' }}>Medical Exam Location</label>
                  <input 
                    type="text"
                    name="medicalExamLocation"
                    value={formData.medicalExamLocation}
                    onChange={handleChange}
                    placeholder="e.g. St. Mary's Hospital"
                    className="form-input"
                    style={{ width: '100%', marginTop: '5px' }}
                  />
                  <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '10px' }}>
                    Enter where the last medical exam was conducted.
                  </p>
                </div>
              </div>
            )}

            {/* SCAN UPLOAD TAB */}
            {activeTab === 'scan' && (
              <div className="form-group">
                <label style={{textAlign: 'center', marginBottom: '15px'}}>Upload Medical Certificate</label>
                <label className="upload-zone">
                  <div className="upload-icon">📁</div>
                  <h3>Drag & Drop or Click to Upload</h3>
                  <p style={{color: '#94a3b8', fontSize: '0.9rem', margin: '0'}}>Supports .JPG, .PNG medical certificate scans only.</p>
                  <div style={{ margin: '10px 0', padding: '10px', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.45)' }}>
                    <p style={{ margin: '0', color: '#94a3b8', fontSize: '0.9rem' }}>
                      Upload your medical certificate scan directly. Supported formats: JPG, PNG.
                    </p>
                  </div>
                  {formData.scanFileName && (
                    <div style={{ marginTop: '10px' }}>
                      <p style={{color: '#60a5fa', fontWeight: 'bold', marginBottom: '10px'}}>
                        Selected: {formData.scanFileName}
                      </p>
                      {formData.scanFileURL && (
                        <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                          <img 
                            src={formData.scanFileURL} 
                            alt="Scan Preview" 
                            style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px', border: '1px solid #334155', filter: isScanning ? 'blur(2px) sepia(100%) hue-rotate(180deg)' : 'none', transition: '1s all' }} 
                          />
                          {isScanning && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                              <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px #60a5fa' }}>
                                🔍 AI Scanning...
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
            )}

          </div>

          <div className="form-actions">
            <button 
              className="btn btn-secondary" 
              onClick={goBack} 
              disabled={activeTab === tabs[0].id}
              style={activeTab === tabs[0].id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Back
            </button>
            <button 
              className="btn btn-primary" 
              onClick={goNext}
              disabled={validateTab(activeTab) !== ''}
              style={validateTab(activeTab) !== '' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {activeTab === tabs[tabs.length - 1].id ? 'Submit Data' : 'Next Step'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;
