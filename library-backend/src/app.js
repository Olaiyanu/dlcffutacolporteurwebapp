const express = require('express');
const cors = require('cors');
require('dotenv').config();
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse incoming JSON requests

// Routes
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
