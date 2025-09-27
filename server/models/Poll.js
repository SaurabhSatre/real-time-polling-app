const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters'],
    minlength: [5, 'Question must be at least 5 characters long']
  },
  options: [{
    id: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Option cannot exceed 200 characters']
    },
    votes: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  timeLimit: {
    type: Number,
    default: 60,
    min: [10, 'Time limit must be at least 10 seconds'],
    max: [300, 'Time limit cannot exceed 300 seconds']
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  totalStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  answeredStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  results: [{
    optionId: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
PollSchema.virtual('completionPercentage').get(function() {
  if (this.totalStudents === 0) return 0;
  return Math.round((this.answeredStudents / this.totalStudents) * 100);
});

// Calculate results before saving
PollSchema.pre('save', function() {
  if (this.answeredStudents > 0) {
    this.results = this.options.map(option => ({
      optionId: option.id,
      count: option.votes,
      percentage: Math.round((option.votes / this.answeredStudents) * 100)
    }));
  }
  
  // Set end time if not set
  if (!this.endTime && this.startTime) {
    this.endTime = new Date(this.startTime.getTime() + this.timeLimit * 1000);
  }
});

// Index for better query performance
PollSchema.index({ isActive: 1, createdAt: -1 });
PollSchema.index({ status: 1 });

module.exports = mongoose.model('Poll', PollSchema);
