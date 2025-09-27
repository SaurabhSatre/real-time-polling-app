const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Poll = require('../models/Poll');
const Student = require('../models/Student');

// Test database
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 
  'mongodb://localhost:27017/polling-system-test';

describe('Poll API Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    await Poll.deleteMany({});
    await Student.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/polls', () => {
    it('should create a new poll', async () => {
      const pollData = {
        question: 'What is the capital of France?',
        options: ['Paris', 'London', 'Berlin', 'Madrid'],
        timeLimit: 60
      };

      const response = await request(app)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.question).toBe(pollData.question);
      expect(response.body.data.options).toHaveLength(4);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should validate poll data', async () => {
      const invalidPollData = {
        question: 'Too short', // Less than 5 characters
        options: ['Option 1'], // Only one option
        timeLimit: 5 // Less than 10 seconds
      };

      const response = await request(app)
        .post('/api/polls')
        .send(invalidPollData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should deactivate existing active polls', async () => {
      // Create first poll
      const firstPoll = new Poll({
        question: 'First question?',
        options: [
          { id: 1, text: 'Option 1', votes: 0 },
          { id: 2, text: 'Option 2', votes: 0 }
        ],
        isActive: true
      });
      await firstPoll.save();

      // Create second poll
      const pollData = {
        question: 'Second question?',
        options: ['Option A', 'Option B'],
        timeLimit: 60
      };

      await request(app)
        .post('/api/polls')
        .send(pollData)
        .expect(201);

      // Check that first poll is deactivated
      const updatedFirstPoll = await Poll.findById(firstPoll._id);
      expect(updatedFirstPoll.isActive).toBe(false);
    });
  });

  describe('GET /api/polls/current', () => {
    it('should return current active poll', async () => {
      const poll = new Poll({
        question: 'Test question?',
        options: [
          { id: 1, text: 'Option 1', votes: 0 },
          { id: 2, text: 'Option 2', votes: 0 }
        ],
        isActive: true
      });
      await poll.save();

      const response = await request(app)
        .get('/api/polls/current')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(poll._id.toString());
    });

    it('should return 404 when no active poll exists', async () => {
      const response = await request(app)
        .get('/api/polls/current')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No active poll found');
    });
  });

  describe('PUT /api/polls/:pollId/end', () => {
    it('should end an active poll', async () => {
      const poll = new Poll({
        question: 'Test question?',
        options: [
          { id: 1, text: 'Option 1', votes: 0 },
          { id: 2, text: 'Option 2', votes: 0 }
        ],
        isActive: true
      });
      await poll.save();

      const response = await request(app)
        .put(`/api/polls/${poll._id}/end`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent poll', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/polls/${fakeId}/end`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/polls/:pollId/results', () => {
    it('should return poll results', async () => {
      const poll = new Poll({
        question: 'Test question?',
        options: [
          { id: 1, text: 'Option 1', votes: 2 },
          { id: 2, text: 'Option 2', votes: 1 }
        ],
        answeredStudents: 3,
        results: [
          { optionId: 1, percentage: 67, count: 2 },
          { optionId: 2, percentage: 33, count: 1 }
        ]
      });
      await poll.save();

      const response = await request(app)
        .get(`/api/polls/${poll._id}/results`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.poll).toBeDefined();
      expect(response.body.data.summary).toHaveLength(2);
    });
  });

  describe('GET /api/polls/history', () => {
    it('should return poll history', async () => {
      // Create inactive polls
      await Poll.create([
        {
          question: 'Question 1?',
          options: [
            { id: 1, text: 'Option 1', votes: 0 },
            { id: 2, text: 'Option 2', votes: 0 }
          ],
          isActive: false
        },
        {
          question: 'Question 2?',
          options: [
            { id: 1, text: 'Option A', votes: 0 },
            { id: 2, text: 'Option B', votes: 0 }
          ],
          isActive: false
        }
      ]);

      const response = await request(app)
        .get('/api/polls/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});
