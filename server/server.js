const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(uploadDir));


// Routes placeholders
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/election', require('./routes/electionRoutes'));
app.use('/api/positions', require('./routes/positionRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes'));
app.use('/api/booth', require('./routes/boothRoutes'));
app.use('/api/vote', require('./routes/voteRoutes'));

app.get('/', (req, res) => {
  res.send('School Election API is running');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    details: err.message, // Expose error message
    stack: err.stack      // Expose stack trace (remove in prod)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
