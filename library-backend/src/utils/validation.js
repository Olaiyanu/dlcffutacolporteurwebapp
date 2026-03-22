const Joi = require('joi');

const userValidationSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    // Ensures email is correctly formatted
    email: Joi.string().email().required(),
    phone: Joi.string().optional() 
});

module.exports = { userValidationSchema };
