const express = require('express');
const router = express.Router();
const {
  submitAnswer,
  getAnswersByPoll,
  getStudentAnswer
} = require('../controllers/answerController');
const { validateAnswerMiddleware } = require('../middleware/validation');

// @route   POST /api/answers
// @desc    Submit an answer
// @access  Public (Student)
router.post('/', validateAnswerMiddleware, submitAnswer);

// @route   GET /api/answers/poll/:pollId
// @desc    Get all answers for a poll
// @access  Public
router.get('/poll/:pollId', getAnswersByPoll);

// @route   GET /api/answers/poll/:pollId/student/:studentId
// @desc    Get specific student's answer for a poll
// @access  Public
router.get('/poll/:pollId/student/:studentId', getStudentAnswer);

module.exports = router;
