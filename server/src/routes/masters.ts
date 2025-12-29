import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/masters
router.get('/', async (req, res) => {
    try {
        const masters = await prisma.master.findMany({
            include: {
                services: {
                    include: {
                        service: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Transform to match old structure
        const transformed = masters.map(m => ({
            ...m,
            services: m.services.map(s => s.service)
        }));

        res.json(transformed);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/masters
router.post('/', async (req, res) => {
    const { name, role, photo_url, bio, start_hour, end_hour, slot_interval, serviceIds } = req.body;
    console.log("POST /api/masters hit:", { name, serviceIds });
    try {
        const master = await prisma.master.create({
            data: {
                name,
                role,
                photo_url,
                bio,
                start_hour: parseInt(start_hour) || 10,
                end_hour: parseInt(end_hour) || 20,
                slot_interval: parseInt(slot_interval) || 30
            }
        });

        if (serviceIds && Array.isArray(serviceIds)) {
            await prisma.masterService.createMany({
                data: serviceIds.map((serviceId: string) => ({
                    master_id: master.id,
                    service_id: serviceId
                }))
            });
        }

        res.json(master);
    } catch (error: any) {
        console.error("POST /api/masters error:", error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/masters/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, photo_url, bio, start_hour, end_hour, slot_interval, serviceIds } = req.body;
    console.log(`PUT /api/masters/${id} hit:`, { name, serviceIds });
    try {
        const master = await prisma.master.update({
            where: { id },
            data: {
                name,
                role,
                photo_url,
                bio,
                start_hour: parseInt(start_hour) || 10,
                end_hour: parseInt(end_hour) || 20,
                slot_interval: parseInt(slot_interval) || 30
            }
        });

        if (serviceIds && Array.isArray(serviceIds)) {
            await prisma.masterService.deleteMany({ where: { master_id: id } });
            await prisma.masterService.createMany({
                data: serviceIds.map((serviceId: string) => ({
                    master_id: id,
                    service_id: serviceId
                }))
            });
        }

        res.json(master);
    } catch (error: any) {
        console.error(`PUT /api/masters/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/masters/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/masters/${id} hit`);
    try {
        await prisma.master.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        console.error(`DELETE /api/masters/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/masters/by-telegram/:telegramId - Get master by telegram_id
router.get('/by-telegram/:telegramId', async (req, res) => {
    const { telegramId } = req.params;
    console.log(`GET /api/masters/by-telegram/${telegramId} hit`);
    try {
        const master = await prisma.master.findUnique({
            where: { telegram_id: BigInt(telegramId) },
            include: {
                services: {
                    include: { service: true }
                }
            }
        });

        if (!master) {
            return res.status(404).json({ error: 'Master not found' });
        }

        res.json({
            ...master,
            telegram_id: master.telegram_id?.toString(),
            services: master.services.map(s => s.service)
        });
    } catch (error: any) {
        console.error(`GET /api/masters/by-telegram error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/masters/:id/link-telegram - Link telegram_id to master
router.patch('/:id/link-telegram', async (req, res) => {
    const { id } = req.params;
    const { telegram_id } = req.body;
    console.log(`PATCH /api/masters/${id}/link-telegram hit:`, { telegram_id });
    try {
        const master = await prisma.master.update({
            where: { id },
            data: {
                telegram_id: telegram_id ? BigInt(telegram_id) : null
            }
        });

        res.json({
            ...master,
            telegram_id: master.telegram_id?.toString()
        });
    } catch (error: any) {
        console.error(`PATCH /api/masters/${id}/link-telegram error:`, error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

