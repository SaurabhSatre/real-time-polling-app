const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: [true, 'Poll ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  studentName: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  optionId: {
    type: Number,
    required: [true, 'Option ID is required'],
    min: [1, 'Option ID must be at least 1']
  },
  optionText: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  timeToAnswer: {
    type: Number,
    min: 0,
    max: 300
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate answers
AnswerSchema.index({ pollId: 1, studentId: 1 }, { unique: true });
AnswerSchema.index({ pollId: 1, submittedAt: -1 });

module.exports = mongoose.model('Answer', AnswerSchema);
