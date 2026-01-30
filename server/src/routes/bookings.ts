import { Router } from 'express';
import prisma from '../utils/prisma';
import dotenv from 'dotenv';
import { createPrepaymentInvoice } from '../services/paymentService';

dotenv.config();

const router = Router();
const MAX_PENDING_BOOKINGS = parseInt(process.env.MAX_PENDING_BOOKINGS_PER_USER || '3');

// GET /api/bookings
router.get('/', async (req, res) => {
    console.log("GET /api/bookings hit", req.query);
    try {
        const { date, master_id } = req.query;

        // Build where clause based on query params
        const where: any = {};

        // Filter by master_id if provided
        if (master_id && typeof master_id === 'string') {
            where.master_id = master_id;
        }

        // Filter by date if provided
        if (date && typeof date === 'string') {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            where.start_time = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        // Exclude pending_prepayment bookings - they only appear after payment
        where.status = { not: 'pending_prepayment' };

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                service: true,
                master: true,
                user: true
            },
            orderBy: { start_time: 'asc' }
        });
        res.json(bookings);
    } catch (error: any) {
        console.error("GET /api/bookings error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/bookings/user/:telegram_id
router.get('/user/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { telegram_id: BigInt(telegram_id) }
        });

        if (!user) return res.json([]);

        const bookings = await prisma.booking.findMany({
            where: { user_id: user.id },
            include: {
                service: true,
                master: true
            },
            orderBy: { start_time: 'desc' }
        });
        res.json(bookings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/bookings
router.post('/', async (req, res) => {
    const { user_id, service_id, master_id, branch_id, start_time, end_time, status, payment_id, client_name, client_phone, send_invoice, custom_price, promo_id } = req.body;

    try {
        // Check if user is banned (only for client bookings)
        if (user_id) {
            const settings = await prisma.settings.findUnique({ where: { id: 'main' } });
            const user = await prisma.user.findUnique({ where: { id: user_id } });

            if (settings?.banned_users && user) {
                const bannedUsers: string[] = JSON.parse(settings.banned_users);
                if (bannedUsers.includes(user.telegram_id.toString())) {
                    return res.status(403).json({
                        error: 'Ваш аккаунт заблокирован. Обратитесь к администратору.',
                        code: 'USER_BANNED'
                    });
                }
            }

            // Check if prepayment is required
            if (settings?.require_prepayment) {
                // Get user telegram_id and service/master info for invoice
                const user = await prisma.user.findUnique({ where: { id: user_id } });
                const service = await prisma.service.findUnique({ where: { id: service_id } });
                const master = await prisma.master.findUnique({ where: { id: master_id } });

                if (!user || !service || !master) {
                    return res.status(400).json({ error: 'Данные не найдены' });
                }

                // Send prepayment invoice - booking will be created after successful payment
                const invoiceSent = await createPrepaymentInvoice(
                    Number(user.telegram_id),
                    {
                        user_id,
                        service_id,
                        master_id,
                        branch_id,
                        start_time,
                        end_time,
                        client_name: client_name || user.first_name || 'Клиент',
                        custom_price
                    },
                    { name: service.name, price: service.price },
                    master.name
                );

                if (invoiceSent) {
                    return res.status(200).json({
                        success: true,
                        invoiceSent: true,
                        message: 'Инвойс на оплату отправлен в Telegram. Запись будет создана после оплаты.'
                    });
                } else {
                    return res.status(500).json({ error: 'Не удалось отправить инвойс' });
                }
            }
        }


        // Check pending bookings limit (only for registered users, not admin bookings)
        if (user_id && MAX_PENDING_BOOKINGS > 0) {
            const pendingCount = await prisma.booking.count({
                where: {
                    user_id: user_id,
                    status: 'pending'
                }
            });

            if (pendingCount >= MAX_PENDING_BOOKINGS) {
                return res.status(429).json({
                    error: `Превышен лимит неоплаченных записей (${MAX_PENDING_BOOKINGS}). Оплатите или отмените существующие записи.`,
                    code: 'PENDING_LIMIT_EXCEEDED'
                });
            }
        }

        // Validate Promotion Limits
        if (promo_id) {
            const promotion = await prisma.promotion.findUnique({ where: { id: promo_id } });
            if (promotion) {
                // Check if active and dates
                const now = new Date();
                if (!promotion.is_active ||
                    (promotion.start_date && promotion.start_date > now) ||
                    (promotion.end_date && promotion.end_date < now)) {
                    return res.status(400).json({ error: 'Промокод неактивен или срок действия истек' });
                }

                // Check Max Total Uses
                if (promotion.max_total_uses) {
                    const totalUses = await prisma.promoUsage.count({ where: { promotion_id: promo_id } });
                    if (totalUses >= promotion.max_total_uses) {
                        return res.status(400).json({ error: 'Лимит использования промокода исчерпан' });
                    }
                }

                // Check Max Uses Per User
                if (user_id && promotion.max_uses_per_user > 0) {
                    const userUses = await prisma.promoUsage.count({ where: { promotion_id: promo_id, user_id } });
                    if (userUses >= promotion.max_uses_per_user) {
                        return res.status(400).json({ error: `Вы уже использовали этот промокод максимальное количество раз (${promotion.max_uses_per_user})` });
                    }
                }
            }
        }

        const booking = await prisma.booking.create({
            data: {
                user_id,
                service_id,
                master_id,
                branch_id,
                start_time: new Date(start_time),
                end_time: new Date(end_time),
                status,
                payment_id,
                client_name,
                client_phone,
                custom_price
            },
            include: {
                service: true,
                master: true,
                user: true
            }
        });

        // Record Promo Usage
        if (booking && promo_id && user_id) {
            try {
                await prisma.promoUsage.create({
                    data: {
                        promotion_id: promo_id,
                        user_id
                    }
                });
            } catch (err) {
                console.error("Failed to record promo usage:", err);
                // Non-blocking error, but worth noting.
                // If schema unique constraint exists, this will fail on 2nd usage.
            }
        }

        // Notify admins about new booking (async, don't wait)
        const { notifyAdminsNewBooking } = require('../services/reminderService');
        notifyAdminsNewBooking(booking).catch((err: any) => {
            console.error('Failed to notify admins:', err);
        });

        // Send payment invoice if requested and user exists
        // Use custom_price if provided (promo code discount), otherwise use service price
        if (send_invoice && booking.user && booking.service?.price) {
            const { createBookingInvoice } = require('../services/paymentService');
            const invoicePrice = custom_price !== undefined ? custom_price : booking.service.price;
            createBookingInvoice(booking.id, invoicePrice).catch((err: any) => {
                console.error('Failed to send invoice:', err);
            });
        }

        res.json(booking);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log("DELETE /api/bookings/:id hit, id:", id);
    try {
        await prisma.booking.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/bookings error:", error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/bookings/:id - обновление статуса
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log("PATCH /api/bookings/:id hit, id:", id, "status:", status);
    try {
        const booking = await prisma.booking.update({
            where: { id },
            data: { status },
            include: {
                service: true,
                master: true,
                user: true
            }
        });
        res.json(booking);
    } catch (error: any) {
        console.error("PATCH /api/bookings error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/bookings/:id/send-invoice - отправить инвойс на оплату
router.post('/:id/send-invoice', async (req, res) => {
    const { id } = req.params;
    console.log("POST /api/bookings/:id/send-invoice hit, id:", id);

    try {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { user: true, service: true }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status === 'paid') {
            return res.status(400).json({ error: 'Booking already paid' });
        }

        if (!booking.user?.telegram_id) {
            return res.status(400).json({ error: 'User has no telegram_id' });
        }

        const { createBookingInvoice } = require('../services/paymentService');
        const result = await createBookingInvoice(id);

        if (result) {
            res.json({ success: true, message: 'Invoice sent' });
        } else {
            res.status(500).json({ error: 'Failed to send invoice' });
        }
    } catch (error: any) {
        console.error("POST /api/bookings/:id/send-invoice error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
