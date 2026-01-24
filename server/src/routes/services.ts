import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/services
router.get('/', async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            orderBy: { category: 'asc' }
        });
        res.json(services);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/services
router.post('/', async (req, res) => {
    const { name, description, duration_minutes, price, category, subcategory, hall, image_url, is_active } = req.body;
    console.log("POST /api/services hit:", { name, price });
    try {
        const service = await prisma.service.create({
            data: {
                name,
                description,
                duration_minutes: parseInt(duration_minutes) || 0,
                price: parseInt(price) || 0,
                category,
                subcategory,
                hall,
                image_url,
                is_active: is_active !== undefined ? is_active : true
            }
        });
        res.json(service);
    } catch (error: any) {
        console.error("POST /api/services error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/services/personalized/:userId - services sorted by user's order frequency
// IMPORTANT: This route must be before /:id routes to prevent Express from matching "personalized" as an id
router.get('/personalized/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`GET /api/services/personalized/${userId} hit`);
    try {
        // Get all active services
        const services = await prisma.service.findMany({
            where: { is_active: true },
            orderBy: { category: 'asc' }
        });

        // Count bookings per service for this user (only paid or completed bookings)
        const bookingCounts = await prisma.booking.groupBy({
            by: ['service_id'],
            where: {
                user_id: userId,
                status: { in: ['paid', 'completed'] }  // Only count actual completed orders
            },
            _count: { service_id: true }
        });

        console.log(`Personalized: found ${bookingCounts.length} service groups with paid bookings for user`);

        // Create a map for quick lookup
        const countMap = new Map(
            bookingCounts.map(c => [c.service_id, c._count.service_id])
        );

        // Merge counts into services
        const servicesWithCounts = services.map(s => ({
            ...s,
            order_count: countMap.get(s.id) || 0
        }));

        // Sort: first by order_count descending, then by category
        servicesWithCounts.sort((a, b) => {
            if (b.order_count !== a.order_count) {
                return b.order_count - a.order_count;
            }
            return (a.category || '').localeCompare(b.category || '');
        });

        res.json(servicesWithCounts);
    } catch (error: any) {
        console.error(`GET /api/services/personalized error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/services/:id
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, duration_minutes, price, category, subcategory, hall, image_url, is_active } = req.body;
    console.log(`PUT /api/services/${id} hit:`, { name });
    try {
        const service = await prisma.service.update({
            where: { id },
            data: {
                name,
                description,
                duration_minutes: parseInt(duration_minutes) || 0,
                price: parseInt(price) || 0,
                category,
                subcategory,
                hall,
                image_url,
                is_active
            }
        });
        res.json(service);
    } catch (error: any) {
        console.error(`PUT /api/services/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/services/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/services/${id} hit`);
    try {
        await prisma.service.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        console.error(`DELETE /api/services/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/services/:id
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    console.log(`PATCH /api/services/${id} hit:`, data);
    try {
        const service = await prisma.service.update({
            where: { id },
            data
        });
        res.json(service);
    } catch (error: any) {
        console.error(`PATCH /api/services/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

