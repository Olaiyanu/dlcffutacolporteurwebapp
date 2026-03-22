const express = require('express');
const { 
    registerUser, 
    sendOTP, 
    verifyUserOTP, 
    completeRegistration,
    getUsers, 
    getUsersTable,
    downloadUsersExcel 
} = require('../controllers/userController');

const router = express.Router();

// NEW OTP-based registration flow
// Step 1: Send OTP to email
router.post('/send-otp', sendOTP);

// Step 2: Verify OTP
router.post('/verify-otp', verifyUserOTP);

// Step 3: Complete registration after OTP verification
router.post('/complete-registration', completeRegistration);

// Legacy endpoint (deprecated)
router.post('/register', registerUser);

// GET /api/users - Get all registered users (JSON format)
router.get('/', getUsers);

// GET /api/users/table - Get users in HTML table format
router.get('/table', getUsersTable);

// GET /api/users/download - Download users Excel file (Admin endpoint)
router.get('/download', downloadUsersExcel);

module.exports = router;
