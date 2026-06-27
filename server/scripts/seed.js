const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function main() {
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
            password: hashedPassword,
        },
    });

    console.log({ admin });

    // Also ensure one Election record exists
    const election = await prisma.election.findFirst();
    if (!election) {
        await prisma.election.create({
            data: { status: 'NOT_STARTED' }
        });
        console.log('Election initialized');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
