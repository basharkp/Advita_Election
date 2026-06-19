const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const deleteFile = (filepath) => {
    if (!filepath) return;
    if (filepath.startsWith('http://') || filepath.startsWith('https://')) return;
    const fullPath = path.join(__dirname, '..', filepath);
    fs.unlink(fullPath, (err) => {
        if (err) console.error("Failed to delete local file: ", err);
    });
};

const isElectionActive = async (electionId) => {
    if (!electionId) return false;
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    return election && (election.status === 'RUNNING' || election.status === 'PAUSED');
};

const normalizeOrders = async (positionId) => {
    const candidates = await prisma.candidate.findMany({
        where: { positionId },
        orderBy: { order: 'asc' }
    });

    const updates = candidates.map((c, index) =>
        prisma.candidate.update({
            where: { id: c.id },
            data: { order: index + 1 }
        })
    );
    await prisma.$transaction(updates);
};

const getCandidates = async (req, res) => {
    try {
        let { electionId } = req.query;
        if (!electionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) electionId = defaultElection.id;
        }

        const candidates = await prisma.candidate.findMany({
            where: { position: { electionId } },
            orderBy: [
                { position: { order: 'asc' } },
                { order: 'asc' }
            ],
            include: { position: true }
        });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
};

const createCandidate = async (req, res) => {
    const { name, positionId } = req.body;
    const photo = req.files['photo'] ? req.files['photo'][0] : null;
    const symbol = req.files['symbol'] ? req.files['symbol'][0] : null;

    try {
        const position = await prisma.position.findUnique({ where: { id: positionId } });
        if (!position) return res.status(404).json({ error: 'Position not found' });

        if (await isElectionActive(position.electionId)) {
            return res.status(403).json({ error: "Cannot create candidates during an active election." });
        }

        const lastCandidate = await prisma.candidate.findFirst({
            where: { positionId },
            orderBy: { order: 'desc' }
        });
        const nextOrder = lastCandidate ? lastCandidate.order + 1 : 1;

        const candidate = await prisma.candidate.create({
            data: {
                name,
                positionId,
                order: nextOrder,
                photoUrl: photo ? photo.path.replace(/\\/g, '/') : null,
                symbolUrl: symbol ? symbol.path.replace(/\\/g, '/') : null,
            },
        });

        res.json(candidate);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create candidate' });
    }
};

const updateCandidate = async (req, res) => {
    const { id } = req.params;
    const { name, positionId } = req.body;
    const photo = req.files['photo'] ? req.files['photo'][0] : null;
    const symbol = req.files['symbol'] ? req.files['symbol'][0] : null;

    try {
        const existing = await prisma.candidate.findUnique({ 
            where: { id },
            include: { position: true }
        });
        if (!existing) return res.status(404).json({ error: 'Candidate not found' });

        if (await isElectionActive(existing.position.electionId)) {
            return res.status(403).json({ error: "Cannot modify candidates during an active election." });
        }

        let data = { name };

        if (positionId && positionId !== existing.positionId) {
            const newPos = await prisma.position.findUnique({ where: { id: positionId } });
            if (newPos && await isElectionActive(newPos.electionId)) {
                return res.status(403).json({ error: "Cannot move candidate to an active election." });
            }

            data.positionId = positionId;

            const lastInNew = await prisma.candidate.findFirst({
                where: { positionId },
                orderBy: { order: 'desc' }
            });
            data.order = lastInNew ? lastInNew.order + 1 : 1;
        }

        if (photo) {
            data.photoUrl = photo.path.replace(/\\/g, '/');
            deleteFile(existing.photoUrl);
        }
        if (symbol) {
            data.symbolUrl = symbol.path.replace(/\\/g, '/');
            deleteFile(existing.symbolUrl);
        }

        const updated = await prisma.candidate.update({
            where: { id },
            data,
        });

        if (positionId && positionId !== existing.positionId) {
            await normalizeOrders(existing.positionId);
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update candidate' });
    }
};

const deleteCandidate = async (req, res) => {
    const { id } = req.params;
    try {
        const candidate = await prisma.candidate.findUnique({ 
            where: { id },
            include: { position: true }
        });
        if (!candidate) return res.status(404).json({ error: "Candidate not found" });

        if (await isElectionActive(candidate.position.electionId)) {
            return res.status(403).json({ error: "Cannot delete candidates during an active election." });
        }

        await prisma.candidate.delete({ where: { id } });

        await normalizeOrders(candidate.positionId);

        res.json({ message: 'Candidate deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete candidate' });
    }
};

const reorderCandidates = async (req, res) => {
    try {
        const { positionId, candidateIds } = req.body;

        if (!Array.isArray(candidateIds)) {
            return res.status(400).json({ error: "Invalid data format" });
        }

        const position = await prisma.position.findUnique({ where: { id: positionId } });
        if (position && await isElectionActive(position.electionId)) {
            return res.status(403).json({ error: "Cannot reorder candidates during an active election." });
        }

        const updates = candidateIds.map((id, index) =>
            prisma.candidate.update({
                where: { id },
                data: { order: index + 1 }
            })
        );

        await prisma.$transaction(updates);
        res.json({ message: "Candidates reordered successfully" });
    } catch (error) {
        console.error("Reorder failed:", error);
        res.status(500).json({ error: "Failed to reorder candidates", details: error.message });
    }
};

module.exports = { getCandidates, createCandidate, updateCandidate, deleteCandidate, reorderCandidates };
