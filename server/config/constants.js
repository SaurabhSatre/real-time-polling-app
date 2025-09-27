module.exports = {
    // Poll constants
    POLL: {
      MAX_OPTIONS: 6,
      MIN_OPTIONS: 2,
      DEFAULT_TIME_LIMIT: 60,
      MAX_TIME_LIMIT: 300,
      MIN_TIME_LIMIT: 10,
      MAX_QUESTION_LENGTH: 500,
      MAX_OPTION_LENGTH: 200
    },
  
    // Student constants
    STUDENT: {
      MAX_NAME_LENGTH: 100,
      MIN_NAME_LENGTH: 2,
      SESSION_TIMEOUT: 3600000, // 1 hour in ms
      MAX_INACTIVE_TIME: 300000 // 5 minutes in ms
    },
  
    // Chat constants
    CHAT: {
      MAX_MESSAGE_LENGTH: 500,
      MAX_HISTORY_LENGTH: 100
    },
  
    // Socket events
    EVENTS: {
      // Poll events
      POLL_CREATE: 'poll:create',
      POLL_NEW: 'poll:new',
      POLL_UPDATE: 'poll:update',
      POLL_END: 'poll:end',
      POLL_ENDED: 'poll:ended',
      POLL_RESULTS: 'poll:results',
  
      // Student events
      STUDENT_JOIN: 'student:join',
      STUDENT_JOINED: 'student:joined',
      STUDENT_LEFT: 'student:left',
      STUDENT_KICK: 'student:kick',
      STUDENT_KICKED: 'student:kicked',
  
      // Answer events
      ANSWER_SUBMIT: 'answer:submit',
      ANSWER_SUBMITTED: 'answer:submitted',
  
      // Chat events
      CHAT_MESSAGE: 'chat:message',
      CHAT_HISTORY: 'chat:history',
  
      // General events
      ERROR: 'error',
      PARTICIPANTS_UPDATE: 'participants:update',
      PARTICIPANTS_COUNT: 'participants:count'
    },
  
    // Response messages
    MESSAGES: {
      SUCCESS: {
        POLL_CREATED: 'Poll created successfully',
        POLL_ENDED: 'Poll ended successfully',
        ANSWER_SUBMITTED: 'Answer submitted successfully',
        STUDENT_JOINED: 'Student joined successfully',
        STUDENT_KICKED: 'Student removed successfully'
      },
      ERROR: {
        POLL_NOT_FOUND: 'Poll not found',
        POLL_NOT_ACTIVE: 'Poll is not active',
        STUDENT_NOT_FOUND: 'Student not found',
        ALREADY_ANSWERED: 'Student has already answered this poll',
        INVALID_OPTION: 'Invalid option selected',
        UNAUTHORIZED: 'Unauthorized access',
        VALIDATION_ERROR: 'Validation error'
      }
    }
  };
  