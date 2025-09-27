const Chat = require('../models/Chat');
const Student = require('../models/Student');
const { validateSocketMessage } = require('../utils/validation');
const logger = require('../utils/logger');
const { EVENTS, CHAT } = require('../config/constants');

module.exports = (socket, io, connectedUsers) => {

  // Handle chat message
  socket.on(EVENTS.CHAT_MESSAGE, async (messageData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'User not found' 
        });
      }

      const { error } = validateSocketMessage(messageData);
      if (error) {
        return socket.emit(EVENTS.ERROR, { 
          message: error.details[0].message 
        });
      }

      const { message } = messageData;

      // Additional validation for message content
      if (message.trim().length === 0) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Message cannot be empty' 
        });
      }

      if (message.length > CHAT.MAX_MESSAGE_LENGTH) {
        return socket.emit(EVENTS.ERROR, { 
          message: `Message cannot exceed ${CHAT.MAX_MESSAGE_LENGTH} characters` 
        });
      }

      // If sender is student, verify student exists and is not kicked
      if (user.role === 'student') {
        const student = await Student.findById(user.id);
        if (!student || student.isKicked || !student.isActive) {
          return socket.emit(EVENTS.ERROR, { 
            message: 'Student not found or has been removed' 
          });
        }
      }

      // Create chat message
      const chatMessage = new Chat({
        senderId: user.id || socket.id,
        senderName: user.name || (user.role === 'teacher' ? 'Teacher' : 'Student'),
        senderRole: user.role,
        message: message.trim(),
        timestamp: new Date()
      });

      await chatMessage.save();

      // Prepare message for broadcast
      const broadcastMessage = {
        id: chatMessage._id,
        senderId: chatMessage.senderId,
        senderName: chatMessage.senderName,
        senderRole: chatMessage.senderRole,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp
      };

      // Broadcast message to all connected users
      io.emit(EVENTS.CHAT_MESSAGE, broadcastMessage);

      logger.info(`Chat message from ${user.role}: ${user.name}`, { 
        messageId: chatMessage._id,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
      });

    } catch (error) {
      logger.error('Chat message error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to send message' 
      });
    }
  });

  // Handle get chat history
  socket.on(EVENTS.CHAT_HISTORY, async (requestData = {}) => {
    try {
      const { limit = 50, since } = requestData;
      
      let query = { isDeleted: false };
      
      // If 'since' timestamp provided, get messages after that time
      if (since) {
        const sinceDate = new Date(since);
        if (!isNaN(sinceDate.getTime())) {
          query.timestamp = { $gt: sinceDate };
        }
      }

      const messages = await Chat.find(query)
        .sort({ timestamp: -1 })
        .limit(Math.min(parseInt(limit), CHAT.MAX_HISTORY_LENGTH))
        .lean();

      // Reverse to show chronological order (oldest first)
      messages.reverse();

      // Format messages for client
      const formattedMessages = messages.map(msg => ({
        id: msg._id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        message: msg.message,
        timestamp: msg.timestamp
      }));

      socket.emit(EVENTS.CHAT_HISTORY, formattedMessages);

    } catch (error) {
      logger.error('Get chat history error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to get chat history' 
      });
    }
  });

  // Handle delete chat message (teacher only)
  socket.on('chat:delete', async (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'User not found' 
        });
      }

      const { messageId } = data;

      if (!messageId) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Message ID is required' 
        });
      }

      const message = await Chat.findById(messageId);
      if (!message) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Message not found' 
        });
      }

      // Check permissions - only teachers or message senders can delete
      if (user.role !== 'teacher' && message.senderId !== user.id) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Unauthorized to delete this message' 
        });
      }

      // Soft delete
      message.isDeleted = true;
      await message.save();

      // Notify all users about message deletion
      io.emit('chat:message-deleted', { messageId });

      logger.info(`Chat message deleted by ${user.role}: ${user.name}`, { 
        messageId,
        originalSender: message.senderName
      });

    } catch (error) {
      logger.error('Delete chat message error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to delete message' 
      });
    }
  });

  // Handle clear all chat (teacher only)
  socket.on('chat:clear-all', async () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || user.role !== 'teacher') {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Only teachers can clear chat history' 
        });
      }

      // Soft delete all messages
      await Chat.updateMany(
        { isDeleted: false },
        { isDeleted: true }
      );

      // Notify all users about chat clear
      io.emit('chat:cleared');

      logger.info(`Chat history cleared by teacher: ${user.name}`);

    } catch (error) {
      logger.error('Clear chat error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to clear chat history' 
      });
    }
  });

  // Handle typing indicator
  socket.on('chat:typing', (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { isTyping } = data;

      // Broadcast typing status to all other users
      socket.broadcast.emit('chat:user-typing', {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        isTyping
      });

    } catch (error) {
      logger.error('Chat typing error:', error);
    }
  });

  // Handle chat connection/disconnection
  socket.on('chat:join', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.join('chat');
        logger.info(`User joined chat: ${user.name} (${user.role})`);
      }
    } catch (error) {
      logger.error('Chat join error:', error);
    }
  });

  socket.on('chat:leave', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.leave('chat');
        logger.info(`User left chat: ${user.name} (${user.role})`);
      }
    } catch (error) {
      logger.error('Chat leave error:', error);
    }
  });
};
