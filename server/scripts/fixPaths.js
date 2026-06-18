const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPaths() {
  const candidates = await prisma.candidate.findMany();
  for (const c of candidates) {
    let updated = false;
    let data = {};
    if (c.photoUrl && c.photoUrl.includes('\\')) {
      data.photoUrl = c.photoUrl.replace(/\\/g, '/');
      updated = true;
    }
    if (c.symbolUrl && c.symbolUrl.includes('\\')) {
      data.symbolUrl = c.symbolUrl.replace(/\\/g, '/');
      updated = true;
    }
    if (updated) {
      await prisma.candidate.update({
        where: { id: c.id },
        data
      });
      console.log(`Fixed paths for candidate: ${c.name}`);
    }
  }
  await prisma.$disconnect();
}

fixPaths();
