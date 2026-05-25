import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const { user, token } = response.data;
      onLogin(user, token);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundImage: 'url(/fbc_logo2.png), linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundAttachment: 'fixed',
      backgroundSize: 'cover',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)'
      }} />

      {/* Card Container */}
      <div style={{
        position: 'relative',
        zIndex: 10
      }}>
        <div className="card" style={{
          width: '450px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          animation: 'slideUp 0.6s ease-out'
        }}>
          <div className="card-body p-6" style={{ padding: '48px' }}>
            {/* Logo Section */}
            <div className="text-center mb-5">
              <img
                src="/fbc_logo2.png"
                alt="School Logo"
                style={{
                  maxHeight: '80px',
                  marginBottom: '16px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />
              <h2 className="text-center mb-2" style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#333',
                letterSpacing: '-0.5px'
              }}>
                Admin Portal
              </h2>
              <p style={{
                color: '#666',
                fontSize: '14px',
                margin: 0
              }}>
                Teacher Evaluation System
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="alert alert-danger" style={{
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="username" className="form-label" style={{
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '8px'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    padding: '10px 14px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="form-label" style={{
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '8px'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    padding: '10px 14px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="btn w-100"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  border: 'none',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Footer Text */}
            <p style={{
              textAlign: 'center',
              color: '#999',
              fontSize: '12px',
              marginTop: '24px',
              margin: '24px 0 0 0'
            }}>
              © {new Date().getFullYear()} Teacher Evaluation System
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Login;
