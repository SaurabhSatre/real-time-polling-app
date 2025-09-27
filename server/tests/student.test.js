const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Student = require('../models/Student');

describe('Student API Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 
      'mongodb://localhost:27017/polling-system-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    await Student.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/students', () => {
    it('should add a new student', async () => {
      const studentData = {
        name: 'John Doe',
        socketId: 'socket-123'
      };

      const response = await request(app)
        .post('/api/students')
        .send(studentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(studentData.name);
      expect(response.body.data.socketId).toBe(studentData.socketId);
      expect(response.body.data.sessionId).toBeDefined();
    });

    it('should update existing student with same socket', async () => {
      const socketId = 'socket-456';
      
      // Create existing student
      const existingStudent = new Student({
        name: 'Old Name',
        socketId: socketId,
        sessionId: 'session-1'
      });
      await existingStudent.save();

      // Update with new name
      const updateData = {
        name: 'New Name',
        socketId: socketId
      };

      const response = await request(app)
        .post('/api/students')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.isKicked).toBe(false);
    });

    it('should validate student data', async () => {
      const invalidData = {
        name: 'A', // Too short
        socketId: '' // Empty socket ID
      };

      const response = await request(app)
        .post('/api/students')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/students', () => {
    it('should return all active students', async () => {
      // Create test students
      await Student.create([
        {
          name: 'Student 1',
          socketId: 'socket-1',
          sessionId: 'session-1',
          isActive: true,
          isKicked: false
        },
        {
          name: 'Student 2',
          socketId: 'socket-2',
          sessionId: 'session-2',
          isActive: true,
          isKicked: false
        },
        {
          name: 'Kicked Student',
          socketId: 'socket-3',
          sessionId: 'session-3',
          isActive: true,
          isKicked: true
        }
      ]);

      const response = await request(app)
        .get('/api/students')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Only active, non-kicked students
    });
  });

  describe('PUT /api/students/:studentId/kick', () => {
    it('should kick a student', async () => {
      const student = new Student({
        name: 'Student to Kick',
        socketId: 'socket-kick',
        sessionId: 'session-kick'
      });
      await student.save();

      const response = await request(app)
        .put(`/api/students/${student._id}/kick`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isKicked).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent student', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/students/${fakeId}/kick`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/students/activity/:socketId', () => {
    it('should update student activity', async () => {
      const student = new Student({
        name: 'Active Student',
        socketId: 'socket-active',
        sessionId: 'session-active'
      });
      await student.save();

      const oldActivity = student.lastActivity;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .put(`/api/students/activity/${student.socketId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.lastActivity)).toBeInstanceOf(Date);
    });

    it('should return 404 for non-existent socket', async () => {
      const response = await request(app)
        .put('/api/students/activity/non-existent-socket')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/students/:socketId', () => {
    it('should remove a student', async () => {
      const student = new Student({
        name: 'Student to Remove',
        socketId: 'socket-remove',
        sessionId: 'session-remove',
        isActive: true
      });
      await student.save();

      const response = await request(app)
        .delete(`/api/students/${student.socketId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify student is marked inactive
      const updatedStudent = await Student.findById(student._id);
      expect(updatedStudent.isActive).toBe(false);
    });
  });
});
