const express = require('express');
const { registerUser, getUsers, downloadUsersExcel } = require('../controllers/userController');

const router = express.Router();

// POST /api/users/register
router.post('/register', registerUser);

// GET /api/users - Get all registered users
router.get('/', getUsers);

// GET /api/users/download - Download users Excel file (Admin endpoint)
router.get('/download', downloadUsersExcel);

module.exports = router;
