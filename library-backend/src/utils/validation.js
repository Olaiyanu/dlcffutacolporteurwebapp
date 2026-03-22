const Joi = require('joi');
const { getAllUsers } = require('../services/excelService');

const userValidationSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).max(15).required() 
});

// Check if email already exists
const checkEmailExists = (email) => {
    try {
        const users = getAllUsers();
        return users.some(user => user.Email && user.Email.toLowerCase() === email.toLowerCase());
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
};

// Check if phone already exists
const checkPhoneExists = (phone) => {
    try {
        const users = getAllUsers();
        return users.some(user => user.Phone && user.Phone === phone);
    } catch (error) {
        console.error('Error checking phone:', error);
        return false;
    }
};

module.exports = { 
    userValidationSchema,
    checkEmailExists,
    checkPhoneExists
};
