const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// This will save the file as "users.xlsx" in the root of your backend folder
const excelFilePath = path.join(__dirname, '../../users.xlsx');

const saveUserToExcel = (user) => {
    try {
        let workbook;
        let worksheet;

        // 1. Check if the Excel file already exists
        if (fs.existsSync(excelFilePath)) {
            // Read existing workbook
            workbook = xlsx.readFile(excelFilePath);
            worksheet = workbook.Sheets[workbook.SheetNames[0]];
        } else {
            // Create a new workbook and worksheet if it doesn't exist
            workbook = xlsx.utils.book_new();
            // Initialize with headers (First row)
            const headers = [['Name', 'Email', 'Phone', 'Registration Date', 'Verified', 'Verification Date']];
            worksheet = xlsx.utils.aoa_to_sheet(headers);
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
        }

        // 2. Convert the worksheet to a JSON array so we can push new data
        const data = xlsx.utils.sheet_to_json(worksheet);

        // 3. Add the new user details
        data.push({
            Name: user.name,
            Email: user.email,
            Phone: user.phone || 'N/A',
            'Registration Date': new Date().toLocaleString(),
            Verified: 'Yes',
            'Verification Date': new Date().toLocaleString()
        });

        // 4. Convert the JSON array back to an Excel worksheet
        const newWorksheet = xlsx.utils.json_to_sheet(data);

        // 5. Replace the old worksheet with the new one
        workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;

        // 6. Save the file to the disk
        xlsx.writeFile(workbook, excelFilePath);
        console.log('User data saved to Excel successfully');
    } catch (error) {
        console.error('Error saving to Excel:', error);
        throw error;
    }
};

const getAllUsers = () => {
    try {
        // Check if the Excel file exists
        if (!fs.existsSync(excelFilePath)) {
            return []; // Return empty array if no users yet
        }

        // Read the workbook and worksheet
        const workbook = xlsx.readFile(excelFilePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert worksheet to JSON array
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Remove the header row if it exists (assuming first row is headers)
        if (data.length > 0 && data[0].Name === undefined) {
            data.shift(); // Remove header row
        }

        console.log(`Retrieved ${data.length} users from Excel file`);
        return data;
    } catch (error) {
        console.error('Error reading users from Excel:', error);
        throw error;
    }
};

module.exports = { saveUserToExcel, getAllUsers };
