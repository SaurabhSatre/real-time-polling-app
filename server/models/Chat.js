const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: [true, 'Sender ID is required']
  },
  senderName: {
    type: String,
    required: [true, 'Sender name is required'],
    trim: true
  },
  senderRole: {
    type: String,
    enum: ['teacher', 'student'],
    required: [true, 'Sender role is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
ChatSchema.index({ timestamp: -1 });
ChatSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Chat', ChatSchema);
