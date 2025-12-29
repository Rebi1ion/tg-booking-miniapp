import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create Services
    const s1 = await prisma.service.upsert({
        where: { id: 'service-1' },
        update: {},
        create: {
            id: 'service-1',
            name: 'Мужская стрижка',
            price: 1500,
            duration_minutes: 60,
            category: 'Стрижки',
            description: 'Классическая мужская стрижка'
        }
    });

    const s2 = await prisma.service.upsert({
        where: { id: 'service-2' },
        update: {},
        create: {
            id: 'service-2',
            name: 'Оформление бороды',
            price: 800,
            duration_minutes: 30,
            category: 'Борода',
            description: 'Стрижка и придание формы бороде'
        }
    });

    // Create Masters
    const m1 = await prisma.master.upsert({
        where: { id: 'master-1' },
        update: {},
        create: {
            id: 'master-1',
            name: 'Алексей',
            role: 'Топ-барбер',
            start_hour: 10,
            end_hour: 20,
            slot_interval: 30
        }
    });

    const m2 = await prisma.master.upsert({
        where: { id: 'master-2' },
        update: {},
        create: {
            id: 'master-2',
            name: 'Дмитрий',
            role: 'Барбер',
            start_hour: 9,
            end_hour: 21,
            slot_interval: 60
        }
    });

    // Link Masters and Services
    await prisma.masterService.upsert({
        where: { master_id_service_id: { master_id: m1.id, service_id: s1.id } },
        update: {},
        create: { master_id: m1.id, service_id: s1.id }
    });

    await prisma.masterService.upsert({
        where: { master_id_service_id: { master_id: m1.id, service_id: s2.id } },
        update: {},
        create: { master_id: m1.id, service_id: s2.id }
    });

    await prisma.masterService.upsert({
        where: { master_id_service_id: { master_id: m2.id, service_id: s1.id } },
        update: {},
        create: { master_id: m2.id, service_id: s1.id }
    });

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
