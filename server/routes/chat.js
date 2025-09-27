const express = require('express');
const router = express.Router();
const { 
  sendMessage, 
  getChatHistory, 
  getRecentMessages,
  getChatStats,
  deleteMessage, 
  clearChat 
} = require('../controllers/chatController');
const { validateChatMiddleware, validatePaginationMiddleware } = require('../middleware/validation');

// @route   POST /api/chat/send
router.post('/send', validateChatMiddleware, sendMessage);

// @route   GET /api/chat/history
router.get('/history', validatePaginationMiddleware, getChatHistory);

// @route   GET /api/chat/recent
router.get('/recent', getRecentMessages);

// @route   GET /api/chat/stats
router.get('/stats', getChatStats);

// @route   DELETE /api/chat/:messageId
router.delete('/:messageId', deleteMessage);

// @route   DELETE /api/chat/clear
router.delete('/clear', clearChat);

module.exports = router;
