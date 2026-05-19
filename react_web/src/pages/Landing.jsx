import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, AlertCircle } from 'lucide-react';
import DataPrivacyModal from '../components/DataPrivacyModal';
import fbcLogo from '../assets/images/fbc_logo2.png';
import '../styles/landing.css';

const DEPARTMENT_CODES = {
  '01': 'IT/CS',
  '02': 'FM/MM',
  '03': 'EDUC',
  '04': 'Engineering',
  '05': 'Uniting',
  '06': 'CRIM',
  '07': 'HM/TM',
  '08': 'Cross Enrollee'
};

export default function Landing() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('data_privacy_consent') === 'accepted';
    setConsentGiven(hasConsent);

    // If user already has student ID, go to dashboard
    const savedStudentId = localStorage.getItem('student_id');
    if (savedStudentId) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const validateStudentId = (id) => {
    // Remove any spaces
    const cleaned = id.replace(/\s+/g, '');
    
    // Must be exactly 10 digits
    if (!/^\d{10}$/.test(cleaned)) {
      return { valid: false, error: 'Student ID must be 10 digits' };
    }

    const schoolYear = cleaned.substring(0, 2);
    const semester = cleaned.substring(2, 4);
    const department = cleaned.substring(4, 6);
    const series = cleaned.substring(6, 10);

    // Validate school year (20-29)
    const year = parseInt(schoolYear);
    if (year < 20 || year > 29) {
      return { valid: false, error: 'Invalid school year. Use last 2 digits (e.g., 22 for 2022)' };
    }

    // Validate semester (01-02)
    if (semester !== '01' && semester !== '02') {
      return { valid: false, error: 'Semester must be 01 or 02' };
    }

    // Validate department (01-08)
    if (!DEPARTMENT_CODES[department]) {
      return { valid: false, error: 'Invalid department code. Use 01-08' };
    }

    // Validate series (0001-9999)
    const seriesNum = parseInt(series);
    if (seriesNum < 1 || seriesNum > 9999) {
      return { valid: false, error: 'Series number must be between 0001-9999' };
    }

    return { valid: true };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const validation = validateStudentId(studentId);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Store student ID and proceed
    const cleaned = studentId.replace(/\s+/g, '');
    localStorage.setItem('student_id', cleaned);
    
    // Parse and store semester and department info
    const semester = cleaned.substring(2, 4);
    const department = cleaned.substring(4, 6);
    localStorage.setItem('user_semester', semester);
    localStorage.setItem('user_department', DEPARTMENT_CODES[department]);

    setSubmitted(true);
    navigate('/dashboard');
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and format with hyphens for readability
    const digitsOnly = value.replace(/\D/g, '');
    setStudentId(digitsOnly);
    setError('');
  };

  return (
    <div className="landing-container">
      {!consentGiven && (
        <DataPrivacyModal onConsent={() => setConsentGiven(true)} />
      )}
      <div className="landing-content">
        {/* Logo Section */}
        <div className="landing-logo-section">
          <img src={fbcLogo} alt="FBC Logo" className="landing-logo" />
        </div>

        {/* Welcome Section */}
        <div className="landing-welcome">
          <h1 className="landing-title">Teacher Evaluation System</h1>
          <p className="landing-subtitle">
            Streamlined evaluation and feedback for educators
          </p>
          <p className="landing-description">
            This evaluation form was made to gain insights on the strengths and weaknesses in the teaching performance of Fullbright College Faculty.
          </p>
        </div>

        {/* Student ID Form */}
        {consentGiven && (
          <div className="landing-form">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="studentId">Enter Your Student ID</label>
                <input
                  type="text"
                  id="studentId"
                  value={studentId}
                  onChange={handleInputChange}
                  placeholder="2201010092"
                  maxLength="10"
                  className="form-input"
                />
                <p className="form-hint">
                  Format: YYSMDDSSSS (10 digits)
                  <br />
                  <small>YY: School year | SM: Semester (01-02) | DD: Department (01-08) | SSSS: Series</small>
                </p>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={!studentId || studentId.length !== 10}
              >
                <BookOpen size={20} />
                <span>Get Started</span>
              </button>
            </form>
          </div>
        )}

        {/* Features Section */}
        {consentGiven && (
          <div className="landing-features">
            <div className="feature-card">
              <div className="feature-icon">
                <BookOpen size={32} />
              </div>
              <h3>Comprehensive Evaluations</h3>
              <p>Structured evaluation forms with detailed feedback</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                📊
              </div>
              <h3>Analytics & Insights</h3>
              <p>View performance trends and departmental statistics</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                🔒
              </div>
              <h3>Secure & Private</h3>
              <p>Protected data with role-based access control</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="landing-footer">
          <p>© 2026 Fullbright College Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
