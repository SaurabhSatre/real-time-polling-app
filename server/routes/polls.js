const express = require('express');
const router = express.Router();
const {
  createPoll,
  getCurrentPoll,
  getPollHistory,
  endPoll,
  getPollResults
} = require('../controllers/pollController');
const { validatePollMiddleware } = require('../middleware/validation');

// @route   POST /api/polls
// @desc    Create a new poll
// @access  Public (Teacher)
router.post('/', validatePollMiddleware, createPoll);

// @route   GET /api/polls/current
// @desc    Get current active poll
// @access  Public
router.get('/current', getCurrentPoll);

// @route   GET /api/polls/history
// @desc    Get poll history
// @access  Public (Teacher)
router.get('/history', getPollHistory);

// @route   PUT /api/polls/:pollId/end
// @desc    End a poll
// @access  Public (Teacher)
router.put('/:pollId/end', endPoll);

// @route   GET /api/polls/:pollId/results
// @desc    Get poll results
// @access  Public
router.get('/:pollId/results', getPollResults);

module.exports = router;
