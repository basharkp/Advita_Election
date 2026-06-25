const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const startSession = async (req, res) => {
    try {
        let electionId = req.query.electionId;
        if (!electionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) electionId = defaultElection.id;
        }

        const election = await prisma.election.findUnique({ where: { id: electionId } });
        if (!election || election.status !== 'RUNNING') {
            return res.status(403).json({ error: 'Voting is currently closed' });
        }

        const sessionId = uuidv4();
        // Include electionId in token
        const token = jwt.sign({ sessionId, role: 'voter', electionId }, process.env.JWT_SECRET, {
            expiresIn: '10m',
        });

        res.json({ token, sessionId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start voting session' });
    }
};

const castVote = async (req, res) => {
    const { votes, boothId, sessionId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    let sessionIdToUse = null;
    let boothToUpdate = null;
    let targetElectionId = null;

    try {
        if (boothId) {
            const booth = await prisma.booth.findUnique({ where: { id: boothId } });

            if (!booth) return res.status(404).json({ error: "Booth not found" });
            if (booth.status !== 'ACTIVE') return res.status(403).json({ error: "Booth is not active" });
            if (!booth.currentSessionId) return res.status(403).json({ error: "No active session for this booth" });
            if (sessionId !== booth.currentSessionId) return res.status(403).json({ error: "Invalid or expired voting session" });

            sessionIdToUse = booth.currentSessionId;
            boothToUpdate = booth;
            targetElectionId = booth.electionId;
        } else if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.role !== 'voter') return res.status(403).json({ error: 'Invalid token type' });
                sessionIdToUse = decoded.sessionId;
                targetElectionId = decoded.electionId;
            } catch (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
        } else {
            return res.status(401).json({ error: 'Authentication required (Token or Booth ID)' });
        }

        if (!targetElectionId) {
            const def = await prisma.election.findFirst();
            if (def) targetElectionId = def.id;
        }

        const election = await prisma.election.findUnique({ where: { id: targetElectionId } });
        if (!election || election.status !== 'RUNNING') {
            return res.status(403).json({ error: 'Election is closed' });
        }

        const existingVote = await prisma.vote.findFirst({ where: { sessionId: sessionIdToUse } });
        if (existingVote) {
            return res.status(409).json({ error: 'Vote already cast for this session' });
        }

        if (!Array.isArray(votes) || votes.length === 0) {
            return res.status(400).json({ error: "No votes provided" });
        }

        const voteData = [];
        const invalidPositions = [];

        for (const v of votes) {
            const position = await prisma.position.findUnique({
                where: { id: v.positionId },
                include: { _count: { select: { candidates: true } } }
            });

            // Ensure position belongs to the same election
            if (!position || position._count.candidates < 2 || position.electionId !== targetElectionId) {
                invalidPositions.push(v.positionId);
            } else {
                voteData.push({
                    positionId: v.positionId,
                    candidateId: v.candidateId,
                    sessionId: sessionIdToUse,
                    boothId: boothId || null,
                    electionId: targetElectionId
                });
            }
        }

        if (invalidPositions.length > 0) {
            return res.status(400).json({ error: "Cannot vote for positions with fewer than 2 candidates, or invalid position for this election." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.vote.createMany({ data: voteData });

            if (boothToUpdate) {
                await tx.booth.update({
                    where: { id: boothToUpdate.id },
                    data: {
                        status: 'ACTIVE',
                        currentSessionId: uuidv4(), // Fresh session for next voter
                        lastActivity: new Date()
                    }
                });
            }
        });

        res.json({ message: 'Vote submitted successfully' });

    } catch (error) {
        console.error("Cast vote error:", error);
        res.status(500).json({ error: 'Failed to cast vote' });
    }
};

const getResults = async (req, res) => {
    try {
        let { electionId } = req.query;
        if (!electionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) electionId = defaultElection.id;
        }

        // 1. Get all candidates with their votes aggregated (By Position)
        const candidates = await prisma.candidate.findMany({
            where: { position: { electionId } },
            include: {
                position: true,
                _count: {
                    select: { votes: true }
                }
            }
        });

        const aggregated = candidates.map(c => ({
            id: c.id,
            name: c.name,
            positionId: c.positionId,
            positionName: c.position.title,
            votes: c._count.votes,
            photoUrl: c.photoUrl,
            symbolUrl: c.symbolUrl
        }));

        // 2. Get booth-wise breakdown
        const booths = await prisma.booth.findMany({
            where: { electionId },
            include: {
                votes: {
                    include: {
                        candidate: true,
                        position: true
                    }
                }
            }
        });

        const boothWise = booths.map(b => {
            // Process votes in this booth
            const boothVotes = b.votes;
            const positionMap = {};

            boothVotes.forEach(v => {
                if (!positionMap[v.positionId]) {
                    positionMap[v.positionId] = {
                        id: v.positionId,
                        title: v.position.title,
                        candidates: {}
                    };
                }
                if (!positionMap[v.positionId].candidates[v.candidateId]) {
                    positionMap[v.positionId].candidates[v.candidateId] = {
                        id: v.candidateId,
                        name: v.candidate.name,
                        votes: 0
                    };
                }
                positionMap[v.positionId].candidates[v.candidateId].votes++;
            });

            return {
                boothId: b.id,
                boothName: b.name,
                positions: Object.values(positionMap).map(p => ({
                    ...p,
                    candidates: Object.values(p.candidates)
                }))
            };
        });

        res.json({ aggregated, boothWise });
    } catch (e) {
        console.error("Results error:", e);
        res.status(500).json({ error: "Failed to fetch results" });
    }
};

