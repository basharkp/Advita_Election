const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function printCandidates() {
    const candidates = await prisma.candidate.findMany({
        orderBy: { createdAt: 'desc' }
    });
    console.log("CANDIDATES IN DATABASE:");
    candidates.forEach(c => {
        console.log(`- Name: ${c.name}, Photo: ${c.photoUrl}, Symbol: ${c.symbolUrl}`);
    });
    await prisma.$disconnect();
}
printCandidates();
