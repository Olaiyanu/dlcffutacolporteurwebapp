// Test duplicate checking functions
const { checkEmailExists, checkPhoneExists } = require('./src/utils/validation');

console.log('Testing duplicate validation functions...');

// Test with existing data
console.log('Email exists (johnsonolaiyanu@gmail.com):', checkEmailExists('johnsonolaiyanu@gmail.com'));
console.log('Phone exists (08012345678):', checkPhoneExists('08012345678'));

// Test with non-existing data
console.log('Email exists (nonexistent@test.com):', checkEmailExists('nonexistent@test.com'));
console.log('Phone exists (9999999999):', checkPhoneExists('9999999999'));

console.log('Test completed.');