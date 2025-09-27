const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'INFO';
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const logData = {
      timestamp,
      level,
      message,
      ...meta
    };

    if (this.isDevelopment) {
      return JSON.stringify(logData, null, 2);
    } else {
      return JSON.stringify(logData);
    }
  }

  /**
   * Write log to file
   */
  writeToFile(level, formattedMessage) {
    const filename = `${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(logsDir, filename);
    
    const logLine = formattedMessage + '\n';
    
    fs.appendFile(filepath, logLine, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  /**
   * Should log based on level
   */
  shouldLog(level) {
    const currentLevel = LOG_LEVELS[this.level] || LOG_LEVELS.INFO;
    const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    return messageLevel <= currentLevel;
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    if (!this.shouldLog('ERROR')) return;

    const formattedMessage = this.formatMessage('ERROR', message, meta);
    
    // Always log errors to console
    console.error('\x1b[31m%s\x1b[0m', formattedMessage);
    
    // Write to file
    this.writeToFile('ERROR', formattedMessage);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    if (!this.shouldLog('WARN')) return;

    const formattedMessage = this.formatMessage('WARN', message, meta);
    
    if (this.isDevelopment) {
      console.warn('\x1b[33m%s\x1b[0m', formattedMessage);
    }
    
    this.writeToFile('WARN', formattedMessage);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    if (!this.shouldLog('INFO')) return;

    const formattedMessage = this.formatMessage('INFO', message, meta);
    
    if (this.isDevelopment) {
      console.info('\x1b[36m%s\x1b[0m', formattedMessage);
    }
    
    this.writeToFile('INFO', formattedMessage);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    if (!this.shouldLog('DEBUG')) return;

    const formattedMessage = this.formatMessage('DEBUG', message, meta);
    
    if (this.isDevelopment) {
      console.debug('\x1b[35m%s\x1b[0m', formattedMessage);
    }
    
    this.writeToFile('DEBUG', formattedMessage);
  }

  /**
   * Log HTTP request
   */
  http(req, res, responseTime = 0) {
    const meta = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length') || 0
    };

    const message = `${req.method} ${req.url} ${res.statusCode} ${responseTime}ms`;
    
    if (res.statusCode >= 400) {
      this.error(message, meta);
    } else {
      this.info(message, meta);
    }
  }

  /**
   * Log database operation
   */
  database(operation, collection, meta = {}) {
    this.debug(`Database ${operation} on ${collection}`, meta);
  }

  /**
   * Log socket event
   */
  socket(event, socketId, meta = {}) {
    this.debug(`Socket event: ${event}`, { socketId, ...meta });
  }

  /**
   * Log authentication event
   */
  auth(action, user, meta = {}) {
    this.info(`Auth ${action}`, { user, ...meta });
  }

  /**
   * Create child logger with context
   */
  child(context = {}) {
    const childLogger = new Logger();
    const originalMethods = ['error', 'warn', 'info', 'debug'];
    
    originalMethods.forEach(method => {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (message, meta = {}) => {
        originalMethod(message, { ...context, ...meta });
      };
    });

    return childLogger;
  }

  /**
   * Clean old log files
   */
  cleanOldLogs(daysToKeep = 30) {
    fs.readdir(logsDir, (err, files) => {
      if (err) {
        this.error('Failed to read logs directory', { error: err.message });
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) return;

          if (stats.mtime < cutoffDate) {
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) {
                this.error('Failed to delete old log file', { 
                  file, 
                  error: unlinkErr.message 
                });
              } else {
                this.info('Deleted old log file', { file });
              }
            });
          }
        });
      });
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Clean old logs on startup
logger.cleanOldLogs();

// Express middleware for logging HTTP requests
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.http(req, res, responseTime);
  });

  next();
};

module.exports = logger;
module.exports.httpLogger = httpLogger;
