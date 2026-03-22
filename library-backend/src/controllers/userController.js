const { userValidationSchema, checkEmailExists, checkPhoneExists } = require('../utils/validation');
const { generateLibraryCard } = require('../services/pdfService');
const { sendLibraryCardEmail } = require('../services/emailService');
const { saveUserToExcel, getAllUsers } = require('../services/excelService');
const { generateOTP, saveOTP, verifyOTP, deleteOTP } = require('../services/otpService');
const nodemailer = require('nodemailer');

// Initialize email transporter (same as in emailService)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Step 1: Send OTP to email and phone
const sendOTP = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        // Validate input
        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'Name, email, and phone are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if email already exists
        if (checkEmailExists(email)) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Check if phone already exists
        if (checkPhoneExists(phone)) {
            return res.status(400).json({ error: 'Phone number is already registered' });
        }

        // Generate OTP
        const otp = generateOTP();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // Save OTP to storage
        saveOTP(email, phone, otp);

        // Send OTP via email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'DLCF Library - Email Verification',
            html: `
                <h2>Email Verification</h2>
                <p>Dear ${name},</p>
                <p>Your OTP for DLCF Library registration is:</p>
                <h3 style="color: #007bff; font-size: 24px;">${otp}</h3>
                <p>This OTP will expire in 10 minutes.</p>
                <p>Do not share this OTP with anyone.</p>
                <p>Best regards,<br/>DLCF Library Team</p>
            `
        });

        console.log(`OTP sent to email: ${email}`);

        res.status(200).json({ 
            message: 'OTP has been sent to your email. Please verify to complete registration.',
            email: email
        });

    } catch (err) {
        console.error('Error sending OTP:', err.message);
        res.status(500).json({ 
            error: err.message || 'Failed to send OTP'
        });
    }
};

// Step 2: Verify OTP
const verifyUserOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Verify OTP
        const result = verifyOTP(email, otp);

        if (!result.valid) {
            return res.status(400).json({ error: result.message });
        }

        res.status(200).json({ 
            message: 'OTP verified successfully',
            verified: true,
            phone: result.phone
        });

    } catch (err) {
        console.error('Error verifying OTP:', err.message);
        res.status(500).json({ 
            error: err.message || 'Failed to verify OTP'
        });
    }
};

// Step 3: Complete registration after OTP verification
const completeRegistration = async (req, res) => {
    try {
        // Validate input
        const { error, value } = userValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const user = value;

        // Check if email and phone are not already registered (extra safety check)
        if (checkEmailExists(user.email)) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        if (checkPhoneExists(user.phone)) {
            return res.status(400).json({ error: 'Phone number is already registered' });
        }

        // Automatically Generate the Library Card
        const pdfBuffer = await generateLibraryCard(user);

        // Send the Card via Email
        await sendLibraryCardEmail(user, pdfBuffer);

        // Save user data to Excel
        await saveUserToExcel(user);

        // Clean up OTP
        deleteOTP(user.email);

        res.status(201).json({ 
            message: 'User registered successfully and library card sent!' 
        });

    } catch (err) {
        console.error('Error during registration process:', err.message);
        console.error('Full error:', err);
        
        res.status(500).json({ 
            error: err.message || 'An internal server error occurred.'
        });
    }
};

// Legacy endpoint - now disabled
const registerUser = async (req, res) => {
    return res.status(400).json({ 
        error: 'This endpoint is deprecated. Use the new OTP verification flow: /api/users/send-otp -> /api/users/verify-otp -> /api/users/complete-registration'
    });
};

const getUsers = async (req, res) => {
    try {
        const users = getAllUsers();

        res.status(200).json({ 
            success: true,
            count: users.length,
            users: users
        });

    } catch (err) {
        console.error('Error retrieving users:', err.message);
        res.status(500).json({ 
            error: 'Failed to retrieve users.',
            details: err.message
        });
    }
};

const downloadUsersExcel = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const excelFilePath = path.join(__dirname, '../../users.xlsx');

        if (!fs.existsSync(excelFilePath)) {
            return res.status(404).json({ error: 'No user data found.' });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="library_users.xlsx"');

        const fileStream = fs.createReadStream(excelFilePath);
        fileStream.pipe(res);

        console.log('Excel file download initiated');

    } catch (err) {
        console.error('Error downloading Excel file:', err.message);
        res.status(500).json({ 
            error: 'Failed to download user data.',
            details: err.message
        });
    }
};

module.exports = { 
    registerUser, 
    sendOTP,
    verifyUserOTP,
    completeRegistration,
    getUsers, 
    downloadUsersExcel 
};
