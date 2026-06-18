const express = require('express');
const { startSession, castVote, getResults } = require('../controllers/voteController');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/start', startSession); // Public, but logic checks election status
router.post('/submit', castVote);
router.get('/results', verifyAdmin, getResults); // Admin only

module.exports = router;
