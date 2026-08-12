import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';

const TAKKATECH_ORG_NAME = 'Takkatech';
const SEED_MARKER = 'seed:first-takka-admin';

function usage() {
  console.error(
    'Usage: pnpm run seed:first-takka-admin -- <email> <password>'
  );
  process.exit(1);
}

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const email = (args[0] || '').trim().toLowerCase();
const password = args[1] || '';

if (!email || !password) {
  usage();
}

if (password.length < 3) {
  console.error('Password must be at least 3 characters.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const existingAdmins = await prisma.user.count({
    where: { isTakkaAdmin: true },
  });

  if (existingAdmins > 0) {
    console.log('A Takka admin already exists. Nothing to do.');
    process.exit(0);
  }

  const existingUser = await prisma.user.findFirst({
    where: { email, providerName: 'LOCAL' },
  });

  if (existingUser) {
    console.error(
      `User ${email} already exists. Use another email or promote manually.`
    );
    process.exit(1);
  }

  let organization = await prisma.organization.findFirst({
    where: { name: TAKKATECH_ORG_NAME },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: TAKKATECH_ORG_NAME,
        apiKey: randomBytes(20).toString('hex'),
        allowTrial: true,
        isTrailing: true,
      },
    });
    console.log(`Created organization "${TAKKATECH_ORG_NAME}".`);
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashSync(password, 10),
      providerName: 'LOCAL',
      providerId: '',
      timezone: 0,
      activated: true,
      isTakkaAdmin: true,
      isSuperAdmin: false,
      ip: SEED_MARKER,
      agent: SEED_MARKER,
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: 'SUPERADMIN',
    },
  });

  console.log(`First Takka admin created: ${email}`);
  console.log(`Attached to organization "${TAKKATECH_ORG_NAME}" as SUPERADMIN.`);
} catch (err) {
  console.error('Failed to seed first Takka admin:', err.message || err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
