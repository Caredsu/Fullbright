import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCw, ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { getErrorMessage } from '../services/api';
import { useOfflineDetection, useLocalCache } from '../hooks/useOfflineDetection';
import LazyImage from '../components/LazyImage';
import DraftRecovery from '../components/DraftRecovery';
import Toast from '../components/Toast';
import fbcLogo from '../assets/images/fbc_logo2.png';
import '../styles/dashboard.css';

const DEPARTMENTS = ['All', 'ECT', 'EDUC', 'CCJE', 'BHT'];

export default function Dashboard() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [draft, setDraft] = useState(null);
  const [showBackOnlineToast, setShowBackOnlineToast] = useState(false);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [evaluatedTeachers, setEvaluatedTeachers] = useState([]);
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { isOnline, backOnlineNotification, dismissNotification } = useOfflineDetection();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Show welcome toast on first load
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('welcome_shown');
    if (!hasShownWelcome) {
      setShowWelcomeToast(true);
      sessionStorage.setItem('welcome_shown', 'true');
    }
  }, []);

  // Show toast when coming back online
  useEffect(() => {
    if (backOnlineNotification) {
      setShowBackOnlineToast(true);
      dismissNotification();
    }
  }, [backOnlineNotification, dismissNotification]);

  const loadDraftInfo = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem('evaluation_draft');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        // Find teacher info for this draft
        if (teachers.length > 0) {
          const teacher = teachers.find(t => t.id === draftData.teacherId);
          if (teacher) {
            // Calculate progress
            const answeredQuestions = Object.values(draftData.responses || {}).filter(r => r !== 0).length;
            const totalQuestions = Object.keys(draftData.responses || {}).length;
            const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
            
            setDraft({
              teacherName: teacher.name,
              teacherId: draftData.teacherId,
              progress,
              timestamp: draftData.timestamp
            });
          }
        }
      }
    } catch (err) {
      // Silently fail
    }
  }, [teachers]);

  const handleRestoreDraft = () => {
    if (draft?.teacherId) {
      navigate(`/evaluate/${draft.teacherId}`);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('evaluation_draft');
    setDraft(null);
  };

  const fetchTeachersData = useCallback(async () => {
    try {
      const response = await api.get('teachers.php');
      if (response.data.success) {
        const teachersData = response.data.teachers || response.data.data || [];
        return teachersData.map(t => ({
          id: t.id,
          name: [t.first_name, t.middle_name, t.last_name]
            .filter(Boolean)
            .join(' ') || 'Unnamed Teacher',
          email: t.email,
          department: t.department,
          picture_url: t.picture,
          status: t.status
        }));
      }
      throw new Error(response.data.message || 'Failed to load teachers');
    } catch (err) {
      throw err;
    }
  }, []);

  // Fetch evaluated teachers for current student
  const fetchEvaluatedTeachers = useCallback(async () => {
    try {
      const studentId = user?.student_number || localStorage.getItem('student_number');
      const url = studentId 
        ? `check-evaluated-teachers.php?student_id=${encodeURIComponent(studentId)}`
        : 'check-evaluated-teachers.php';
      
      const response = await api.get(url);
      console.log('📊 Evaluated Teachers Response:', response.data);
      
      if (response.data.success && response.data.data) {
        const evaluatedList = response.data.data.evaluated_teachers || [];
        console.log('📋 Evaluated List:', evaluatedList);
        
        const evaluatedIds = evaluatedList.map(t => {
          const id = t._id || t.id;
          console.log('ID extracted:', id, 'from:', t);
          return id;
        });
        
        console.log('✅ Evaluated IDs:', evaluatedIds);
        setEvaluatedTeachers(evaluatedIds);
      }
    } catch (err) {
      console.error('❌ Failed to fetch evaluated teachers:', err);
      // Silently fail - don't block the dashboard
    }
  }, [user]);

  // Use local cache for teachers (5 minute cache)
  const { data: cachedTeachers, loading: cacheLoading, error: cacheError } = useLocalCache(
    'teachers_list',
    fetchTeachersData,
    5 * 60 * 1000
  );

  useEffect(() => {
    setTeachers(cachedTeachers || []);
    setLoading(cacheLoading);
    if (cacheError) {
      setError(cacheError);
    }
    if (cachedTeachers && cachedTeachers.length > 0) {
      loadDraftInfo();
      fetchEvaluatedTeachers();
    }
  }, [cachedTeachers, cacheLoading, cacheError, loadDraftInfo, fetchEvaluatedTeachers]);

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTeachersData();
      setTeachers(data);
      // Update cache
      localStorage.setItem('cache_teachers_list', JSON.stringify(data));
      localStorage.setItem('cache_teachers_list_time', Date.now().toString());
    } catch (err) {
      setError(getErrorMessage(err));
      // Try to load from cache if offline
      if (!isOnline) {
        const cached = localStorage.getItem('cache_teachers_list');
        if (cached) {
          try {
            setTeachers(JSON.parse(cached));
            setError('Offline mode: Showing cached data');
          } catch (e) {
            setError('Failed to load teachers. Check your connection.');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvaluations = () => {
    try {
      const draft = JSON.parse(localStorage.getItem('evaluation_draft') || '{}');
      if (draft.teacherId && teachers.length > 0) {
        const teacher = teachers.find(t => t.id === draft.teacherId);
        if (teacher) {
          setRecentEvaluations([teacher]);
        }
      }
    } catch (err) {
      console.error('Failed to load recent evaluations:', err);
    }
  };

  const filterTeachers = () => {
    let filtered = teachers;

    // Filter by department
    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(t => t.department === selectedDepartment);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        (t.department && t.department.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const handleEvaluate = (teacherId) => {
    navigate(`/evaluate/${teacherId}`);
  };

  const filteredTeachers = filterTeachers();

  if (loading) {
    return (
      <div className="loading">
        {/* Skeleton Header */}
        <div className="skeleton-header">
          <div className="skeleton-logo"></div>
          <div className="skeleton-title"></div>
        </div>

        {/* Skeleton Search */}
        <div className="skeleton-search"></div>

        {/* Skeleton Filters */}
        <div className="skeleton-filters">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-filter-chip"></div>
          ))}
        </div>

        {/* Skeleton Cards */}
        <div className="skeleton-cards">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text-line" style={{ width: '80%' }}></div>
              <div className="skeleton-text-short"></div>
              <div className="skeleton-text-short"></div>
              <div className="skeleton-button"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Toast */}
      {showWelcomeToast && (
        <Toast
          message={`Welcome ${localStorage.getItem('student_number')}! 👋`}
          type="success"
          duration={4000}
          onClose={() => setShowWelcomeToast(false)}
        />
      )}
      
      {/* Back Online Toast */}
      {showBackOnlineToast && (
        <Toast 
          message="You're back online!" 
          type="success" 
          duration={4000}
          onClose={() => setShowBackOnlineToast(false)} 
        />
      )}

      {/* Draft Recovery Banner */}
      {draft && (
        <DraftRecovery 
          draft={draft} 
          onRestore={handleRestoreDraft}
          onClear={handleClearDraft}
        />
      )}

      {/* App Header */}
      <header className="app-header" role="banner">
        <img src={fbcLogo} alt="FBC Logo" className="header-logo" />
        <h1 className="app-title">Fullbright College Inc.</h1>
      </header>

      {/* Recent Evaluations Widget */}
      {recentEvaluations.length > 0 && (
        <div className="recent-section">
          <h3 className="recent-title">In Progress</h3>
          <div className="recent-list">
            {recentEvaluations.map(teacher => (
              <div key={teacher.id} className="recent-eval-item">
                <span className="recent-label">Resume: {teacher.name}</span>
                <button 
                  onClick={() => navigate(`/evaluate/${teacher.id}`)}
                  className="recent-btn"
                >
                  Continue →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search teachers by name or email"
            role="searchbox"
            aria-describedby="search-help"
          />
          <span id="search-help" className="sr-only">
            Enter teacher name or email to filter the list
          </span>
        </div>
      </div>

      {/* Department Filter with Sort Options */}
      <div className="filter-section">
        <div className="filter-header">
          <span className="filter-label">Filter by Department:</span>
        </div>
        <div className="department-filters" role="group" aria-label="Filter teachers by department">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              className={`filter-chip ${selectedDepartment === dept ? 'active' : ''}`}
              onClick={() => setSelectedDepartment(dept)}
              aria-pressed={selectedDepartment === dept}
              aria-label={`Filter by ${dept} department`}
            >
              {dept}
            </button>
          ))}
        </div>
        <p className="filter-count" role="status" aria-live="polite">
          Showing {filteredTeachers.length} of {teachers.length} teachers
        </p>
      </div>

      {/* Teachers List */}
      <div className="teachers-list">
        {error && (
          <div className="alert alert-error flex gap-2 mb-4" role="alert" aria-live="assertive">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p>{error}</p>
              <button 
                onClick={fetchTeachers}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                aria-label="Retry loading teachers"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {filteredTeachers.length > 0 ? (
          <div className="teachers-grid" role="region" aria-label="Teachers list">
            {filteredTeachers.map(teacher => (
              <div 
                key={teacher.id} 
                className="teacher-card"
                onClick={() => handleEvaluate(teacher.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEvaluate(teacher.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${teacher.name}, ${teacher.department} department. Click to evaluate.`}
              >
                {/* Avatar */}
                <div className="teacher-avatar">
                  {teacher.picture_url ? (
                    <LazyImage
                      src={teacher.picture_url}
                      alt={`${teacher.name}'s profile picture`}
                      className="teacher-picture"
                    />
                  ) : (
                    <div className="avatar-initial" aria-hidden="true">
                      {teacher.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* Teacher Info */}
                <div className="teacher-info">
                  <h3 className="teacher-name">{teacher.name}</h3>
                  <p className="teacher-email">{teacher.email}</p>
                  <p className="teacher-department">
                    <span className="dept-badge">{teacher.department}</span>
                  </p>
                </div>

                {/* Action Button */}
                <div className="teacher-action">
                  {console.log(`Teacher ${teacher.name}: id=${teacher.id}, isEvaluated=${evaluatedTeachers.includes(teacher.id)}`)}
                  <button 
                    className={`btn-evaluate ${evaluatedTeachers.includes(teacher.id) ? 'btn-disabled' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!evaluatedTeachers.includes(teacher.id)) {
                        handleEvaluate(teacher.id);
                      }
                    }}
                    aria-label={`Evaluate ${teacher.name}`}
                    disabled={evaluatedTeachers.includes(teacher.id)}
                    title={evaluatedTeachers.includes(teacher.id) ? 'Already evaluated' : 'Evaluate this teacher'}
                  >
                    {evaluatedTeachers.includes(teacher.id) ? '✓ Evaluated' : 'Evaluate →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No teachers found</p>
            <p className="empty-hint">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav" role="navigation" aria-label="Bottom navigation">
        <button 
          className="bottom-nav-btn" 
          title="Home" 
          onClick={() => window.location.reload()}
          aria-label="Go to home page"
        >
          <Home size={24} className="nav-icon" aria-hidden="true" />
          <span className="nav-label">Home</span>
        </button>
        <button 
          className="bottom-nav-btn" 
          title="Refresh" 
          onClick={fetchTeachers}
          aria-label="Refresh teachers list"
        >
          <RotateCw size={24} className="nav-icon" aria-hidden="true" />
          <span className="nav-label">Refresh</span>
        </button>
        <button 
          className="bottom-nav-btn" 
          title="Back" 
          onClick={() => navigate(-1)}
          aria-label="Go back to previous page"
        >
          <ArrowLeft size={24} className="nav-icon" aria-hidden="true" />
          <span className="nav-label">Back</span>
        </button>
      </nav>
    </div>
  );
}
