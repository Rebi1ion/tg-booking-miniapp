import { Router } from 'express';
import prisma from '../utils/prisma';
import { sendMassNotification } from '../services/botService';

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

// GET /api/promotions/auto-active - get auto-apply promotions for display
router.get('/auto-active', async (req, res) => {
    console.log("GET /api/promotions/auto-active hit");
    try {
        const now = new Date();
        const dayOfWeek = now.getDay() || 7; // 1=Mon, 7=Sun
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const promotions = await prisma.promotion.findMany({
            where: {
                is_active: true,
                is_auto_apply: true,
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
            orderBy: { discount_value: 'desc' }
        });



        // Check usage limits if user_id provided
        const userId = req.query.user_id ? String(req.query.user_id) : null;
        if (userId) {
            const userUsages = await prisma.promoUsage.findMany({
                where: {
                    user_id: userId,
                    promotion_id: { in: promotions.map(p => p.id) }
                }
            });

            // Filter out those with user limits reached
            const filteredPromos = promotions.filter(p => {
                const count = userUsages.filter(u => u.promotion_id === p.id).length;
                if (p.max_uses_per_user > 0 && count >= p.max_uses_per_user) {
                    return false;
                }
                return true;
            });

            res.json(filteredPromos);
        } else {
            res.json(promotions);
        }
    } catch (error: any) {
        console.error("GET /api/promotions/auto-active error:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/promotions - create promotion
router.post('/', async (req, res) => {
    const {
        name, description, discount_type, discount_value, promo_code,
        start_date, end_date, is_active, applies_to_type, applies_to,
        max_uses_per_user, max_total_uses,
        is_auto_apply, valid_days, time_start, time_end,
        notify_clients, notification_message
    } = req.body;
    console.log("POST /api/promotions hit. Body:", JSON.stringify(req.body, null, 2));
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
                applies_to_type: applies_to_type || 'all',
                applies_to,
                max_uses_per_user: parseInt(max_uses_per_user) || 1,
                max_total_uses: max_total_uses ? parseInt(max_total_uses) : null,
                is_auto_apply: is_auto_apply || false,
                valid_days: valid_days || null,
                time_start: time_start || null,
                time_end: time_end || null,
                notify_clients: notify_clients || false,
                notification_message: notification_message || null
            }
        });

        // Send notification if enabled
        if (promotion.notify_clients && promotion.notification_message) {
            let msg = promotion.notification_message
                .replace(/{name}/g, promotion.name)
                .replace(/{discount}/g, promotion.discount_value.toString());

            // Run in background
            console.log(`🔔 Triggering notification logic for ${promotion.name}`);
            sendMassNotification(msg).then(res => {
                console.log(`Promotion notification sent: ${res.sent} sent, ${res.failed} failed`);
            }).catch(err => {
                console.error('Failed to send promotion notification:', err);
            });
        }

        res.json(promotion);
    } catch (error: any) {
        console.error("POST /api/promotions error:", error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/promotions/:id - update promotion
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        name, description, discount_type, discount_value, promo_code,
        start_date, end_date, is_active, applies_to_type, applies_to,
        max_uses_per_user, max_total_uses,
        is_auto_apply, valid_days, time_start, time_end,
        notify_clients, notification_message
    } = req.body;
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
                applies_to_type: applies_to_type || 'all',
                applies_to,
                max_uses_per_user: max_uses_per_user !== undefined ? parseInt(max_uses_per_user) || 1 : undefined,
                max_total_uses: max_total_uses !== undefined ? (max_total_uses ? parseInt(max_total_uses) : null) : undefined,
                is_auto_apply: is_auto_apply !== undefined ? is_auto_apply : undefined,
                valid_days: valid_days !== undefined ? valid_days : undefined,
                time_start: time_start !== undefined ? time_start : undefined,
                time_end: time_end !== undefined ? time_end : undefined,
                notify_clients: notify_clients !== undefined ? notify_clients : undefined,
                notification_message: notification_message !== undefined ? notification_message : undefined
            }
        });

        // Send notification if requested (if notify_clients is explicitly true in the update payload)
        if (notify_clients === true && promotion.notification_message) {
            let msg = promotion.notification_message
                .replace(/{name}/g, promotion.name)
                .replace(/{discount}/g, promotion.discount_value.toString());

            // Run in background
            sendMassNotification(msg).then(res => {
                console.log(`Promotion updated notification sent: ${res.sent} sent, ${res.failed} failed`);
            }).catch(err => {
                console.error('Failed to send promotion notification:', err);
            });
        }

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

        // Check total usage limit
        if (promotion.max_total_uses) {
            const totalUsages = await prisma.promoUsage.count({
                where: { promotion_id: promotion.id }
            });
            if (totalUsages >= promotion.max_total_uses) {
                return res.json({ valid: false, error: 'Промокод использован максимальное количество раз' });
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

// POST /api/promotions/check-date - check for date-based discounts (no promo code required)
router.post('/check-date', async (req, res) => {
    const { booking_date, booking_time, service_id, user_id } = req.body;
    console.log("POST /api/promotions/check-date hit:", { booking_date, booking_time, service_id, user_id });
    try {
        if (!booking_date) {
            return res.json({ found: false });
        }

        // Parse YYYY-MM-DD string or ISO date
        // For YYYY-MM-DD, create UTC midnight date
        let bookingDateObj: Date;
        if (booking_date.length === 10 && booking_date.includes('-')) {
            // YYYY-MM-DD format - parse as UTC
            const [year, month, day] = booking_date.split('-').map(Number);
            bookingDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
            // ISO format - convert to UTC midnight
            bookingDateObj = new Date(booking_date);
            bookingDateObj.setUTCHours(0, 0, 0, 0);
        }

        const bookingDateEnd = new Date(bookingDateObj);
        bookingDateEnd.setUTCHours(23, 59, 59, 999);

        console.log("Checking date-based promotions for booking date:", bookingDateObj.toISOString(), "to", bookingDateEnd.toISOString());

        // Find active promotions without promo_code that apply to this date
        // promo_code can be null OR empty string ""
        const promotions = await prisma.promotion.findMany({
            where: {
                is_active: true,
                OR: [
                    { promo_code: null },
                    { promo_code: '' }
                ],
                start_date: {
                    not: null,
                    lte: bookingDateEnd
                },
                end_date: {
                    not: null,
                    gte: bookingDateObj
                }
            },
            orderBy: { discount_value: 'desc' } // Get best discount first
        });

        console.log("Found date-based promotions:", promotions.length, promotions.map(p => ({ id: p.id, name: p.name, start: p.start_date, end: p.end_date })));

        if (promotions.length === 0) {
            return res.json({ found: false });
        }

        // Check if any applies to the service
        for (const promotion of promotions) {
            console.log(`🔍 Checking promo "${promotion.name}": valid_days=${promotion.valid_days}, time_start=${promotion.time_start}, time_end=${promotion.time_end}`);

            // Check service applicability
            if (promotion.applies_to && promotion.applies_to !== 'all' && service_id) {
                const serviceIds = promotion.applies_to.split(',').map(s => s.trim());
                if (!serviceIds.includes(service_id)) {
                    console.log(`   ❌ Skipped: service not in applies_to`);
                    continue; // Skip, doesn't apply to this service
                }
            }

            // Check day of week validity
            if (promotion.valid_days) {
                // bookingDateObj is UTC midnight of the booking date
                // We need day of week: 0-6 (Sun-Sat)
                // Map to 1-7 (Mon-Sun)
                const day = bookingDateObj.getUTCDay(); // 0 is Sunday
                const dayMapped = day === 0 ? 7 : day;

                const validDays = promotion.valid_days.split(',').map(d => parseInt(d.trim()));
                console.log(`   📅 Day check: booking=${dayMapped}, valid=${validDays.join(',')}`);
                if (!validDays.includes(dayMapped)) {
                    console.log(`   ❌ Skipped: day not valid`);
                    continue;
                }
            }

            // Check time validity
            if (booking_time && promotion.time_start && promotion.time_end) {
                // Determine checking logic: 
                // String comparison works for HH:MM format ("09:00" < "12:00")
                console.log(`   ⏰ Time check: booking=${booking_time}, valid=${promotion.time_start}-${promotion.time_end}`);
                if (booking_time < promotion.time_start || booking_time > promotion.time_end) {
                    console.log(`   ❌ Skipped: time not valid`);
                    continue;
                }
            }

            // Check total usage limit
            if ((promotion as any).max_total_uses) {
                const totalUsages = await prisma.promoUsage.count({
                    where: { promotion_id: promotion.id }
                });
                if (totalUsages >= (promotion as any).max_total_uses) {
                    continue; // Skip, limit reached
                }
            }

            // Check user usage limit
            if (user_id && promotion.max_uses_per_user > 0) {
                const userUsages = await prisma.promoUsage.count({
                    where: { promotion_id: promotion.id, user_id }
                });
                if (userUsages >= promotion.max_uses_per_user) {
                    continue; // Skip, user limit reached
                }
            }

            // Found applicable promotion
            return res.json({
                found: true,
                promotion: {
                    id: promotion.id,
                    name: promotion.name,
                    discount_type: promotion.discount_type,
                    discount_value: promotion.discount_value
                }
            });
        }

        res.json({ found: false });
    } catch (error: any) {
        console.error("POST /api/promotions/check-date error:", error);
        res.status(500).json({ found: false, error: error.message });
    }
});

export default router;
