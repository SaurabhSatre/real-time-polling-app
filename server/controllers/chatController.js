const Chat = require('../models/Chat');
const Student = require('../models/Student');
const { validateChatMessage } = require('../utils/validation');
const { MESSAGES, CHAT } = require('../config/constants');

/**
 * Send a chat message
 * @route POST /api/chat/send
 * @access Public
 */
exports.sendMessage = async (req, res) => {
  try {
    const { error } = validateChatMessage(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.ERROR.VALIDATION_ERROR,
        details: error.details[0].message
      });
    }

    const { senderId, senderName, senderRole, message } = req.body;

    // Validate sender role
    if (!['teacher', 'student'].includes(senderRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sender role. Must be teacher or student'
      });
    }

    // If sender is student, verify student exists and is not kicked
    if (senderRole === 'student') {
      const student = await Student.findById(senderId);
      if (!student || student.isKicked || !student.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Student not found or has been removed'
        });
      }
    }

    // Create new chat message
    const chatMessage = new Chat({
      senderId,
      senderName,
      senderRole,
      message: message.trim(),
      timestamp: new Date()
    });

    await chatMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get chat history
 * @route GET /api/chat/history
 * @access Public
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * parseInt(limit);

    const messages = await Chat.find({ isDeleted: false })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Reverse to show oldest first
    messages.reverse();

    const totalMessages = await Chat.countDocuments({ isDeleted: false });

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / parseInt(limit)),
          totalMessages,
          hasNext: skip + messages.length < totalMessages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get recent chat messages for real-time sync
 * @route GET /api/chat/recent
 * @access Public
 */
exports.getRecentMessages = async (req, res) => {
  try {
    const { since } = req.query;
    let query = { isDeleted: false };

    // If 'since' timestamp provided, get messages after that time
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.timestamp = { $gt: sinceDate };
      }
    }

    const messages = await Chat.find(query)
      .sort({ timestamp: 1 })
      .limit(CHAT.MAX_HISTORY_LENGTH)
      .lean();

    res.status(200).json({
      success: true,
      data: messages
    });

  } catch (error) {
    console.error('Get recent messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a chat message (soft delete)
 * @route DELETE /api/chat/:messageId
 * @access Public (Teacher only)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { role, userId } = req.body;

    // Only teachers or message senders can delete messages
    const message = await Chat.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check permissions
    if (role !== 'teacher' && message.senderId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this message'
      });
    }

    // Soft delete
    message.isDeleted = true;
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Clear all chat messages (Teacher only)
 * @route DELETE /api/chat/clear
 * @access Public (Teacher only)
 */
exports.clearChat = async (req, res) => {
  try {
    const { role } = req.body;

    if (role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can clear chat history'
      });
    }

    // Soft delete all messages
    await Chat.updateMany(
      { isDeleted: false },
      { isDeleted: true }
    );

    res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully'
    });

  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get chat statistics
 * @route GET /api/chat/stats
 * @access Public (Teacher only)
 */
exports.getChatStats = async (req, res) => {
  try {
    const { role } = req.query;

    if (role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can view chat statistics'
      });
    }

    const stats = await Chat.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$senderRole',
          count: { $sum: 1 },
          latestMessage: { $max: '$timestamp' }
        }
      }
    ]);

    const totalMessages = await Chat.countDocuments({ isDeleted: false });
    const totalActiveUsers = await Student.countDocuments({ isActive: true, isKicked: false });

    const formattedStats = {
      totalMessages,
      totalActiveUsers,
      messagesByRole: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          latestMessage: stat.latestMessage
        };
        return acc;
      }, {}),
      chatActivity: {
        isActive: totalMessages > 0,
        lastActivity: stats.length > 0 ? Math.max(...stats.map(s => s.latestMessage)) : null
      }
    };

    res.status(200).json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Handle chat message broadcast (used by socket handler)
 * @param {Object} messageData - Message data from socket
 * @param {Object} userInfo - User information
 */
exports.handleSocketMessage = async (messageData, userInfo) => {
  try {
    const { message } = messageData;
    
    // Validate message length
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > CHAT.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message cannot exceed ${CHAT.MAX_MESSAGE_LENGTH} characters`);
    }

    // If sender is student, verify student exists and is not kicked
    if (userInfo.role === 'student') {
      const student = await Student.findById(userInfo.id);
      if (!student || student.isKicked || !student.isActive) {
        throw new Error('Student not found or has been removed');
      }
    }

    // Create new chat message
    const chatMessage = new Chat({
      senderId: userInfo.id || userInfo.socketId,
      senderName: userInfo.name || (userInfo.role === 'teacher' ? 'Teacher' : 'Student'),
      senderRole: userInfo.role,
      message: message.trim(),
      timestamp: new Date()
    });

    const savedMessage = await chatMessage.save();
    return savedMessage;

  } catch (error) {
    console.error('Handle socket message error:', error);
    throw error;
  }
};

/**
 * Clean old chat messages (maintenance function)
 * Can be called by a cron job or manually
 */
exports.cleanOldMessages = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Chat.deleteMany({
      timestamp: { $lt: cutoffDate },
      isDeleted: true
    });

    console.log(`Cleaned ${result.deletedCount} old chat messages`);
    return result.deletedCount;

  } catch (error) {
    console.error('Clean old messages error:', error);
    throw error;
  }
};
