import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCw, ArrowLeft, Search } from 'lucide-react';
import api from '../services/api';
import fbcLogo from '../assets/images/fbc_logo2.png';
import '../styles/dashboard.css';

const DEPARTMENTS = ['All', 'ECT', 'EDUC', 'CCJE', 'BHT'];

export default function Dashboard() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeachers();
    loadRecentEvaluations();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('teachers.php');
      console.log('Teachers API Response:', response.data);
      if (response.data.success) {
        // Handle API response - could be 'teachers' or 'data'
        const teachersData = response.data.teachers || response.data.data || [];
        
        // Map API response to app format
        const mappedTeachers = teachersData.map(t => ({
          id: t.id,
          name: [t.first_name, t.middle_name, t.last_name]
            .filter(Boolean)
            .join(' ') || 'Unnamed Teacher',
          email: t.email,
          department: t.department,
          picture_url: t.picture,
          status: t.status
        }));
        setTeachers(mappedTeachers);
        console.log('Mapped teachers:', mappedTeachers);
      } else {
        console.error('API error:', response.data);
      }
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
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
      {/* App Header */}
      <header className="app-header">
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
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Department Filter with Sort Options */}
      <div className="filter-section">
        <div className="filter-header">
          <span className="filter-label">Filter by Department:</span>
        </div>
        <div className="department-filters">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              className={`filter-chip ${selectedDepartment === dept ? 'active' : ''}`}
              onClick={() => setSelectedDepartment(dept)}
            >
              {dept}
            </button>
          ))}
        </div>
        <p className="filter-count">
          Showing {filteredTeachers.length} of {teachers.length} teachers
        </p>
      </div>

      {/* Teachers List */}
      <div className="teachers-list">
        {filteredTeachers.length > 0 ? (
          <div className="teachers-grid">
            {filteredTeachers.map(teacher => (
              <div 
                key={teacher.id} 
                className="teacher-card"
                onClick={() => handleEvaluate(teacher.id)}
              >
                {/* Avatar */}
                <div className="teacher-avatar">
                  {teacher.picture_url ? (
                    <img src={teacher.picture_url} alt={teacher.name} />
                  ) : (
                    <div className="avatar-initial">
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
                  <button 
                    className="btn-evaluate"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEvaluate(teacher.id);
                    }}
                  >
                    Evaluate →
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
      <nav className="bottom-nav">
        <button className="bottom-nav-btn" title="Home" onClick={() => window.location.reload()}>
          <Home size={24} className="nav-icon" />
          <span className="nav-label">Home</span>
        </button>
        <button className="bottom-nav-btn" title="Refresh" onClick={fetchTeachers}>
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
