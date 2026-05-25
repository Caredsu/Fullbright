import React, { useState, useEffect } from 'react';
import { X, Bell, AlertCircle } from 'lucide-react';
import socketService from '../services/socket';
import '../styles/notifications.css';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    // Get admin ID from stored user data
    const adminUserData = localStorage.getItem('adminUser');
    let adminId = null;
    
    if (adminUserData) {
      try {
        const userData = JSON.parse(adminUserData);
        adminId = userData.id || userData._id || userData.username;
        console.log('🔐 Admin ID for Socket.IO:', adminId);
      } catch (err) {
        console.error('Failed to parse admin user data:', err);
      }
    }
    
    if (!adminId) {
      console.warn('⚠️ No admin ID found in localStorage');
    }

    // Connect to Socket.IO using environment variable or default to localhost
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL 
      : 'http://localhost:3001';
    socketService.connect(socketUrl, adminId);

    // Listen for new evaluations
    socketService.onNewEvaluation((data) => {
      addNotification({
        type: 'evaluation',
        title: '📊 New Evaluation',
        message: `Evaluation submitted for teacher`,
        data: data.data,
        time: new Date()
      });
    });

    // Listen for teacher added
    socketService.onTeacherAdded((data) => {
      addNotification({
        type: 'teacher_added',
        title: '👨‍🏫 Teacher Added',
        message: `New teacher: ${data.data.first_name} ${data.data.last_name}`,
        data: data.data,
        time: new Date()
      });
    });

    // Listen for teacher updated
    socketService.onTeacherUpdated((data) => {
      addNotification({
        type: 'teacher_updated',
        title: '✏️ Teacher Updated',
        message: `${data.data.first_name} ${data.data.last_name} information updated`,
        data: data.data,
        time: new Date()
      });
    });

    return () => {
      socketService.off('new-evaluation');
      socketService.off('teacher-added');
      socketService.off('teacher-updated');
    };
  }, []);

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotif = { ...notification, id, read: false };
    
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 10000);
  };

  const removeNotification = (id) => {
    // Decrement unreadCount only if the notification being removed was unread
    setNotifications(prev => {
      const notifToRemove = prev.find(n => n.id === id);
      if (notifToRemove && !notifToRemove.read) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAll = () => {
    // Count unread notifications before clearing
    setNotifications(prev => {
      const unreadCount = prev.filter(n => !n.read).length;
      setUnreadCount(prevCount => Math.max(0, prevCount - unreadCount));
      return [];
    });
  };

  return (
    <div className="notification-center">
      {/* Bell Icon Button */}
      <button 
        className="notification-bell"
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className="clear-btn"
                onClick={clearAll}
                title="Clear all"
              >
                Clear
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={32} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="notification-content">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    <span className="notification-time">
                      {formatTime(notif.time)}
                    </span>
                  </div>
                  <button
                    className="close-notif"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notif.id);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Format time - show "just now", "2m ago", etc
const formatTime = (date) => {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
