import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/promotions - get all promotions
router.get('/', async (req, res) => {
    console.log("GET /api/promotions hit");
    try {
        const promotions = await prisma.promotion.findMany({
            orderBy: { created_at: 'desc' }
        });
        res.json(promotions);
    } catch (error: any) {
        console.error("GET /api/promotions error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/promotions/active - get active promotions only
router.get('/active', async (req, res) => {
    console.log("GET /api/promotions/active hit");
    try {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: {
                is_active: true,
                OR: [
                    { start_date: null },
                    { start_date: { lte: now } }
                ],
                AND: [
                    {
                        OR: [
                            { end_date: null },
                            { end_date: { gte: now } }
                        ]
                    }
                ]
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(promotions);
    } catch (error: any) {
        console.error("GET /api/promotions/active error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/promotions - create promotion
router.post('/', async (req, res) => {
    const { name, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, applies_to, max_uses_per_user } = req.body;
    console.log("POST /api/promotions hit:", { name, promo_code });
    try {
        const promotion = await prisma.promotion.create({
            data: {
                name,
                description,
                discount_type,
                discount_value: parseInt(discount_value) || 0,
                promo_code: promo_code || null,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                is_active: is_active !== undefined ? is_active : true,
                applies_to,
                max_uses_per_user: parseInt(max_uses_per_user) || 1
            }
        });
        res.json(promotion);
    } catch (error: any) {
        console.error("POST /api/promotions error:", error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/promotions/:id - update promotion
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, applies_to, max_uses_per_user } = req.body;
    console.log(`PUT /api/promotions/${id} hit`);
    try {
        const promotion = await prisma.promotion.update({
            where: { id },
            data: {
                name,
                description,
                discount_type,
                discount_value: parseInt(discount_value) || 0,
                promo_code: promo_code || null,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                is_active,
                applies_to,
                max_uses_per_user: max_uses_per_user !== undefined ? parseInt(max_uses_per_user) || 1 : undefined
            }
        });
        res.json(promotion);
    } catch (error: any) {
        console.error(`PUT /api/promotions/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/promotions/:id - delete promotion
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/promotions/${id} hit`);
    try {
        await prisma.promotion.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        console.error(`DELETE /api/promotions/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/promotions/validate - validate promo code
router.post('/validate', async (req, res) => {
    const { promo_code, service_id, user_id } = req.body;
    console.log("POST /api/promotions/validate hit:", { promo_code, service_id, user_id });
    try {
        if (!promo_code) {
            return res.status(400).json({ valid: false, error: 'Промокод не указан' });
        }

        const now = new Date();
        const promotion = await prisma.promotion.findFirst({
            where: {
                promo_code: promo_code.toUpperCase(),
                is_active: true,
                OR: [
                    { start_date: null },
                    { start_date: { lte: now } }
                ]
            }
        });

        if (!promotion) {
            return res.json({ valid: false, error: 'Промокод не найден или неактивен' });
        }

        // Check end date
        if (promotion.end_date && promotion.end_date < now) {
            return res.json({ valid: false, error: 'Срок действия промокода истёк' });
        }

        // Check if applies to this service
        if (promotion.applies_to && promotion.applies_to !== 'all' && service_id) {
            const serviceIds = promotion.applies_to.split(',').map(s => s.trim());
            if (!serviceIds.includes(service_id)) {
                return res.json({ valid: false, error: 'Промокод не применим к этой услуге' });
            }
        }

        // Check usage limit per user
        if (user_id && promotion.max_uses_per_user > 0) {
            const usageCount = await prisma.promoUsage.count({
                where: {
                    promotion_id: promotion.id,
                    user_id: user_id
                }
            });
            if (usageCount >= promotion.max_uses_per_user) {
                return res.json({ valid: false, error: `Вы уже использовали этот промокод максимальное количество раз (${promotion.max_uses_per_user})` });
            }
        }

        res.json({
            valid: true,
            promotion: {
                id: promotion.id,
                name: promotion.name,
                discount_type: promotion.discount_type,
                discount_value: promotion.discount_value,
                max_uses_per_user: promotion.max_uses_per_user
            }
        });
    } catch (error: any) {
        console.error("POST /api/promotions/validate error:", error);
        res.status(500).json({ valid: false, error: error.message });
    }
});

// POST /api/promotions/use - record promo code usage
router.post('/use', async (req, res) => {
    const { promotion_id, user_id } = req.body;
    console.log("POST /api/promotions/use hit:", { promotion_id, user_id });
    try {
        if (!promotion_id || !user_id) {
            return res.status(400).json({ success: false, error: 'Необходимы promotion_id и user_id' });
        }

        // Upsert usage record (increment count would require a different approach)
        // For simplicity, we create one record per usage
        const usage = await prisma.promoUsage.create({
            data: {
                promotion_id,
                user_id
            }
        }).catch(async () => {
            // If unique constraint fails, update the existing record's timestamp
            return await prisma.promoUsage.update({
                where: {
                    promotion_id_user_id: {
                        promotion_id,
                        user_id
                    }
                },
                data: {
                    used_at: new Date()
                }
            });
        });

        res.json({ success: true, usage });
    } catch (error: any) {
        console.error("POST /api/promotions/use error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
