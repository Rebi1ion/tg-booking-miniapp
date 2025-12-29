import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// POST /api/users/upsert
router.post('/upsert', async (req, res) => {
    const { telegram_id, first_name, username } = req.body;

    if (!telegram_id) return res.status(400).json({ error: 'telegram_id is required' });

    try {
        const user = await prisma.user.upsert({
            where: { telegram_id: BigInt(telegram_id) },
            update: {
                first_name,
                username
            },
            create: {
                telegram_id: BigInt(telegram_id),
                first_name,
                username
            }
        });

        // Convert BigInt for JSON response
        const response = {
            ...user,
            telegram_id: Number(user.telegram_id)
        };

        res.json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id/birthday - set user birthday (one-time only)
router.put('/:id/birthday', async (req, res) => {
    const { id } = req.params;
    const { birthday } = req.body;

    if (!birthday) {
        return res.status(400).json({ error: 'birthday is required' });
    }

    try {
        // Check if user already has a birthday set
        const existingUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (existingUser.birthday) {
            return res.status(400).json({ error: 'День рождения уже установлен и не может быть изменён' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                birthday: new Date(birthday)
            }
        });

        const response = {
            ...user,
            telegram_id: Number(user.telegram_id)
        };

        res.json(response);
    } catch (error: any) {
        console.error('PUT /api/users/:id/birthday error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id/preferred-branch - set user's preferred branch
router.put('/:id/preferred-branch', async (req, res) => {
    const { id } = req.params;
    const { branch_id } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                preferred_branch_id: branch_id
            }
        });

        const response = {
            ...user,
            telegram_id: Number(user.telegram_id)
        };

        res.json(response);
    } catch (error: any) {
        console.error('PUT /api/users/:id/preferred-branch error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
