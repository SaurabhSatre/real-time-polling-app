const { 
    validatePoll, 
    validateAnswer, 
    validateStudent, 
    validateChatMessage,
    validatePaginationQuery 
  } = require('../utils/validation');
  
  // Middleware to validate poll creation
  const validatePollMiddleware = (req, res, next) => {
    const { error } = validatePoll(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
  
  // Middleware to validate answer submission
  const validateAnswerMiddleware = (req, res, next) => {
    const { error } = validateAnswer(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
  
  // Middleware to validate student data
  const validateStudentMiddleware = (req, res, next) => {
    const { error } = validateStudent(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
  
  // Middleware to validate chat message
  const validateChatMiddleware = (req, res, next) => {
    const { error } = validateChatMessage(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message,
        field: error.details[0].path[0]
      });
    }
    next();
  };
  
  // Middleware to validate pagination query
  const validatePaginationMiddleware = (req, res, next) => {
    const { error, value } = validatePaginationQuery(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        details: error.details[0].message
      });
    }
    // Attach validated values to request
    req.pagination = value;
    next();
  };
  
  // Generic validation middleware factory
  const validateRequest = (validator) => {
    return (req, res, next) => {
      const { error } = validator(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        });
      }
      next();
    };
  };
  
  module.exports = {
    validatePollMiddleware,
    validateAnswerMiddleware,
    validateStudentMiddleware,
    validateChatMiddleware,
    validatePaginationMiddleware,
    validateRequest
  };
  