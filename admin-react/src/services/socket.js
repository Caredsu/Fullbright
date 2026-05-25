import io from 'socket.io-client';

/**
 * Socket.IO Client Service
 * Manages real-time notifications from backend
 */

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  /**
   * Initialize Socket.IO connection
   * @param {String} url - Server URL
   * @param {String} adminId - Admin user ID
   */
  connect(url = 'http://localhost:3001', adminId = null) {
    if (this.socket) {
      return this.socket;
    }

    console.log('🔌 Attempting Socket.IO connection to:', url);
    
    this.socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      // Use both WebSocket and polling for better compatibility
      transports: ['websocket', 'polling'],
      // For Render/production HTTPS
      secure: url.includes('https'),
      // RejectUnauthorized for self-signed certs if needed
      rejectUnauthorized: false
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      this.isConnected = true;
      
      // Tell server admin is here
      if (adminId) {
        console.log('📍 Emitting admin-join with ID:', adminId);
        this.socket.emit('admin-join', adminId);
      } else {
        console.warn('⚠️ No adminId provided for Socket.IO connection');
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    return this.socket;
  }

  /**
   * Listen for new evaluations
   * @param {Function} callback - Called when evaluation is received
   */
  onNewEvaluation(callback) {
    if (this.socket) {
      this.socket.on('new-evaluation', callback);
    }
  }

  /**
   * Listen for teacher added
   * @param {Function} callback
   */
  onTeacherAdded(callback) {
    if (this.socket) {
      this.socket.on('teacher-added', callback);
    }
  }

  /**
   * Listen for teacher updated
   * @param {Function} callback
   */
  onTeacherUpdated(callback) {
    if (this.socket) {
      this.socket.on('teacher-updated', callback);
    }
  }

  /**
   * Remove listener
   * @param {String} event - Event name
   */
  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new SocketService();
