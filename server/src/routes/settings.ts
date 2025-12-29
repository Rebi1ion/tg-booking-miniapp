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
    const { birthday_discount, birthday_message, birthday_promo_days, require_prepayment, banned_users } = req.body;
    console.log("PUT /api/settings hit:", req.body);
    try {
        const updateData: any = {
            birthday_discount: parseInt(birthday_discount) || 10,
            birthday_message: birthday_message || '🎂 С днём рождения! Дарим вам скидку {discount}%!',
            birthday_promo_days: parseInt(birthday_promo_days) || 7,
            require_prepayment: require_prepayment === true || require_prepayment === 'true'
        };

        // Handle banned_users if provided
        if (banned_users !== undefined) {
            updateData.banned_users = typeof banned_users === 'string' ? banned_users : JSON.stringify(banned_users);
        }

        const settings = await prisma.settings.upsert({
            where: { id: 'main' },
            update: updateData,
            create: {
                id: 'main',
                ...updateData
            }
        });
        res.json(settings);
    } catch (error: any) {
        console.error("PUT /api/settings error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings/ban - ban a user by telegram ID
router.post('/ban', async (req, res) => {
    const { telegram_id } = req.body;
    console.log("POST /api/settings/ban hit:", telegram_id);
    try {
        const settings = await prisma.settings.findUnique({ where: { id: 'main' } });
        const bannedUsers: string[] = settings?.banned_users ? JSON.parse(settings.banned_users) : [];

        if (!bannedUsers.includes(telegram_id.toString())) {
            bannedUsers.push(telegram_id.toString());
        }

        const updated = await prisma.settings.update({
            where: { id: 'main' },
            data: { banned_users: JSON.stringify(bannedUsers) }
        });

        res.json({ success: true, banned_users: JSON.parse(updated.banned_users) });
    } catch (error: any) {
        console.error("Ban user error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/settings/unban - unban a user by telegram ID
router.post('/unban', async (req, res) => {
    const { telegram_id } = req.body;
    console.log("POST /api/settings/unban hit:", telegram_id);
    try {
        const settings = await prisma.settings.findUnique({ where: { id: 'main' } });
        let bannedUsers: string[] = settings?.banned_users ? JSON.parse(settings.banned_users) : [];

        bannedUsers = bannedUsers.filter(id => id !== telegram_id.toString());

        const updated = await prisma.settings.update({
            where: { id: 'main' },
            data: { banned_users: JSON.stringify(bannedUsers) }
        });

        res.json({ success: true, banned_users: JSON.parse(updated.banned_users) });
    } catch (error: any) {
        console.error("Unban user error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
