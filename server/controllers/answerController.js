const Answer = require('../models/Answer');
const Poll = require('../models/Poll');
const Student = require('../models/Student');
const { validateAnswer } = require('../utils/validation');

exports.submitAnswer = async (req, res) => {
  try {
    const { error } = validateAnswer(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { pollId, studentId, optionId, timeToAnswer } = req.body;

    // Check if poll exists and is active
    const poll = await Poll.findById(pollId);
    if (!poll || !poll.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Poll is not active or does not exist'
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student || student.isKicked) {
      return res.status(400).json({
        success: false,
        message: 'Student not found or has been kicked'
      });
    }

    // Check if student has already answered
    const existingAnswer = await Answer.findOne({ pollId, studentId });
    if (existingAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Student has already answered this poll'
      });
    }

    // Find the selected option
    const selectedOption = poll.options.find(opt => opt.id === optionId);
    if (!selectedOption) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option selected'
      });
    }

    // Create answer
    const answer = new Answer({
      pollId,
      studentId,
      studentName: student.name,
      optionId,
      optionText: selectedOption.text,
      timeToAnswer
    });

    await answer.save();

    // Update poll statistics
    await Poll.findByIdAndUpdate(pollId, {
      $inc: { 
        answeredStudents: 1,
        'options.$[elem].votes': 1
      }
    }, {
      arrayFilters: [{ 'elem.id': optionId }]
    });

    // Get updated poll for real-time results
    const updatedPoll = await Poll.findById(pollId);

    res.status(201).json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        answer,
        poll: updatedPoll
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message
    });
  }
};

exports.getAnswersByPoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const answers = await Answer.find({ pollId })
      .populate('studentId', 'name sessionId')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: answers
    });
  } catch (error) {
    console.error('Get answers by poll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get answers',
      error: error.message
    });
  }
};

exports.getStudentAnswer = async (req, res) => {
  try {
    const { pollId, studentId } = req.params;

    const answer = await Answer.findOne({ pollId, studentId })
      .populate('pollId', 'question options');

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: answer
    });
  } catch (error) {
    console.error('Get student answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student answer',
      error: error.message
    });
  }
};
