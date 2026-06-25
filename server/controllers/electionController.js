const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllElections = async (req, res) => {
    try {
        const elections = await prisma.election.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(elections);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch elections' });
    }
};

const getElectionStatus = async (req, res) => {
    try {
        const electionId = req.query.electionId || req.params.id;
        let election;
        if (electionId) {
            election = await prisma.election.findUnique({ where: { id: electionId } });
        } else {
            election = await prisma.election.findFirst();
        }
        
        if (!election) {
            return res.status(404).json({ error: "Election not found" });
        }
        res.json(election);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch election status' });
    }
};

const createElection = async (req, res) => {
    const { name } = req.body;
    try {
        const newElection = await prisma.election.create({
            data: { 
                name: name || 'New Election', 
                status: 'NOT_STARTED' 
            },
        });
        res.json(newElection);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create election' });
    }
};

const updateElection = async (req, res) => {
    const id = req.params.id;
    const { status, name } = req.body;
    
    try {
        const election = await prisma.election.findUnique({ where: { id } });
        if (!election) {
            return res.status(404).json({ error: "Election not found" });
        }

        const data = {};
        if (status) data.status = status;
        if (name) data.name = name;
        if (typeof req.body.showResultsPublicly !== 'undefined') {
            data.showResultsPublicly = req.body.showResultsPublicly;
        }

        const updated = await prisma.election.update({
            where: { id },
            data,
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update election' });
    }
};

const deleteElection = async (req, res) => {
    const id = req.params.id;
    try {
        const activeBooths = await prisma.booth.findFirst({
            where: { electionId: id, status: { not: 'IDLE' } }
        });
        if (activeBooths) {
            return res.status(400).json({ error: 'Cannot delete election with active booths' });
        }

        await prisma.election.delete({ where: { id } });
        res.json({ message: 'Election deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete election' });
    }
};

const resetElection = async (req, res) => {
    const id = req.params.id;
    try {
        await prisma.$transaction([
            prisma.vote.deleteMany({ where: { electionId: id } }),
        ]);

        await prisma.election.update({
            where: { id },
            data: { status: 'NOT_STARTED' }
        });

        res.json({ message: 'Election reset successfully. Votes cleared.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset election' });
    }
};

// Backwards compatible updateElectionStatus for legacy route
const updateElectionStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const electionId = req.query.electionId || req.body.electionId;
        let election;
        if (electionId) {
            election = await prisma.election.findUnique({ where: { id: electionId } });
        } else {
            election = await prisma.election.findFirst();
        }

        if (!election) return res.status(404).json({ error: "Election not found" });

        const updated = await prisma.election.update({
            where: { id: election.id },
            data: { status },
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update election status' });
    }
};

// Backwards compatible resetElectionLegacy for legacy route
const resetElectionLegacy = async (req, res) => {
    try {
        const electionId = req.query.electionId || req.body.electionId;
        let election;
        if (electionId) {
            election = await prisma.election.findUnique({ where: { id: electionId } });
        } else {
            election = await prisma.election.findFirst();
        }

        if (!election) return res.status(404).json({ error: "Election not found" });

        await prisma.$transaction([
            prisma.vote.deleteMany({ where: { electionId: election.id } }),
        ]);

        await prisma.election.update({
            where: { id: election.id },
            data: { status: 'NOT_STARTED' }
        });

        res.json({ message: 'Election reset successfully. Votes cleared.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset election' });
    }
};

module.exports = { 
    getAllElections, 
    getElectionStatus, 
    createElection, 
    updateElection, 
    deleteElection, 
    resetElection,
    updateElectionStatus,
    resetElectionLegacy
};