const getPublicResults = async (req, res) => {
    try {
        let { electionId } = req.query;
        if (!electionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) electionId = defaultElection.id;
        }

        if (!electionId) {
            return res.status(404).json({ error: "Election not found" });
        }

        const election = await prisma.election.findUnique({
            where: { id: electionId }
        });

        if (!election) {
            return res.status(404).json({ error: "Election not found" });
        }

        if (!election.showResultsPublicly) {
            return res.status(403).json({ error: "Results are not public yet. Please check back later." });
        }

        // 1. Get all candidates with their votes aggregated (By Position)
        const candidates = await prisma.candidate.findMany({
            where: { position: { electionId } },
            include: {
                position: true,
                _count: {
                    select: { votes: true }
                }
            }
        });

        const aggregated = candidates.map(c => ({
            id: c.id,
            name: c.name,
            positionId: c.positionId,
            positionName: c.position.title,
            votes: c._count.votes,
            photoUrl: c.photoUrl,
            symbolUrl: c.symbolUrl
        }));

        // 2. Get booth-wise breakdown
        const booths = await prisma.booth.findMany({
            where: { electionId },
            include: {
                votes: {
                    include: {
                        candidate: true,
                        position: true
                    }
                }
            }
        });

        const boothWise = booths.map(b => {
            const boothVotes = b.votes;
            const positionMap = {};

            boothVotes.forEach(v => {
                if (!positionMap[v.positionId]) {
                    positionMap[v.positionId] = {
                        id: v.positionId,
                        title: v.position.title,
                        candidates: {}
                    };
                }
                if (!positionMap[v.positionId].candidates[v.candidateId]) {
                    positionMap[v.positionId].candidates[v.candidateId] = {
                        id: v.candidateId,
                        name: v.candidate.name,
                        votes: 0
                    };
                }
                positionMap[v.positionId].candidates[v.candidateId].votes++;
            });

            return {
                boothId: b.id,
                boothName: b.name,
                positions: Object.values(positionMap).map(p => ({
                    ...p,
                    candidates: Object.values(p.candidates)
                }))
            };
        });

        res.json({ aggregated, boothWise, electionName: election.name, electionStatus: election.status });
    } catch (e) {
        console.error("Public results error:", e);
        res.status(500).json({ error: "Failed to fetch public results" });
    }
};

module.exports = { startSession, castVote, getResults, getPublicResults };
