const pollEvents = require('./pollEvents');
const studentEvents = require('./studentEvents');
const chatEvents = require('./chatEvents');
const logger = require('../utils/logger');

const connectedUsers = new Map();
const activeRooms = new Set();

module.exports = (io) => {
  io.on('connection', (socket) => {
    logger.info(`New connection: ${socket.id}`);

    // Initialize event handlers
    pollEvents(socket, io, connectedUsers);
    studentEvents(socket, io, connectedUsers);
    chatEvents(socket, io, connectedUsers);

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      try {
        const user = connectedUsers.get(socket.id);
        
        if (user && user.role === 'student') {
          await require('../controllers/studentController').handleDisconnect(user.id);
          
          // Notify all users about student leaving
          socket.broadcast.emit('student:left', {
            studentId: user.id,
            name: user.name
          });
          
          // Update participants count
          const Student = require('../models/Student');
          const activeCount = await Student.countDocuments({ isActive: true, isKicked: false });
          io.emit('participants:count', activeCount);
        }

        connectedUsers.delete(socket.id);
        logger.info(`User disconnected: ${socket.id}, reason: ${reason}`);
      } catch (error) {
        logger.error('Disconnect error:', error);
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Global error handling
  io.engine.on('connection_error', (err) => {
    logger.error('Connection error:', err);
  });
};
