const Student = require('../models/Student');
const { v4: uuidv4 } = require('uuid');

exports.addStudent = async (req, res) => {
  try {
    const { name, socketId } = req.body;

    if (!name || !socketId) {
      return res.status(400).json({
        success: false,
        message: 'Name and socket ID are required'
      });
    }

    // Check if student already exists with this socket
    const existingStudent = await Student.findOne({ socketId });
    if (existingStudent) {
      existingStudent.name = name;
      existingStudent.isActive = true;
      existingStudent.isKicked = false;
      existingStudent.lastActivity = new Date();
      await existingStudent.save();

      return res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: existingStudent
      });
    }

    const sessionId = uuidv4();
    const student = new Student({
      name,
      socketId,
      sessionId
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: student
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add student',
      error: error.message
    });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true, isKicked: false })
      .sort({ joinedAt: -1 });

    res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get students',
      error: error.message
    });
  }
};

exports.kickStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findByIdAndUpdate(
      studentId,
      { 
        isKicked: true,
        isActive: false
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student kicked successfully',
      data: student
    });
  } catch (error) {
    console.error('Kick student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to kick student',
      error: error.message
    });
  }
};

exports.updateStudentActivity = async (req, res) => {
  try {
    const { socketId } = req.params;

    const student = await Student.findOneAndUpdate(
      { socketId },
      { lastActivity: new Date() },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Update student activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student activity',
      error: error.message
    });
  }
};

exports.removeStudent = async (req, res) => {
  try {
    const { socketId } = req.params;

    await Student.findOneAndUpdate(
      { socketId },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: 'Student removed successfully'
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove student',
      error: error.message
    });
  }
};
