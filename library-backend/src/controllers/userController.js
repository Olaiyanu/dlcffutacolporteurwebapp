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

        // Clean up OTP (safe to call even if no OTP exists)
        try {
            deleteOTP(user.email);
        } catch (otpError) {
            console.log('OTP cleanup skipped (no OTP to clean):', otpError.message);
        }

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

        // Check if client wants HTML table format
        const accept = req.headers.accept || '';
        if (accept.includes('text/html') || req.query.format === 'html') {
            return getUsersTable(req, res);
        }

        // Return structured JSON response
        const structuredUsers = users.map((user, index) => ({
            id: index + 1,
            name: user.Name || 'N/A',
            email: user.Email || 'N/A',
            phone: user.Phone || 'N/A',
            registrationDate: user['Registration Date'] || 'N/A',
            verified: user.Verified || 'No',
            verificationDate: user['Verification Date'] || 'N/A'
        }));

        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            metadata: {
                totalUsers: users.length,
                lastUpdated: new Date().toISOString(),
                format: 'json'
            },
            data: structuredUsers
        });

    } catch (err) {
        console.error('Error retrieving users:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users.',
            details: err.message
        });
    }
};

const getUsersTable = async (req, res) => {
    try {
        const users = getAllUsers();

        const htmlTable = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DLCF Library - Registered Users</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
        }
        .stat {
            background: rgba(255,255,255,0.2);
            padding: 15px 25px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            display: block;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th, td {
            padding: 15px 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        tr:hover {
            background: #e8f5e8;
            transition: background-color 0.2s;
        }
        .verified-badge {
            background: #4CAF50;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        .unverified-badge {
            background: #ff9800;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        .content {
            padding: 30px;
        }
        .no-users {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .no-users h3 {
            color: #333;
            margin-bottom: 10px;
        }
        .refresh-btn {
            background: #2196F3;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
            transition: background-color 0.2s;
        }
        .refresh-btn:hover {
            background: #1976D2;
        }
        .footer {
            background: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 13px;
        }
        @media (max-width: 768px) {
            .stats {
                flex-direction: column;
                gap: 15px;
            }
            th, td {
                padding: 10px 8px;
                font-size: 12px;
            }
            .header h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📚 DLCF Library System</h1>
            <p>Registered Users Dashboard</p>
            <div class="stats">
                <div class="stat">
                    <span class="stat-number">${users.length}</span>
                    <span class="stat-label">Total Users</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${users.filter(u => u.Verified === 'Yes').length}</span>
                    <span class="stat-label">Verified Users</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${new Date().toLocaleDateString()}</span>
                    <span class="stat-label">Last Updated</span>
                </div>
            </div>
        </div>

        <div class="content">
            <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh Data</button>

            ${users.length === 0 ?
                `<div class="no-users">
                    <h3>No Users Registered Yet</h3>
                    <p>The first user to register will appear here.</p>
                </div>` :
                `<div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>👤 Name</th>
                                <th>📧 Email</th>
                                <th>📱 Phone</th>
                                <th>📅 Registration Date</th>
                                <th>✅ Status</th>
                                <th>🕒 Verification Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map((user, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><strong>${user.Name || 'N/A'}</strong></td>
                                    <td>${user.Email || 'N/A'}</td>
                                    <td>${user.Phone || 'N/A'}</td>
                                    <td>${user['Registration Date'] || 'N/A'}</td>
                                    <td>
                                        ${user.Verified === 'Yes' ?
                                            '<span class="verified-badge">✓ Verified</span>' :
                                            '<span class="unverified-badge">⏳ Pending</span>'}
                                    </td>
                                    <td>${user['Verification Date'] || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`
            }
        </div>

        <div class="footer">
            <p>DLCF Library Management System | Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlTable);

    } catch (err) {
        console.error('Error generating user table:', err.message);
        res.status(500).send(`
            <html>
                <head><title>Error</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h1>❌ Error Loading Users</h1>
                    <p>${err.message}</p>
                    <a href="javascript:history.back()">← Go Back</a>
                </body>
            </html>
        `);
    }
};

// Check if email or phone already exists (for frontend validation)
const checkDuplicateUser = async (req, res) => {
    try {
        const { email, phone } = req.query;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                error: 'Email or phone parameter is required'
            });
        }

        let emailExists = false;
        let phoneExists = false;

        if (email) {
            emailExists = checkEmailExists(email);
        }

        if (phone) {
            phoneExists = checkPhoneExists(phone);
        }

        const duplicates = [];
        if (emailExists) duplicates.push('email');
        if (phoneExists) duplicates.push('phone');

        res.status(200).json({
            success: true,
            available: duplicates.length === 0,
            duplicates: duplicates,
            message: duplicates.length === 0 ?
                'Email and phone are available for registration' :
                `${duplicates.join(' and ')} ${duplicates.length === 1 ? 'is' : 'are'} already registered`
        });

    } catch (err) {
        console.error('Error checking duplicate user:', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to check user availability',
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
    getUsersTable,
    checkDuplicateUser,
    downloadUsersExcel 
};
