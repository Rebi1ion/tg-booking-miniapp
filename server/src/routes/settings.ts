import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/settings - get current settings
router.get('/', async (req, res) => {
    console.log("GET /api/settings hit");
    try {
        let settings = await prisma.settings.findUnique({
            where: { id: 'main' }
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    id: 'main',
                    birthday_discount: 10,
                    birthday_message: '🎂 С днём рождения! Дарим вам скидку {discount}%!',
                    birthday_promo_days: 7
                }
            });
        }

        res.json(settings);
    } catch (error: any) {
        console.error("GET /api/settings error:", error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/settings - update settings
router.put('/', async (req, res) => {
    const { birthday_discount, birthday_message, birthday_promo_days } = req.body;
    console.log("PUT /api/settings hit:", req.body);
    try {
        const settings = await prisma.settings.upsert({
            where: { id: 'main' },
            update: {
                birthday_discount: parseInt(birthday_discount) || 10,
                birthday_message: birthday_message || '🎂 С днём рождения! Дарим вам скидку {discount}%!',
                birthday_promo_days: parseInt(birthday_promo_days) || 7
            },
            create: {
                id: 'main',
                birthday_discount: parseInt(birthday_discount) || 10,
                birthday_message: birthday_message || '🎂 С днём рождения! Дарим вам скидку {discount}%!',
                birthday_promo_days: parseInt(birthday_promo_days) || 7
            }
        });
        res.json(settings);
    } catch (error: any) {
        console.error("PUT /api/settings error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
