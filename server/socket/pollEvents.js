const Poll = require('../models/Poll');
const Answer = require('../models/Answer');
const Student = require('../models/Student');
const { validatePoll } = require('../utils/validation');
const logger = require('../utils/logger');
const { EVENTS, MESSAGES } = require('../config/constants');

module.exports = (socket, io, connectedUsers) => {
  
  // Handle poll creation
  socket.on(EVENTS.POLL_CREATE, async (pollData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || user.role !== 'teacher') {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Only teachers can create polls' 
        });
      }

      // Validate poll data
      const { error } = validatePoll(pollData);
      if (error) {
        return socket.emit(EVENTS.ERROR, { 
          message: error.details[0].message 
        });
      }

      // Deactivate existing active polls
      await Poll.updateMany({ isActive: true }, { isActive: false, status: 'completed' });

      const { question, options, timeLimit = 60 } = pollData;
      
      // Format options with proper structure
      const formattedOptions = options.map((option, index) => ({
        id: index + 1,
        text: option.trim(),
        votes: 0
      }));

      // Create new poll
      const poll = new Poll({
        question: question.trim(),
        options: formattedOptions,
        timeLimit,
        startTime: new Date(),
        endTime: new Date(Date.now() + timeLimit * 1000),
        totalStudents: await Student.countDocuments({ isActive: true, isKicked: false }),
        answeredStudents: 0,
        status: 'active'
      });

      await poll.save();

      // Broadcast new poll to all connected users
      io.emit(EVENTS.POLL_NEW, poll);

      // Set automatic poll end timer
      setTimeout(async () => {
        try {
          const activePoll = await Poll.findById(poll._id);
          if (activePoll && activePoll.isActive) {
            activePoll.isActive = false;
            activePoll.status = 'expired';
            await activePoll.save();
            
            io.emit(EVENTS.POLL_ENDED, activePoll);
            logger.info(`Poll ${poll._id} automatically ended due to timeout`);
          }
        } catch (error) {
          logger.error('Auto poll end error:', error);
        }
      }, timeLimit * 1000);

      logger.info(`Poll created by teacher: ${question}`, { pollId: poll._id });

    } catch (error) {
      logger.error('Poll creation error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to create poll' 
      });
    }
  });

  // Handle poll end request
  socket.on(EVENTS.POLL_END, async (pollId) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || user.role !== 'teacher') {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Only teachers can end polls' 
        });
      }

      const poll = await Poll.findById(pollId);
      if (!poll) {
        return socket.emit(EVENTS.ERROR, { 
          message: MESSAGES.ERROR.POLL_NOT_FOUND 
        });
      }

      poll.isActive = false;
      poll.status = 'completed';
      poll.endTime = new Date();
      await poll.save();

      // Broadcast poll ended event
      io.emit(EVENTS.POLL_ENDED, poll);

      logger.info(`Poll ${pollId} ended by teacher`);

    } catch (error) {
      logger.error('Poll end error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to end poll' 
      });
    }
  });

  // Handle get current poll request
  socket.on('poll:get-current', async () => {
    try {
      const currentPoll = await Poll.findOne({ isActive: true }).sort({ createdAt: -1 });
      
      if (currentPoll) {
        socket.emit('poll:current', currentPoll);
      } else {
        socket.emit('poll:current', null);
      }

    } catch (error) {
      logger.error('Get current poll error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to get current poll' 
      });
    }
  });

  // Handle poll results request
  socket.on('poll:get-results', async (pollId) => {
    try {
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return socket.emit(EVENTS.ERROR, { 
          message: MESSAGES.ERROR.POLL_NOT_FOUND 
        });
      }

      const answers = await Answer.find({ pollId })
        .populate('studentId', 'name')
        .sort({ submittedAt: -1 });

      socket.emit(EVENTS.POLL_RESULTS, {
        poll,
        answers,
        summary: poll.results
      });

    } catch (error) {
      logger.error('Get poll results error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to get poll results' 
      });
    }
  });

  // Handle poll history request
  socket.on('poll:get-history', async () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || user.role !== 'teacher') {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Only teachers can view poll history' 
        });
      }

      const polls = await Poll.find({ status: { $in: ['completed', 'expired'] } })
        .sort({ createdAt: -1 })
        .limit(20);

      socket.emit('poll:history', polls);

    } catch (error) {
      logger.error('Get poll history error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to get poll history' 
      });
    }
  });

  // Handle real-time poll update
  socket.on('poll:update-results', async (pollId) => {
    try {
      const poll = await Poll.findById(pollId);
      if (poll) {
        // Broadcast updated results to all users
        io.emit(EVENTS.POLL_UPDATE, poll);
      }
    } catch (error) {
      logger.error('Poll update error:', error);
    }
  });
};
