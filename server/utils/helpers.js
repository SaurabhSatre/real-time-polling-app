const crypto = require('crypto');
const { POLL, STUDENT, CHAT } = require('../config/constants');

/**
 * Generate a random session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate a random room ID for polls
 */
const generateRoomId = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .trim()
    .substring(0, 1000); // Limit length
};

/**
 * Validate poll options
 */
const validatePollOptions = (options) => {
  if (!Array.isArray(options)) return false;
  if (options.length < POLL.MIN_OPTIONS || options.length > POLL.MAX_OPTIONS) return false;
  
  return options.every(option => 
    typeof option === 'string' && 
    option.trim().length > 0 && 
    option.length <= POLL.MAX_OPTION_LENGTH
  );
};

/**
 * Calculate poll results with percentages
 */
const calculatePollResults = (options, totalAnswers) => {
  if (totalAnswers === 0) {
    return options.map(option => ({
      optionId: option.id,
      text: option.text,
      votes: 0,
      percentage: 0
    }));
  }

  return options.map(option => ({
    optionId: option.id,
    text: option.text,
    votes: option.votes,
    percentage: Math.round((option.votes / totalAnswers) * 100)
  }));
};

/**
 * Format time duration in human-readable format
 */
const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

/**
 * Check if poll has expired
 */
const isPollExpired = (poll) => {
  if (!poll.endTime) return false;
  return new Date() > new Date(poll.endTime);
};

/**
 * Get remaining time for poll in seconds
 */
const getPollRemainingTime = (poll) => {
  if (!poll.endTime) return 0;
  const now = new Date();
  const endTime = new Date(poll.endTime);
  const remainingMs = endTime.getTime() - now.getTime();
  return Math.max(0, Math.floor(remainingMs / 1000));
};

/**
 * Format student name for display
 */
const formatStudentName = (name) => {
  if (typeof name !== 'string') return 'Anonymous';
  return name.trim().substring(0, STUDENT.MAX_NAME_LENGTH);
};

/**
 * Check if student session is valid
 */
const isSessionValid = (student) => {
  if (!student || !student.joinedAt) return false;
  
  const now = new Date();
  const joinTime = new Date(student.joinedAt);
  const sessionAge = now.getTime() - joinTime.getTime();
  
  return sessionAge < STUDENT.SESSION_TIMEOUT;
};

/**
 * Generate poll summary
 */
const generatePollSummary = (poll, answers) => {
  const summary = {
    pollId: poll._id,
    question: poll.question,
    totalOptions: poll.options.length,
    totalStudents: poll.totalStudents || 0,
    answeredStudents: poll.answeredStudents || 0,
    responseRate: 0,
    results: [],
    topAnswer: null,
    createdAt: poll.createdAt,
    endedAt: poll.endTime,
    duration: 0
  };

  // Calculate response rate
  if (summary.totalStudents > 0) {
    summary.responseRate = Math.round((summary.answeredStudents / summary.totalStudents) * 100);
  }

  // Calculate results
  summary.results = calculatePollResults(poll.options, summary.answeredStudents);

  // Find top answer
  if (summary.results.length > 0) {
    summary.topAnswer = summary.results.reduce((prev, current) => 
      (current.votes > prev.votes) ? current : prev
    );
  }

  // Calculate duration
  if (poll.createdAt && poll.endTime) {
    const duration = new Date(poll.endTime).getTime() - new Date(poll.createdAt).getTime();
    summary.duration = Math.floor(duration / 1000);
  }

  return summary;
};

/**
 * Paginate array results
 */
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNext: endIndex < array.length,
      hasPrev: startIndex > 0
    }
  };

  return results;
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove sensitive data from student object
 */
const sanitizeStudentData = (student) => {
  const sanitized = deepClone(student);
  delete sanitized.socketId;
  delete sanitized.ipAddress;
  delete sanitized.userAgent;
  return sanitized;
};

/**
 * Generate error response
 */
const createErrorResponse = (message, statusCode = 500, details = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return { response, statusCode };
};

/**
 * Generate success response
 */
const createSuccessResponse = (message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return response;
};

/**
 * Convert string to slug
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
};

/**
 * Check if value is empty
 */
const isEmpty = (value) => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && Object.keys(value).length === 0)
  );
};

/**
 * Debounce function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

module.exports = {
  generateSessionId,
  generateRoomId,
  sanitizeInput,
  validatePollOptions,
  calculatePollResults,
  formatDuration,
  isPollExpired,
  getPollRemainingTime,
  formatStudentName,
  isSessionValid,
  generatePollSummary,
  paginate,
  deepClone,
  sanitizeStudentData,
  createErrorResponse,
  createSuccessResponse,
  slugify,
  isEmpty,
  debounce
};
