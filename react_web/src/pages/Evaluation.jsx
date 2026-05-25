import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, RotateCw, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { getErrorMessage } from '../services/api';
import Toast from '../components/Toast';
import AlreadyEvaluatedModal from '../components/AlreadyEvaluatedModal';
import '../styles/evaluation.css';
import '../styles/pagination.css';
import '../styles/Toast.css';

export default function Evaluation() {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasPositiveFeedback, setHasPositiveFeedback] = useState(false);
  const [positiveFeedback, setPositiveFeedback] = useState('');
  const [hasNegativeFeedback, setHasNegativeFeedback] = useState(false);
  const [negativeFeedback, setNegativeFeedback] = useState('');
  const [success, setSuccess] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [retrying, setRetrying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAlreadyEvaluated, setIsAlreadyEvaluated] = useState(false);
  const QUESTIONS_PER_PAGE = 5;

  useEffect(() => {
    fetchData();
    
    // Confirm before leaving with unsaved changes
    const handleBeforeUnload = (e) => {
      const isAnswered = Object.values(responses).some(r => r !== 0);
      if (isAnswered && !success) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [teacherId]);

  const fetchData = async () => {
    try {
      const [teacherRes, questionsRes, evaluatedRes] = await Promise.all([
        api.get(`teachers/${teacherId}`),
        api.get('questions'),
        api.get('evaluations')
      ]);

      // Handle teacher response - data is directly the teacher object
      if (teacherRes.data.success && teacherRes.data.data) {
        setTeacher(teacherRes.data.data);
      }

      // Check if this teacher is already evaluated
      if (evaluatedRes.data.success && evaluatedRes.data.data) {
        const evaluationsList = evaluatedRes.data.data.data || [];
        const isEvaluated = evaluationsList.some(e => 
          (e.teacher_id && e.teacher_id === teacherId) || (e.teacher_id && e.teacher_id.toString() === teacherId)
        );
        if (isEvaluated) {
          setIsAlreadyEvaluated(true);
          setLoading(false);
          return;
        }
      }

      // Handle questions response - data is an array of questions
      if (questionsRes.data.success) {
        const questionsList = questionsRes.data.data.data || [];
        console.log('📋 Questions fetched from API:', questionsList);
        console.log('🎯 First question rating_scale:', questionsList[0]?.rating_scale);
        setQuestions(questionsList);
        
        // Initialize responses
        const init = {};
        questionsList.forEach(q => {
          init[q.id || q._id] = 0;
        });
        
        // Set initial responses, then load draft if available
        setResponses(init);
        
        // Load draft AFTER questions are loaded
        setTimeout(() => {
          loadDraft(init);
        }, 0);
      }
    } catch (err) {
      setError('Failed to load data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Toast Notification System
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Draft Management - Auto-save to localStorage
  const saveDraft = (currentResponses, currentPositive, currentNegative) => {
    // Calculate progress for display
    const answeredCount = Object.values(currentResponses).filter(r => r !== 0).length;
    const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
    
    const draft = {
      teacherId,
      responses: currentResponses,
      positiveFeedback: currentPositive,
      negativeFeedback: currentNegative,
      hasPositiveFeedback,
      hasNegativeFeedback,
      progress,
      timestamp: Date.now()
    };
    localStorage.setItem('evaluation_draft', JSON.stringify(draft));
  };

  const loadDraft = (initialResponses = {}) => {
    try {
      const draft = JSON.parse(localStorage.getItem('evaluation_draft') || '{}');
      if (draft.teacherId === teacherId && Date.now() - draft.timestamp < 30 * 60 * 1000) { // 30 min
        // Merge saved responses with initialized ones
        const mergedResponses = {
          ...initialResponses,
          ...(draft.responses || {})
        };
        setResponses(mergedResponses);
        setPositiveFeedback(draft.positiveFeedback || '');
        setNegativeFeedback(draft.negativeFeedback || '');
        setHasPositiveFeedback(draft.hasPositiveFeedback || false);
        setHasNegativeFeedback(draft.hasNegativeFeedback || false);
        addToast('Draft restored!', 'info');
      }
    } catch (err) {
      // Failed to load draft
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('evaluation_draft');
  };

  // Confetti Animation
  const createConfetti = () => {
    const confetti = [];
    for (let i = 0; i < 30; i++) {
      const element = document.createElement('div');
      element.className = 'confetti';
      element.style.left = Math.random() * 100 + '%';
      element.style.delay = Math.random() * 0.5 + 's';
      element.style.background = ['#667eea', '#764ba2', '#f093fb', '#4facfe'][Math.floor(Math.random() * 4)];
      element.style.animation = `confetti-fall ${2 + Math.random() * 1}s ease-in forwards`;
      document.body.appendChild(element);
      
      setTimeout(() => element.remove(), 3000);
    }
  };

  // Calculate progress
  const answeredCount = Object.values(responses).filter(r => r !== 0).length;
  const totalQuestions = questions.length;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const isComplete = answeredCount === totalQuestions && totalQuestions > 0;

  // Pagination logic
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE;
  const endIndex = startIndex + QUESTIONS_PER_PAGE;
  const paginatedQuestions = questions.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Scroll to top of questions section
      setTimeout(() => {
        const questionsSection = document.querySelector('.questions-section');
        if (questionsSection) {
          questionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Scroll to top of questions section
      setTimeout(() => {
        const questionsSection = document.querySelector('.questions-section');
        if (questionsSection) {
          questionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 0);
    }
  };

  // Auto-save on response change
  useEffect(() => {
    if (questions.length > 0) {
      saveDraft(responses, positiveFeedback, negativeFeedback);
    }
  }, [responses, positiveFeedback, negativeFeedback]);

  const handleRating = (questionId, rating) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate student number before submission
    if (!user?.student_number || user.student_number === 'anonymous') {
      addToast('Invalid session: Please log in with your student number', 'error');
      setError('Invalid student number. Please log in again.');
      navigate('/');
      return;
    }

    if (!isComplete) {
      addToast('Please answer all questions before submitting', 'error');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        teacher_id: teacherId,
        answers: responses,
        // Always include valid student_id - never allow anonymous submissions
        student_id: user.student_number
      };

      // Include feedback types if provided
      if (hasPositiveFeedback && positiveFeedback.trim()) {
        payload.positive_feedback = positiveFeedback.trim();
      }
      if (hasNegativeFeedback && negativeFeedback.trim()) {
        payload.negative_feedback = negativeFeedback.trim();
      }

      const response = await api.post('evaluations', payload);

      if (response.data.success) {
        clearDraft();
        
        // Mark teacher as evaluated with student number for proper duplicate prevention
        // This ensures different students on the same device can evaluate the same teacher
        if (window.duplicatePreventionManager) {
          window.duplicatePreventionManager.markTeacherAsEvaluated(
            teacherId,
            `${teacher?.first_name} ${teacher?.last_name}`,
            user?.student_number
          );
        }
        
        createConfetti();
        addToast('Evaluation submitted successfully!', 'success');
        setSuccess(true);
        // Auto redirect after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        const errorMsg = response.data.message || 'Submission failed';
        setError(errorMsg);
        addToast(errorMsg, 'error');
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Error submitting evaluation';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        {/* Skeleton Header */}
        <div className="skeleton-header">
          <div className="skeleton-back-btn"></div>
          <div className="skeleton-teacher-info">
            <div className="skeleton-avatar-lg"></div>
            <div className="skeleton-teacher-texts">
              <div className="skeleton-text-xl"></div>
              <div className="skeleton-text-sm"></div>
            </div>
          </div>
        </div>

        {/* Skeleton Questions */}
        <div className="skeleton-questions">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-question">
              <div className="skeleton-question-text" style={{ width: '85%' }}></div>
              <div className="skeleton-rating-options">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="skeleton-rating-btn"></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Feedback & Buttons */}
        <div style={{ width: '100%', maxWidth: '900px', padding: '0 1rem', boxSizing: 'border-box', marginBottom: '1rem' }}>
          <div className="skeleton-feedback">
            <div className="skeleton-checkbox"></div>
            <div className="skeleton-text-line" style={{ width: '60%', display: 'inline-block', marginLeft: '0.5rem' }}></div>
          </div>
          <div className="skeleton-buttons">
            <div className="skeleton-btn"></div>
            <div className="skeleton-btn"></div>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen
  if (success) {
    return (
      <div className="evaluation-container success-wrapper">
        {/* Toast Container */}
        <div className="toast-container">
          {toasts.map(toast => (
            <Toast 
              key={toast.id}
              message={toast.message} 
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>

        <div className="success-card">
          <div className="success-icon" aria-hidden>
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="44" cy="44" r="44" fill="#ffffff22" />
              <path d="M30 45l7 6 20-22" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="success-title">Success!</h1>
          <p className="success-subtitle">Evaluation Submitted</p>

          <p className="success-message">Thank you for evaluating <strong>{teacher?.first_name} {teacher?.last_name}</strong>. Your feedback has been recorded and will help improve teaching quality.</p>

          <div className="success-actions">
            <button className="btn btn-primary btn-success" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <button className="btn btn-outline btn-success-ghost" onClick={() => navigate('/')}>Evaluate Another</button>
          </div>

          <div className="success-note">Redirecting to dashboard in a moment…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-container">
      {/* Already Evaluated Modal */}
      {isAlreadyEvaluated && teacher && (
        <AlreadyEvaluatedModal teacher={teacher} />
      )}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            message={toast.message} 
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      <div className="evaluation-header">
        <button 
          className="btn-back"
          onClick={() => navigate('/dashboard')}
          type="button"
        >
          ← Back
        </button>
        {teacher && (
          <div className="teacher-header">
            <img 
              src={teacher.picture || '/default-avatar.png'} 
              alt={teacher.first_name || 'Teacher'}
              className="teacher-avatar"
            />
            <div>
              <h1>{[teacher.first_name, teacher.middle_name, teacher.last_name].filter(Boolean).join(' ')}</h1>
              <p>{teacher.department}</p>
            </div>
          </div>
        )}
      </div>

      {!isAlreadyEvaluated && (
      <form onSubmit={handleSubmit} className="evaluation-form">
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
            <button 
              type="button" 
              onClick={() => handleSubmit({ preventDefault: () => {} })}
              className="btn btn-sm btn-outline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Progress Indicator */}
        {questions.length > 0 && (
          <div className="progress-container">
            <div className="progress-info">
              <span className="progress-label">Questions Answered</span>
              <span className="progress-percentage">{answeredCount}/{totalQuestions} ({progressPercentage}%)</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        )}

        <div className="questions-container questions-section">
          {paginatedQuestions.map((question, idx) => (
            <div key={question.id} className="question-item">
              <div className="question-text">
                <span className="question-number">{startIndex + idx + 1}.</span>
                <span>{question.question_text || question.text}</span>
              </div>
              
              <div className="rating-options rating-vertical">
                {[1, 2, 3, 4, 5].map(rating => {
                  const ratingDescription = question.rating_scale?.[String(rating)] || 
                    ['', 'Does not meet expectations', 'Below average', 'Meets expectations', 'Exceeds expectations', 'Outstanding'][rating];
                  
                  return (
                    <label key={rating} className="rating-label-radio">
                      <input
                        type="radio"
                        name={`question_${question.id}`}
                        value={rating}
                        checked={responses[question.id] === rating}
                        onChange={() => handleRating(question.id, rating)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowRight' && rating < 5) {
                            handleRating(question.id, rating + 1);
                          } else if (e.key === 'ArrowLeft' && rating > 1) {
                            handleRating(question.id, rating - 1);
                          }
                        }}
                        required
                      />
                      <span className="radio-circle"></span>
                      <span className="radio-text">
                        <strong>{rating}</strong> - {ratingDescription}
                      </span>
                    </label>
                  );
                })}
              </div>
              {responses[question.id] > 0 && (
                <div className="validation-feedback validation-success">
                  <span className="validation-icon">✓</span>
                  <span>Answered</span>
                </div>
              )}
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="pagination-btn pagination-btn-prev"
                aria-label="Previous page"
              >
                ← Previous
              </button>
              <span className="pagination-info" role="status" aria-live="polite">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="pagination-btn pagination-btn-next"
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Feedback Sections - Show only on last page */}
        {(currentPage === totalPages && totalPages > 0) && (
        <div className="feedback-section">
          {/* Positive Feedback */}
          <div className="feedback-toggle" style={{ marginTop: '1.5rem' }}>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={hasPositiveFeedback}
                onChange={(e) => setHasPositiveFeedback(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-text">Would you like to provide positive feedback?</span>
            </label>
          </div>
          
          {hasPositiveFeedback && (
            <div className="feedback-input-container">
              <textarea
                className="feedback-textarea"
                placeholder="Highlight the strengths and positive qualities you observed (optional)..."
                value={positiveFeedback}
                onChange={(e) => setPositiveFeedback(e.target.value)}
                rows="4"
                maxLength={500}
              />
              <p className="feedback-hint">Max 500 characters</p>
            </div>
          )}

          {/* Negative Feedback */}
          <div className="feedback-toggle" style={{ marginTop: '1.5rem' }}>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={hasNegativeFeedback}
                onChange={(e) => setHasNegativeFeedback(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-text">Would you like to provide negative feedback?</span>
            </label>
          </div>
          
          {hasNegativeFeedback && (
            <div className="feedback-input-container">
              <textarea
                className="feedback-textarea"
                placeholder="Share areas for improvement and constructive criticism (optional)..."
                value={negativeFeedback}
                onChange={(e) => setNegativeFeedback(e.target.value)}
                rows="4"
                maxLength={500}
              />
              <p className="feedback-hint">Max 500 characters</p>
            </div>
          )}
        </div>
        )}

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className={`btn btn-primary btn-lg ${!isComplete ? 'btn-submit-disabled' : ''}`}
            disabled={!isComplete || submitting}
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '16px', height: '16px', borderRadius: '50%', borderTop: '2px solid white', borderRight: '2px solid transparent' }}></span>
                Submitting...
              </span>
            ) : isComplete ? (
              'Submit Evaluation ✓'
            ) : (
              `Answer All Questions (${answeredCount}/${totalQuestions})`
            )}
          </button>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </form>
      )}

      <nav className="bottom-nav">
        <button className="bottom-nav-btn" title="Home" onClick={() => navigate('/dashboard')}>
          <Home size={24} className="nav-icon" />
          <span className="nav-label">Home</span>
        </button>
        <button className="bottom-nav-btn" title="Refresh" onClick={() => window.location.reload()}>
          <RotateCw size={24} className="nav-icon" />
          <span className="nav-label">Refresh</span>
        </button>
        <button className="bottom-nav-btn" title="Back" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} className="nav-icon" />
          <span className="nav-label">Back</span>
        </button>
      </nav>
    </div>
  );
}
