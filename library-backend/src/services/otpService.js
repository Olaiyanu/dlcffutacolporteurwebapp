const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Store temporary OTP codes (In production, use Redis or database)
const otpStoragePath = path.join(__dirname, '../../otp-storage.json');

// Initialize OTP storage file
const initializeOtpStorage = () => {
    if (!fs.existsSync(otpStoragePath)) {
        fs.writeFileSync(otpStoragePath, JSON.stringify({}));
    }
};

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP to temporary storage (expires in 10 minutes)
const saveOTP = (email, phone, otp) => {
    try {
        initializeOtpStorage();
        const data = JSON.parse(fs.readFileSync(otpStoragePath, 'utf8'));
        
        const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes
        
        data[email] = {
            otp,
            phone,
            expiryTime,
            attempts: 0
        };
        
        fs.writeFileSync(otpStoragePath, JSON.stringify(data, null, 2));
        console.log(`OTP saved for ${email}`);
    } catch (error) {
        console.error('Error saving OTP:', error);
        throw error;
    }
};

// Verify OTP
const verifyOTP = (email, otp) => {
    try {
        initializeOtpStorage();
        const data = JSON.parse(fs.readFileSync(otpStoragePath, 'utf8'));
        
        if (!data[email]) {
            return { valid: false, message: 'OTP not found or expired' };
        }
        
        const record = data[email];
        
        // Check if OTP has expired
        if (Date.now() > record.expiryTime) {
            delete data[email];
            fs.writeFileSync(otpStoragePath, JSON.stringify(data, null, 2));
            return { valid: false, message: 'OTP has expired' };
        }
        
        // Check if OTP matches
        if (record.otp !== otp) {
            record.attempts = (record.attempts || 0) + 1;
            if (record.attempts > 5) {
                delete data[email];
                fs.writeFileSync(otpStoragePath, JSON.stringify(data, null, 2));
                return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
            }
            fs.writeFileSync(otpStoragePath, JSON.stringify(data, null, 2));
            return { valid: false, message: 'Invalid OTP' };
        }
        
        // OTP is valid, remove it and return phone number
        const phone = record.phone;
        delete data[email];
        fs.writeFileSync(otpStoragePath, JSON.stringify(data, null, 2));
        
        console.log(`OTP verified for ${email}`);
        return { valid: true, phone, message: 'OTP verified successfully' };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        throw error;
    }
};

// Delete OTP
const deleteOTP = (email) => {
    try {
        initializeOtpStorage();
        const data = JSON.parse(fs.readFileSync(otpStoragePath, 'utf8'));
        delete data[email];
        fs.writeFileSync(otpStoragePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error deleting OTP:', error);
    }
};

module.exports = {
    generateOTP,
    saveOTP,
    verifyOTP,
    deleteOTP,
    initializeOtpStorage
};
