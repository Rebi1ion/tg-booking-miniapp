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
    const {
        birthday_enabled,
        birthday_discount,
        birthday_message,
        birthday_promo_days,
        require_prepayment,
        banned_users,
        welcome_message,
        msg_booking_confirmed,
        msg_reminder_24h,
        msg_reminder_2h,
        msg_payment_success
    } = req.body;
    console.log("PUT /api/settings hit:", req.body);
    try {
        const updateData: any = {};

        // Handle all fields - only set if provided
        if (birthday_enabled !== undefined) {
            updateData.birthday_enabled = birthday_enabled === true || birthday_enabled === 'true';
        }
        if (birthday_discount !== undefined) {
            updateData.birthday_discount = parseInt(birthday_discount) || 10;
        }
        if (birthday_message !== undefined) {
            updateData.birthday_message = birthday_message;
        }
        if (birthday_promo_days !== undefined) {
            updateData.birthday_promo_days = parseInt(birthday_promo_days) || 7;
        }
        if (require_prepayment !== undefined) {
            updateData.require_prepayment = require_prepayment === true || require_prepayment === 'true';
        }
        if (banned_users !== undefined) {
            updateData.banned_users = typeof banned_users === 'string' ? banned_users : JSON.stringify(banned_users);
        }
        if (welcome_message !== undefined) {
            updateData.welcome_message = welcome_message;
        }
        if (msg_booking_confirmed !== undefined) {
            updateData.msg_booking_confirmed = msg_booking_confirmed;
        }
        if (msg_reminder_24h !== undefined) {
            updateData.msg_reminder_24h = msg_reminder_24h;
        }
        if (msg_reminder_2h !== undefined) {
            updateData.msg_reminder_2h = msg_reminder_2h;
        }
        if (msg_payment_success !== undefined) {
            updateData.msg_payment_success = msg_payment_success;
        }

        const settings = await prisma.settings.upsert({
            where: { id: 'main' },
            update: updateData,
            create: {
                id: 'main',
                birthday_discount: 10,
                birthday_message: '🎂 С днём рождения! Дарим вам скидку {discount}%!',
                birthday_promo_days: 7,
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
