const Student = require('../models/Student');
const Answer = require('../models/Answer');
const Poll = require('../models/Poll');
const { validateStudentJoin, validateAnswer } = require('../utils/validation');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { EVENTS, MESSAGES } = require('../config/constants');

module.exports = (socket, io, connectedUsers) => {

  // Handle student join
  socket.on(EVENTS.STUDENT_JOIN, async (data) => {
    try {
      const { error } = validateStudentJoin(data);
      if (error) {
        return socket.emit(EVENTS.ERROR, { 
          message: error.details[0].message 
        });
      }

      const { name } = data;

      // Check if student already exists with this socket
      let student = await Student.findOne({ socketId: socket.id });
      
      if (!student) {
        // Create new student
        student = new Student({
          name: name.trim(),
          socketId: socket.id,
          sessionId: uuidv4(),
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'] || ''
        });
      } else {
        // Update existing student
        student.name = name.trim();
        student.isActive = true;
        student.isKicked = false;
        student.lastActivity = new Date();
      }

      await student.save();

      // Store user info in memory
      connectedUsers.set(socket.id, {
        id: student._id,
        name: student.name,
        role: 'student',
        sessionId: student.sessionId,
        socketId: socket.id
      });

      // Join student room
      socket.join('students');

      // Send success response to student
      socket.emit(EVENTS.STUDENT_JOINED, { 
        student: {
          id: student._id,
          name: student.name,
          sessionId: student.sessionId
        }
      });

      // Send current active poll if exists
      const currentPoll = await Poll.findOne({ isActive: true });
      if (currentPoll) {
        socket.emit('poll:current', currentPoll);
        
        // Check if student has already answered this poll
        const existingAnswer = await Answer.findOne({ 
          pollId: currentPoll._id, 
          studentId: student._id 
        });
        
        if (existingAnswer) {
          socket.emit('answer:already-submitted', {
            pollId: currentPoll._id,
            answer: existingAnswer
          });
        }
      }

      // Broadcast updated participant count
      const activeStudents = await Student.find({ 
        isActive: true, 
        isKicked: false 
      }).select('name joinedAt');
      
      io.emit(EVENTS.PARTICIPANTS_UPDATE, activeStudents);
      io.emit(EVENTS.PARTICIPANTS_COUNT, activeStudents.length);

      // Notify teachers about new student
      socket.to('teachers').emit('student:new-join', {
        student: {
          id: student._id,
          name: student.name,
          joinedAt: student.joinedAt
        }
      });

      logger.info(`Student joined: ${name}`, { 
        studentId: student._id, 
        socketId: socket.id 
      });

    } catch (error) {
      logger.error('Student join error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to join as student' 
      });
    }
  });

  // Handle answer submission
  socket.on(EVENTS.ANSWER_SUBMIT, async (answerData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || user.role !== 'student') {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Only students can submit answers' 
        });
      }

      const { error } = validateAnswer(answerData);
      if (error) {
        return socket.emit(EVENTS.ERROR, { 
          message: error.details[0].message 
        });
      }

      const { pollId, optionId, timeToAnswer } = answerData;

      // Check if student exists and is active
      const student = await Student.findById(user.id);
      if (!student || student.isKicked || !student.isActive) {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Student not found or has been removed' 
        });
      }

      // Check if poll exists and is active
      const poll = await Poll.findById(pollId);
      if (!poll || !poll.isActive) {
        return socket.emit(EVENTS.ERROR, { 
          message: MESSAGES.ERROR.POLL_NOT_ACTIVE 
        });
      }

      // Check if student has already answered
      const existingAnswer = await Answer.findOne({ pollId, studentId: student._id });
      if (existingAnswer) {
        return socket.emit(EVENTS.ERROR, { 
          message: MESSAGES.ERROR.ALREADY_ANSWERED 
        });
      }

      // Validate option selection
      const selectedOption = poll.options.find(opt => opt.id === optionId);
      if (!selectedOption) {
        return socket.emit(EVENTS.ERROR, { 
          message: MESSAGES.ERROR.INVALID_OPTION 
        });
      }

      // Create answer record
      const answer = new Answer({
        pollId,
        studentId: student._id,
        studentName: student.name,
        optionId,
        optionText: selectedOption.text,
        timeToAnswer,
        ipAddress: socket.handshake.address
      });

      await answer.save();

      // Update poll statistics atomically
      await Poll.findByIdAndUpdate(pollId, {
        $inc: { 
          answeredStudents: 1,
          'options.$[elem].votes': 1
        }
      }, {
        arrayFilters: [{ 'elem.id': optionId }],
        new: true
      });

      // Update student's poll participation
      await Student.findByIdAndUpdate(student._id, {
        $push: {
          pollsParticipated: {
            pollId: pollId,
            answeredAt: new Date()
          }
        },
        lastActivity: new Date()
      });

      // Get updated poll with new results
      const updatedPoll = await Poll.findById(pollId);

      // Send confirmation to student
      socket.emit(EVENTS.ANSWER_SUBMITTED, { 
        success: true,
        answer,
        poll: updatedPoll
      });

      // Broadcast updated results to all users
      io.emit('poll:results-update', updatedPoll);

      logger.info(`Answer submitted by ${student.name}`, { 
        pollId, 
        optionId, 
        studentId: student._id 
      });

    } catch (error) {
      logger.error('Answer submission error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to submit answer' 
      });
    }
  });

  // Handle student activity ping
  socket.on('student:ping', async () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (user && user.role === 'student') {
        await Student.findByIdAndUpdate(user.id, {
          lastActivity: new Date()
        });
      }
    } catch (error) {
      logger.error('Student ping error:', error);
    }
  });

  // Handle student disconnect
  socket.on('disconnect', async (reason) => {
    try {
      const user = connectedUsers.get(socket.id);
      
      if (user && user.role === 'student') {
        // Update student status
        await Student.findByIdAndUpdate(user.id, {
          isActive: false
        });

        // Notify others about student leaving
        socket.broadcast.emit(EVENTS.STUDENT_LEFT, {
          studentId: user.id,
          name: user.name,
          reason
        });

        // Update participants count
        const activeCount = await Student.countDocuments({ 
          isActive: true, 
          isKicked: false 
        });
        io.emit(EVENTS.PARTICIPANTS_COUNT, activeCount);

        logger.info(`Student disconnected: ${user.name}`, { 
          reason, 
          studentId: user.id 
        });
      }

      connectedUsers.delete(socket.id);

    } catch (error) {
      logger.error('Student disconnect error:', error);
    }
  });

  // Handle get student status
  socket.on('student:get-status', async () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || user.role !== 'student') {
        return socket.emit(EVENTS.ERROR, { 
          message: 'Student not found' 
        });
      }

      const student = await Student.findById(user.id);
      if (!student) {
        return socket.emit(EVENTS.ERROR, { 
          message: MESSAGES.ERROR.STUDENT_NOT_FOUND 
        });
      }

      socket.emit('student:status', {
        id: student._id,
        name: student.name,
        isActive: student.isActive,
        isKicked: student.isKicked,
        joinedAt: student.joinedAt,
        pollsParticipated: student.pollsParticipated.length
      });

    } catch (error) {
      logger.error('Get student status error:', error);
      socket.emit(EVENTS.ERROR, { 
        message: 'Failed to get student status' 
      });
    }
  });
};
