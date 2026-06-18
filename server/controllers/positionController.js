const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getPositions = async (req, res) => {
    try {
        let { electionId } = req.query;
        if (!electionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) electionId = defaultElection.id;
        }

        const positions = await prisma.position.findMany({
            where: { electionId },
            orderBy: { order: 'asc' },
            include: { candidates: { orderBy: { order: 'asc' } } },
        });
        res.json(positions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch positions' });
    }
};

const createPosition = async (req, res) => {
    const { title, electionId, order } = req.body;
    try {
        let targetElectionId = electionId;
        if (!targetElectionId) {
            const defaultElection = await prisma.election.findFirst();
            if (defaultElection) targetElectionId = defaultElection.id;
        }

        let nextOrder;
        if (order !== undefined && order !== null) {
            nextOrder = parseInt(order, 10);
            // Shift positions at or after nextOrder
            const toShift = await prisma.position.findMany({
                where: { electionId: targetElectionId, order: { gte: nextOrder } },
                orderBy: { order: 'desc' }
            });
            await prisma.$transaction(
                toShift.map(pos =>
                    prisma.position.update({
                        where: { id: pos.id },
                        data: { order: pos.order + 1 }
                    })
                )
            );
        } else {
            // Determine next order for this specific election
            const lastPos = await prisma.position.findFirst({
                where: { electionId: targetElectionId },
                orderBy: { order: 'desc' },
            });
            nextOrder = lastPos ? lastPos.order + 1 : 1;
        }

        const position = await prisma.position.create({
            data: {
                title,
                order: nextOrder,
                electionId: targetElectionId
            },
        });
        res.json(position);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create position' });
    }
};

const updatePosition = async (req, res) => {
    const { id } = req.params;
    const { title, order } = req.body;
    try {
        const currentPos = await prisma.position.findUnique({ where: { id } });
        if (!currentPos) return res.status(404).json({ error: 'Position not found' });

        let data = {};
        if (title !== undefined) data.title = title;

        if (order !== undefined && order !== null) {
            const newOrder = parseInt(order, 10);
            if (newOrder !== currentPos.order) {
                // Perform shifting
                if (newOrder < currentPos.order) {
                    // Moving up: shift [newOrder, currentPos.order - 1] by +1
                    const toShift = await prisma.position.findMany({
                        where: { 
                            electionId: currentPos.electionId, 
                            order: { gte: newOrder, lt: currentPos.order } 
                        },
                        orderBy: { order: 'desc' }
                    });
                    await prisma.$transaction(
                        toShift.map(pos =>
                            prisma.position.update({
                                where: { id: pos.id },
                                data: { order: pos.order + 1 }
                            })
                        )
                    );
                } else {
                    // Moving down: shift [currentPos.order + 1, newOrder] by -1
                    const toShift = await prisma.position.findMany({
                        where: { 
                            electionId: currentPos.electionId, 
                            order: { gt: currentPos.order, lte: newOrder } 
                        },
                        orderBy: { order: 'asc' }
                    });
                    await prisma.$transaction(
                        toShift.map(pos =>
                            prisma.position.update({
                                where: { id: pos.id },
                                data: { order: pos.order - 1 }
                            })
                        )
                    );
                }
                data.order = newOrder;
            }
        }

        const updated = await prisma.position.update({
            where: { id },
            data,
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update position' });
    }
};

const deletePosition = async (req, res) => {
    const { id } = req.params;
    try {
        const toDelete = await prisma.position.findUnique({ where: { id } });
        if (!toDelete) return res.status(404).json({ error: 'Position not found' });

        await prisma.$transaction(async (tx) => {
            await tx.position.delete({ where: { id } });
            
            // Shift orders only within the SAME election
            await tx.position.updateMany({
                where: { 
                    electionId: toDelete.electionId,
                    order: { gt: toDelete.order } 
                },
                data: { order: { increment: -1 } }
            });
        });

        res.json({ message: 'Position deleted and reordered' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete position' });
    }
};

const reorderPositions = async (req, res) => {
    const { orderedIds } = req.body; 

    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'Invalid data' });

    try {
        const tempBase = 1000000;
        const tempUpdates = orderedIds.map((id, index) =>
            prisma.position.update({
                where: { id },
                data: { order: tempBase + index + 1 }
            })
        );

        const finalUpdates = orderedIds.map((id, index) =>
            prisma.position.update({
                where: { id },
                data: { order: index + 1 }
            })
        );

        await prisma.$transaction([
            ...tempUpdates,
            ...finalUpdates
        ]);

        res.json({ message: 'Reorder successful' });
    } catch (error) {
        console.error("Reorder failed:", error);
        res.status(500).json({ error: 'Failed to reorder' });
    }
};

module.exports = { getPositions, createPosition, updatePosition, deletePosition, reorderPositions };
