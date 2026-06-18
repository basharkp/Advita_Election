const express = require('express');
const { 
    getAllElections, 
    getElectionStatus, 
    createElection, 
    updateElection, 
    deleteElection, 
    resetElection,
    updateElectionStatus,
    resetElectionLegacy
} = require('../controllers/electionController');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/all', verifyAdmin, getAllElections);
router.post('/', verifyAdmin, createElection);
router.put('/:id', verifyAdmin, updateElection);
router.delete('/:id', verifyAdmin, deleteElection);
router.post('/:id/reset', verifyAdmin, resetElection);
router.get('/:id', getElectionStatus); // Specific election status

// Legacy routes
router.get('/', getElectionStatus); // Public (for voter screen to check status)
router.put('/', verifyAdmin, updateElectionStatus);
router.post('/reset', verifyAdmin, resetElectionLegacy);

module.exports = router;
