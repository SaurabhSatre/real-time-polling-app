const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    minlength: [2, 'Name must be at least 2 characters long']
  },
  socketId: {
    type: String,
    required: [true, 'Socket ID is required'],
    unique: true
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isKicked: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  pollsParticipated: [{
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll'
    },
    answeredAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for session duration
StudentSchema.virtual('sessionDuration').get(function() {
  return Math.round((new Date() - this.joinedAt) / 1000 / 60); // in minutes
});

// Update last activity before save
StudentSchema.pre('save', function() {
  this.lastActivity = new Date();
});

// Indexes
StudentSchema.index({ socketId: 1 });
StudentSchema.index({ sessionId: 1 });
StudentSchema.index({ isActive: 1, isKicked: 1 });

module.exports = mongoose.model('Student', StudentSchema);
