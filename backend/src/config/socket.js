import { Server } from 'socket.io';

/**
 * Socket.IO Configuration
 * Handles real-time notifications for admin dashboard
 */

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3003',
        'http://localhost:3004', // Admin React app
        'http://localhost:5173', // Vite dev server
        'http://localhost:3000'  // React web app
      ],
      credentials: true
    }
  });

  // Track connected admins
  const adminConnections = new Map();

  io.on('connection', (socket) => {
    console.log('📡 New client connected:', socket.id);

    // Admin joins notification room
    socket.on('admin-join', (adminId) => {
      socket.join('admins');
      adminConnections.set(adminId, socket.id);
      console.log(`✅ Admin ${adminId} joined notifications`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('📡 Client disconnected:', socket.id);
      // Remove admin from connections
      for (let [adminId, socketId] of adminConnections.entries()) {
        if (socketId === socket.id) {
          adminConnections.delete(adminId);
          break;
        }
      }
    });
  });

  return io;
};

/**
 * Emit evaluation notification to all connected admins
 * Usage: notifyNewEvaluation(io, { teacherId, studentId, rating })
 */
export const notifyNewEvaluation = (io, data) => {
  io.to('admins').emit('new-evaluation', {
    type: 'evaluation_submitted',
    timestamp: new Date(),
    data: {
      teacherId: data.teacherId,
      studentId: data.studentId,
      averageRating: data.averageRating,
      feedback: data.feedback
    }
  });
};

/**
 * Emit teacher added notification
 */
export const notifyTeacherAdded = (io, teacher) => {
  io.to('admins').emit('teacher-added', {
    type: 'teacher_created',
    timestamp: new Date(),
    data: teacher
  });
};

/**
 * Emit teacher updated notification
 */
export const notifyTeacherUpdated = (io, teacher) => {
  io.to('admins').emit('teacher-updated', {
    type: 'teacher_updated',
    timestamp: new Date(),
    data: teacher
  });
};
