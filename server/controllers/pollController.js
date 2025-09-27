const Poll = require('../models/Poll');
const Student = require('../models/Student');
const Answer = require('../models/Answer');
const { validatePoll } = require('../utils/validation');

exports.createPoll = async (req, res) => {
  try {
    const { error } = validatePoll(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Deactivate any existing active polls
    await Poll.updateMany({ isActive: true }, { isActive: false });

    const { question, options, timeLimit = 60 } = req.body;
    
    const formattedOptions = options.map((option, index) => ({
      id: index + 1,
      text: option,
      votes: 0
    }));

    const poll = new Poll({
      question,
      options: formattedOptions,
      timeLimit,
      endTime: new Date(Date.now() + timeLimit * 1000)
    });

    await poll.save();

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      data: poll
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create poll',
      error: error.message
    });
  }
};

exports.getCurrentPoll = async (req, res) => {
  try {
    const poll = await Poll.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'No active poll found'
      });
    }

    res.status(200).json({
      success: true,
      data: poll
    });
  } catch (error) {
    console.error('Get current poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current poll',
      error: error.message
    });
  }
};

exports.getPollHistory = async (req, res) => {
  try {
    const polls = await Poll.find({ isActive: false })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: polls
    });
  } catch (error) {
    console.error('Get poll history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get poll history',
      error: error.message
    });
  }
};

exports.endPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    
    const poll = await Poll.findByIdAndUpdate(
      pollId,
      { 
        isActive: false,
        endTime: new Date()
      },
      { new: true }
    );

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Poll ended successfully',
      data: poll
    });
  } catch (error) {
    console.error('End poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end poll',
      error: error.message
    });
  }
};

exports.getPollResults = async (req, res) => {
  try {
    const { pollId } = req.params;
    
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    const answers = await Answer.find({ pollId })
      .populate('studentId', 'name')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        poll,
        answers,
        summary: poll.results
      }
    });
  } catch (error) {
    console.error('Get poll results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get poll results',
      error: error.message
    });
  }
};
