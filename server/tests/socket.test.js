const Client = require('socket.io-client');
const mongoose = require('mongoose');
const { server } = require('../server');
const Poll = require('../models/Poll');
const Student = require('../models/Student');
const Answer = require('../models/Answer');
const Chat = require('../models/Chat');

describe('Socket.io Tests', () => {
  let clientSocket;
  let serverSocket;
  let port;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 
      'mongodb://localhost:27017/polling-system-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Get a random port for testing
    port = 3001;
    server.listen(port);
  });

  beforeEach(async () => {
    // Clean database
    await Poll.deleteMany({});
    await Student.deleteMany({});
    await Answer.deleteMany({});
    await Chat.deleteMany({});

    // Create socket connection
    clientSocket = new Client(`http://localhost:${port}`);
    
    // Wait for connection
    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  afterAll(async () => {
    server.close();
    await mongoose.connection.close();
  });

  describe('Student Events', () => {
    it('should handle student join', (done) => {
      clientSocket.emit('student:join', { name: 'Test Student' });

      clientSocket.on('student:joined', (data) => {
        expect(data.student.name).toBe('Test Student');
        expect(data.student.id).toBeDefined();
        expect(data.student.sessionId).toBeDefined();
        done();
      });
    });

    it('should validate student name on join', (done) => {
      clientSocket.emit('student:join', { name: 'A' }); // Too short

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('must be at least 2 characters');
        done();
      });
    });

    it('should handle student answer submission', async () => {
      // Create a poll first
      const poll = new Poll({
        question: 'Test question?',
        options: [
          { id: 1, text: 'Option 1', votes: 0 },
          { id: 2, text: 'Option 2', votes: 0 }
        ],
        isActive: true
      });
      await poll.save();

      // Join as student first
      clientSocket.emit('student:join', { name: 'Test Student' });

      clientSocket.on('student:joined', (data) => {
        const studentId = data.student.id;

        // Submit answer
        clientSocket.emit('answer:submit', {
          pollId: poll._id.toString(),
          studentId: studentId,
          optionId: 1,
          timeToAnswer: 10
        });
      });

      clientSocket.on('answer:submitted', (data) => {
        expect(data.success).toBe(true);
        expect(data.answer.optionId).toBe(1);
        expect(data.poll.options[0].votes).toBe(1);
      });
    });
  });

  describe('Poll Events', () => {
    it('should handle poll creation by teacher', (done) => {
      // Join as teacher
      clientSocket.emit('teacher:join');

      clientSocket.on('teacher:joined', () => {
        // Create poll
        clientSocket.emit('poll:create', {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          timeLimit: 60
        });
      });

      clientSocket.on('poll:new', (poll) => {
        expect(poll.question).toBe('What is 2 + 2?');
        expect(poll.options).toHaveLength(4);
        expect(poll.isActive).toBe(true);
        done();
      });
    });

    it('should prevent non-teachers from creating polls', (done) => {
      // Join as student
      clientSocket.emit('student:join', { name: 'Test Student' });

      clientSocket.on('student:joined', () => {
        // Try to create poll as student
        clientSocket.emit('poll:create', {
          question: 'Unauthorized question?',
          options: ['Yes', 'No']
        });
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('Only teachers can create polls');
        done();
      });
    });

    it('should handle poll end by teacher', async () => {
      // Create a poll
      const poll = new Poll({
        question: 'Test question?',
        options: [
          { id: 1, text: 'Option 1', votes: 0 },
          { id: 2, text: 'Option 2', votes: 0 }
        ],
        isActive: true
      });
      await poll.save();

      // Join as teacher
      clientSocket.emit('teacher:join');

      clientSocket.on('teacher:joined', () => {
        // End poll
        clientSocket.emit('poll:end', poll._id.toString());
      });

      clientSocket.on('poll:ended', (endedPoll) => {
        expect(endedPoll.isActive).toBe(false);
        expect(endedPoll.status).toBe('completed');
      });
    });
  });

  describe('Chat Events', () => {
    it('should handle chat messages', (done) => {
      // Join as student
      clientSocket.emit('student:join', { name: 'Chat Student' });

      clientSocket.on('student:joined', () => {
        // Send chat message
        clientSocket.emit('chat:message', {
          message: 'Hello everyone!'
        });
      });

      clientSocket.on('chat:message', (message) => {
        expect(message.message).toBe('Hello everyone!');
        expect(message.senderName).toBe('Chat Student');
        expect(message.senderRole).toBe('student');
        done();
      });
    });

    it('should validate chat message length', (done) => {
      clientSocket.emit('student:join', { name: 'Chat Student' });

      clientSocket.on('student:joined', () => {
        // Send message that's too long
        const longMessage = 'a'.repeat(501);
        clientSocket.emit('chat:message', {
          message: longMessage
        });
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('cannot exceed 500 characters');
        done();
      });
    });

    it('should handle chat history request', async () => {
      // Create some chat messages
      await Chat.create([
        {
          senderId: 'user1',
          senderName: 'User 1',
          senderRole: 'student',
          message: 'First message'
        },
        {
          senderId: 'user2',
          senderName: 'User 2',
          senderRole: 'student',
          message: 'Second message'
        }
      ]);

      clientSocket.emit('chat:history', { limit: 10 });

      clientSocket.on('chat:history', (messages) => {
        expect(messages).toHaveLength(2);
        expect(messages[0].message).toBe('First message');
        expect(messages[1].message).toBe('Second message');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should broadcast poll results updates', async () => {
      // Create poll and student
      const poll = new Poll({
        question: 'Test question?',
        options: [
          { id: 1, text: 'Option 1', votes: 0 },
          { id: 2, text: 'Option 2', votes: 0 }
        ],
        isActive: true
      });
      await poll.save();

      const student = new Student({
        name: 'Test Student',
        socketId: clientSocket.id,
        sessionId: 'session-123'
      });
      await student.save();

      // Listen for results updates
      clientSocket.on('poll:results-update', (updatedPoll) => {
        expect(updatedPoll.answeredStudents).toBeGreaterThan(0);
        expect(updatedPoll.options[0].votes).toBeGreaterThan(0);
      });

      // Submit an answer to trigger update
      clientSocket.emit('answer:submit', {
        pollId: poll._id.toString(),
        studentId: student._id.toString(),
        optionId: 1,
        timeToAnswer: 15
      });
    });

    it('should update participant count', (done) => {
      clientSocket.on('participants:count', (count) => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
        done();
      });

      // Join as student to trigger count update
      clientSocket.emit('student:join', { name: 'New Participant' });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid poll data', (done) => {
      clientSocket.emit('teacher:join');

      clientSocket.on('teacher:joined', () => {
        clientSocket.emit('poll:create', {
          question: 'Short', // Too short
          options: ['Only one option'], // Too few options
          timeLimit: 5 // Too short
        });
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toBeDefined();
        done();
      });
    });

    it('should handle answer submission for non-existent poll', (done) => {
      const fakeId = new mongoose.Types.ObjectId();
      
      clientSocket.emit('student:join', { name: 'Test Student' });

      clientSocket.on('student:joined', (data) => {
        clientSocket.emit('answer:submit', {
          pollId: fakeId.toString(),
          studentId: data.student.id,
          optionId: 1
        });
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('not active');
        done();
      });
    });
  });
});
