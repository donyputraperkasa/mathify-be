import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL ?? 'owner@satelyd.com').toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD ?? 'AdminPassword123!';
  const ownerName = process.env.OWNER_NAME ?? 'Owner Satelyd';

  console.log(`🌱 Memeriksa akun Owner (${ownerEmail})...`);

  const existingUser = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  const hashedPassword = await bcrypt.hash(ownerPassword, 10);

  if (!existingUser) {
    const createdOwner = await prisma.user.create({
      data: {
        email: ownerEmail,
        password: hashedPassword,
        name: ownerName,
        role: Role.ADMIN,
        gameTokenBalance: 999999,
        examCreditBalance: 999999,
      },
    });

    console.log(`✅ Akun Owner berhasil dibuat!`);
    console.log(`   Email : ${createdOwner.email}`);
    console.log(`   Role  : ${createdOwner.role}`);
    console.log(`   Tokens: Unlimited (999999 balance)`);
  } else {
    // Pastikan user ini ber-role ADMIN dan password diperbarui sesuai env
    const updatedOwner = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: ownerName,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    console.log(`ℹ️ Akun Owner sudah ada. Password dan role ADMIN berhasil diperbarui.`);
    console.log(`   Email : ${updatedOwner.email}`);
    console.log(`   Role  : ${updatedOwner.role}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
