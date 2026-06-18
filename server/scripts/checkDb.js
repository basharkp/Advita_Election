const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const election = await prisma.election.findFirst();
  console.log('Election Status:', election ? election.status : 'No election record');
  
  const admins = await prisma.admin.findMany();
  console.log('Admins Count:', admins.length);
  if (admins.length > 0) {
      console.log('Admin Usernames:', admins.map(a => a.username));
  }

  const booths = await prisma.booth.findMany();
  console.log('Booths Count:', booths.length);

  const positions = await prisma.position.findMany();
  console.log('Positions Count:', positions.length);

  const candidates = await prisma.candidate.findMany();
  console.log('Candidates Count:', candidates.length);
  const candidateWithPhoto = candidates.find(c => c.photoUrl);
  if (candidateWithPhoto) {
      console.log('Candidate Photo URL:', candidateWithPhoto.photoUrl);
  } else {
      console.log('No candidates with photos found.');
  }



  await prisma.$disconnect();
}

checkDb();
