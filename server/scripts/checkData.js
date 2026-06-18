const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const e = await prisma.election.findFirst();
  console.log(e);
}
main().finally(() => prisma.$disconnect());
