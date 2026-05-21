import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, FileText, Star, Lock } from 'lucide-react';
import DataPrivacyModal from '../components/DataPrivacyModal';
import { useAuth } from '../contexts/AuthContext';
import { studentAccessSchema, validateForm } from '../schemas/validationSchemas';
import { getErrorMessage } from '../services/api';
import fbcLogo from '../assets/images/fbc_logo2.png';
import '../styles/landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [studentNumber, setStudentNumber] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('data_privacy_consent') === 'accepted';
    setConsentGiven(hasConsent);

    // If user already authenticated, go to dashboard
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [navigate, isAuthenticated]);

  const handleChange = (e) => {
    const { value } = e.target;
    setStudentNumber(value.toUpperCase());
    // Clear field error when user starts typing
    if (errors.student_number) {
      setErrors(prev => ({ ...prev, student_number: '' }));
    }
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔵 handleSubmit START');
    setError('');
    setErrors({});

    if (!consentGiven) {
      setError('Please accept the data privacy policy first');
      return;
    }

    const validation = validateForm(
      { student_number: studentNumber },
      studentAccessSchema
    );
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Step 1: Set loading FIRST, BEFORE any async work
    console.log('Step 1: Setting loading = true');
    setLoading(true);

    // Step 2: Use a setTimeout to ensure the DOM has rendered with loading state
    // before we proceed with the async login call
    setTimeout(async () => {
      try {
        console.log('Step 2: Calling login...');
        const result = await login(studentNumber);
        console.log('Step 3: Login result:', result.success);
        
        if (result.success) {
          // Step 4: Wait 3 more seconds (total visible time will be ~3+ seconds)
          console.log('Step 4: Login successful, waiting 3 seconds...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log('Step 5: Redirecting to dashboard');
          navigate('/dashboard');
        } else {
          setLoading(false);
          setError(result.error || 'Invalid student number');
        }
      } catch (err) {
        setLoading(false);
        setError(getErrorMessage(err));
      }
    }, 2000); // 2 SECOND DELAY to make loading state clearly visible
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

        {/* Student Number Form */}
        {consentGiven && (
          <div className="landing-form">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error flex gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {loading && (
                <div className="alert alert-loading flex gap-2 mb-4">
                  <Loader2 className="w-5 h-5 flex-shrink-0 mt-0.5 animate-spin" />
                  <div>Verifying your student number...</div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="student_number">Student Number</label>
                <input
                  id="student_number"
                  type="text"
                  value={studentNumber}
                  onChange={handleChange}
                  placeholder="Enter your student number"
                  disabled={loading}
                  className={errors.student_number ? 'input-error' : ''}
                  autoComplete="off"
                  autoFocus
                />
                {errors.student_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.student_number}</p>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-large"
                disabled={!studentNumber || loading || !consentGiven}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                  </>
                )}
              </button>
            </form>

            
          </div>
        )}

        {/* Features Section */}
        {consentGiven && (
          <div className="landing-features">
            <div className="feature-card">
              <div className="feature-icon">
                <FileText className="w-10 h-10" />
              </div>
              <h3>Simple Access</h3>
              <p>Just enter your student number to start</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Star className="w-10 h-10" />
              </div>
              <h3>Rate Teachers</h3>
              <p>Provide detailed feedback and ratings</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Lock className="w-10 h-10" />
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
