const express = require('express');
const { getCandidates, createCandidate, updateCandidate, deleteCandidate, reorderCandidates } = require('../controllers/candidateController');
const { verifyAdmin } = require('../middleware/authMiddleware');
const upload = require('../utils/fileUpload');

const router = express.Router();

const cpUpload = upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'symbol', maxCount: 1 }]);

router.get('/', getCandidates);
router.post('/', verifyAdmin, cpUpload, createCandidate);
router.put('/reorder', verifyAdmin, reorderCandidates); // Reordering route
router.put('/:id', verifyAdmin, cpUpload, updateCandidate);
router.delete('/:id', verifyAdmin, deleteCandidate);


module.exports = router;
