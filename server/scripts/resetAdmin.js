const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdmin() {
  const hashedPassword = await bcrypt.hash('admin', 10);
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword },
    create: {
      username: 'admin',
      password: hashedPassword
    }
  });
  console.log('Admin password reset to: admin');
  await prisma.$disconnect();
}

resetAdmin();
