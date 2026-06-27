const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdmin() {
  const hashedPassword = await bcrypt.hash('adminelection', 10);
  
  // Clean up any old admins that are not 'advita'
  await prisma.admin.deleteMany({
    where: {
      username: { not: 'advita' }
    }
  });

  const admin = await prisma.admin.upsert({
    where: { username: 'advita' },
    update: { password: hashedPassword },
    create: {
      username: 'advita',
      password: hashedPassword
    }
  });
  console.log('Admin password reset to: adminelection for user: advita');
  await prisma.$disconnect();
}

resetAdmin();
