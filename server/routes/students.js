const express = require('express');
const router = express.Router();
const {
  addStudent,
  getAllStudents,
  kickStudent,
  updateStudentActivity,
  removeStudent
} = require('../controllers/studentController');
const { validateStudentMiddleware } = require('../middleware/validation');

// @route   POST /api/students
// @desc    Add a new student
// @access  Public
router.post('/', validateStudentMiddleware, addStudent);

// @route   GET /api/students
// @desc    Get all active students
// @access  Public
router.get('/', getAllStudents);

// @route   PUT /api/students/:studentId/kick
// @desc    Kick a student
// @access  Public (Teacher)
router.put('/:studentId/kick', kickStudent);

// @route   PUT /api/students/activity/:socketId
// @desc    Update student activity
// @access  Public
router.put('/activity/:socketId', updateStudentActivity);

// @route   DELETE /api/students/:socketId
// @desc    Remove student (disconnect)
// @access  Public
router.delete('/:socketId', removeStudent);

module.exports = router;
