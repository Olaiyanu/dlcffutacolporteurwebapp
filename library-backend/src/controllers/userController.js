const { userValidationSchema } = require('../utils/validation');
const { generateLibraryCard } = require('../services/pdfService');
const { sendLibraryCardEmail } = require('../services/emailService');
const { saveUserToExcel, getAllUsers } = require('../services/excelService');


const registerUser = async (req, res) => {
    try {
        // 1 & 2: Collect & Validate User Information
        const { error, value } = userValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const user = value; // Validated data

        // 3: Automatically Generate the Library Card (Returns a Buffer)
        const pdfBuffer = await generateLibraryCard(user);

        // 4: Send the Card via Email
        await sendLibraryCardEmail(user, pdfBuffer);

        // 5: Save user data to Excel
        await saveUserToExcel(user);

        // Send success response back to frontend
        res.status(201).json({ 
            message: 'User registered successfully and library card sent!' 
        });

    } catch (err) {
        console.error('Error during registration process:', err.message);
        console.error('Full error:', err);
        
        // Send more detailed error message
        res.status(500).json({ 
            error: err.message || 'An internal server error occurred.'
        });
    }
};

const getUsers = async (req, res) => {
    try {
        // Get all users from Excel file
        const users = getAllUsers();

        // Send success response with user data
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

        // Check if file exists
        if (!fs.existsSync(excelFilePath)) {
            return res.status(404).json({ error: 'No user data found.' });
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="library_users.xlsx"');

        // Stream the file
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

module.exports = { registerUser, getUsers, downloadUsersExcel };
