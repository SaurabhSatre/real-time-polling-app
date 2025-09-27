const express = require('express');
const router = express.Router();

// Import route modules
const pollRoutes = require('./polls');
const studentRoutes = require('./students');
const answerRoutes = require('./answers');
const chatRoutes = require('./chat');

// API version and welcome message
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Polling System API',
    version: '1.0.0',
    endpoints: {
      polls: '/api/polls',
      students: '/api/students', 
      answers: '/api/answers',
      chat: '/api/chat'
    },
    availableRoutes: {
      'POST /api/polls': 'Create new poll',
      'GET /api/polls/current': 'Get active poll',
      'GET /api/polls/history': 'Get poll history',
      'GET /api/polls/:pollId/results': 'Get poll results',
      'PUT /api/polls/:pollId/end': 'End poll',
      'POST /api/students': 'Add student',
      'GET /api/students': 'Get all students',
      'POST /api/answers': 'Submit answer'
    }
  });
});

// Use route modules
router.use('/polls', pollRoutes);
router.use('/students', studentRoutes);
router.use('/answers', answerRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
