require('dotenv').config({ override: true });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', apiRoutes);

/*
// Catch-all route to serve the frontend's index.html for non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).send('API endpoint not found');
    }
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});
*/

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
