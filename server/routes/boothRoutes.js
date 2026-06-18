const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// ADMIN: Create a new booth
// ─────────────────────────────────────────────
router.post('/create', verifyAdmin, async (req, res) => {
    try {
        const { name, passkey, electionId, positionIds } = req.body;
        if (!name) return res.status(400).json({ error: "Booth name is required" });

        let targetElectionId = electionId;
        if (!targetElectionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) targetElectionId = defaultElection.id;
        }

        const booth = await prisma.booth.create({
            data: {
                name,
                passkey: passkey || null,
                status: req.body.isActive !== false ? 'ACTIVE' : 'IDLE',
                isActive: req.body.isActive !== undefined ? req.body.isActive : true,
                currentSessionId: req.body.isActive !== false ? uuidv4() : null,
                electionId: targetElectionId,
                positionIds: positionIds ? JSON.stringify(positionIds) : null
            }
        });
        res.json(booth);
    } catch (error) {
        console.error("Create booth error:", error);
        res.status(500).json({ error: "Failed to create booth" });
    }
});

// ─────────────────────────────────────────────
// ADMIN: Update booth properties (name, passkey, positionIds)
// ─────────────────────────────────────────────
router.put('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, passkey, positionIds } = req.body;
    try {
        const data = {};
        if (name !== undefined) data.name = name;
        if (passkey !== undefined) data.passkey = passkey || null;
        if (req.body.isActive !== undefined) {
            data.isActive = req.body.isActive;
            // If activating, ensure status and session exist
            if (data.isActive) {
                data.status = 'ACTIVE';
                data.currentSessionId = uuidv4();
            } else {
                data.status = 'IDLE';
                data.currentSessionId = null;
            }
        }
        if (positionIds !== undefined) data.positionIds = positionIds ? JSON.stringify(positionIds) : null;

        const booth = await prisma.booth.update({ where: { id }, data });
        res.json(booth);
    } catch (error) {
        console.error("Update booth error:", error);
        res.status(500).json({ error: "Failed to update booth" });
    }
});

// ─────────────────────────────────────────────
// ADMIN: List all booths (full details for admin panel)
// ─────────────────────────────────────────────
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const booths = await prisma.booth.findMany({
            orderBy: { createdAt: 'asc' }
        });
        // Parse positionIds JSON for each booth
        const parsed = booths.map(b => ({
            ...b,
            positionIds: b.positionIds ? JSON.parse(b.positionIds) : []
        }));
        res.json(parsed);
    } catch (error) {
        console.error("List booths error:", error);
        res.status(500).json({ error: "Failed to fetch booths" });
    }
});

// ─────────────────────────────────────────────
// PUBLIC: List booths for booth setup screen
// Only shows IDLE booths — avoids confusing voters with active/locked booths
// ─────────────────────────────────────────────
router.get('/list-public', async (req, res) => {
    try {
        const booths = await prisma.booth.findMany({
            where: { isActive: true },
            select: { id: true, name: true, status: true, electionId: true },
            orderBy: { name: 'asc' }
        });
        res.json(booths);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch booths" });
    }
});

// ─────────────────────────────────────────────
// ADMIN: Update booth status (Activate / Lock / Reset)
// ─────────────────────────────────────────────
router.post('/:id/status', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // IDLE, ACTIVE, LOCKED

    if (!['IDLE', 'ACTIVE', 'LOCKED'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const data = { status };
        if (status === 'ACTIVE') {
            data.currentSessionId = uuidv4(); // Fresh session on activation
            data.lastActivity = new Date();
        } else if (status === 'IDLE') {
            data.currentSessionId = null; // Clear session on reset
        }

        const booth = await prisma.booth.update({ where: { id }, data });
        res.json(booth);
    } catch (error) {
        console.error("Update booth status error:", error);
        res.status(500).json({ error: "Failed to update booth status" });
    }
});

// ─────────────────────────────────────────────
// ADMIN: Delete booth
// ─────────────────────────────────────────────
router.delete('/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const booth = await prisma.booth.findUnique({ where: { id } });
        if (!booth) return res.status(404).json({ error: "Booth not found" });
        if (booth.status === 'ACTIVE') {
            return res.status(400).json({ error: "Cannot delete an active booth. Reset it first." });
        }
        await prisma.booth.delete({ where: { id } });
        res.json({ message: "Booth deleted" });
    } catch (error) {
        console.error("Delete booth error:", error);
        res.status(500).json({ error: "Failed to delete booth" });
    }
});

// ─────────────────────────────────────────────
// PUBLIC: Polling endpoint — booth PC checks its own status
// Returns booth state + electionId + positionIds for voter-side scoping
// ─────────────────────────────────────────────
router.get('/:id/poll', async (req, res) => {
    const { id } = req.params;
    try {
        const booth = await prisma.booth.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                status: true,
                currentSessionId: true,
                electionId: true,
                positionIds: true
            }
        });
        if (!booth) return res.status(404).json({ error: "Booth not found" });

        res.json({
            ...booth,
            positionIds: booth.positionIds ? JSON.parse(booth.positionIds) : []
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to poll booth" });
    }
});

// ─────────────────────────────────────────────
// PUBLIC: Booth "Login" / Setup verification
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { boothId, passkey } = req.body;
    try {
        const booth = await prisma.booth.findUnique({ where: { id: boothId } });
        if (!booth) return res.status(404).json({ error: "Booth not found" });

        if (booth.passkey && booth.passkey !== passkey) {
            return res.status(401).json({ error: "Invalid passkey" });
        }

        res.json({ message: "Booth connected", booth });
    } catch (error) {
        res.status(500).json({ error: "Booth login failed" });
    }
});

module.exports = router;
