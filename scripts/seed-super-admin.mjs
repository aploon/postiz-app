import { PrismaClient } from '@prisma/client';

function usage() {
  console.error('Usage: pnpm run seed:super-admin -- <email>');
  process.exit(1);
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const email = (args[0] || '').trim().toLowerCase();

if (!email) {
  usage();
}

const prisma = new PrismaClient();

try {
  const users = await prisma.user.findMany({
    where: { email },
    select: { id: true, providerName: true, isSuperAdmin: true },
  });

  if (users.length === 0) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const toPromote = users.filter((user) => !user.isSuperAdmin);

  if (toPromote.length === 0) {
    console.log(`${email} is already a platform super admin. Nothing to do.`);
    process.exit(0);
  }

  await prisma.user.updateMany({
    where: { email },
    data: { isSuperAdmin: true },
  });

  const providers = toPromote.map((user) => user.providerName).join(', ');
  console.log(`Platform super admin enabled for ${email} (${providers}).`);
} catch (err) {
  console.error('Failed to promote super admin:', err.message || err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
