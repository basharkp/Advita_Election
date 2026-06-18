const express = require('express');
const { getPositions, createPosition, updatePosition, deletePosition, reorderPositions } = require('../controllers/positionController');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getPositions); // Public fetching
router.post('/', verifyAdmin, createPosition);
router.put('/reorder', verifyAdmin, reorderPositions); // Specific route before :id
router.put('/:id', verifyAdmin, updatePosition);
router.delete('/:id', verifyAdmin, deletePosition);

module.exports = router;
