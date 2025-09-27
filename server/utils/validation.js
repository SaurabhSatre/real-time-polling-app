const Joi = require('joi');

const validatePoll = (poll) => {
  const schema = Joi.object({
    question: Joi.string().min(5).max(500).required(),
    options: Joi.array().items(Joi.string().min(1).max(100)).min(2).max(6).required(),
    timeLimit: Joi.number().min(10).max(300).optional()
  });

  return schema.validate(poll);
};

const validateAnswer = (answer) => {
  const schema = Joi.object({
    pollId: Joi.string().required(),
    studentId: Joi.string().required(),
    optionId: Joi.number().required(),
    timeToAnswer: Joi.number().optional()
  });

  return schema.validate(answer);
};

const validateStudent = (student) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    socketId: Joi.string().required()
  });

  return schema.validate(student);
};

// Add chat message validation
const validateChatMessage = (data) => {
  const schema = Joi.object({
    senderId: Joi.string().required(),
    senderName: Joi.string().min(2).max(100).required(),
    senderRole: Joi.string().valid('teacher', 'student').required(),
    message: Joi.string().min(1).max(500).required().trim()
  });

  return schema.validate(data);
};

// Add socket chat message validation (simplified for socket events)
const validateSocketMessage = (data) => {
  const schema = Joi.object({
    message: Joi.string().min(1).max(500).required().trim(),
    timestamp: Joi.date().optional()
  });

  return schema.validate(data);
};

// Add student join validation
const validateStudentJoin = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    role: Joi.string().valid('student').optional()
  });

  return schema.validate(data);
};

// Add teacher join validation
const validateTeacherJoin = (data) => {
  const schema = Joi.object({
    role: Joi.string().valid('teacher').required(),
    password: Joi.string().optional() // Optional teacher password
  });

  return schema.validate(data);
};

// Add poll update validation
const validatePollUpdate = (data) => {
  const schema = Joi.object({
    question: Joi.string().min(5).max(500).optional(),
    timeLimit: Joi.number().min(10).max(300).optional(),
    status: Joi.string().valid('active', 'completed', 'expired').optional()
  });

  return schema.validate(data);
};

// Add student kick validation
const validateStudentKick = (data) => {
  const schema = Joi.object({
    studentId: Joi.string().required(),
    reason: Joi.string().max(200).optional()
  });

  return schema.validate(data);
};

// Add query parameters validation
const validatePaginationQuery = (query) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sort: Joi.string().valid('asc', 'desc').default('desc')
  });

  return schema.validate(query);
};

// Add date range validation
const validateDateRange = (data) => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    timezone: Joi.string().optional()
  });

  return schema.validate(data);
};

module.exports = {
  validatePoll,
  validateAnswer,
  validateStudent,
  validateChatMessage,
  validateSocketMessage,
  validateStudentJoin,
  validateTeacherJoin,
  validatePollUpdate,
  validateStudentKick,
  validatePaginationQuery,
  validateDateRange
};
