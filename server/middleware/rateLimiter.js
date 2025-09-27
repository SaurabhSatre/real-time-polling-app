const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000) // in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
    });
  }
});

// Strict rate limiter for poll creation
const pollCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 poll creations per 5 minutes
  message: {
    success: false,
    message: 'Too many polls created from this IP, please wait before creating another poll.',
  },
  skipSuccessfulRequests: true
});

// Chat message rate limiter
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    success: false,
    message: 'Too many messages sent, please slow down.',
  }
});

// Student join rate limiter
const studentJoinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 students can join per 10 minutes from same IP
  message: {
    success: false,
    message: 'Too many students joining from this IP, please try again later.',
  }
});

// Answer submission rate limiter
const answerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 answer submissions per minute
  message: {
    success: false,
    message: 'Too many answer submissions, please slow down.',
  }
});

// Create custom rate limiter
const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

module.exports = {
  apiLimiter,
  pollCreationLimiter,
  chatLimiter,
  studentJoinLimiter,
  answerLimiter,
  createRateLimiter
};
