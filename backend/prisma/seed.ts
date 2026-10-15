import { PrismaClient } from '@prisma/client';
import { Argon2HashProvider } from '../src/shared/infrastructure/argon2-hash.provider.js';

const prisma = new PrismaClient();
const hashProvider = new Argon2HashProvider();

async function main() {
    console.log("🌱 Iniciando seed de base de datos SyncDB...");

    const seedEmail = 'admin@syncdb.com';
    const seedPassword = 'Admin1234!';
    const passwordHash = await hashProvider.hash(seedPassword);

    const user = await prisma.user.upsert({
        where: { email: seedEmail },
        update: {
            passwordHash,
            firstName: 'Diego',
            lastName: 'Bran',
            isActive: true,
            isVerify: true,
        },
        create: {
            email: seedEmail,
            passwordHash,
            firstName: 'Diego',
            lastName: 'Bran',
            isActive: true,
            isVerify: true,
        },
    });

    console.log("==================================================");
    console.log("✅ Usuario Master creado / actualizado exitosamente:");
    console.log(`   ID:        ${user.id}`);
    console.log(`   Email:     ${user.email}`);
    console.log(`   Password:  ${seedPassword}`);
    console.log(`   Nombre:    ${user.firstName} ${user.lastName}`);
    console.log("==================================================");
}

main()
    .catch((e) => {
        console.error("❌ Error ejecutando seed:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });