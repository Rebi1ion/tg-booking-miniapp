import cron from 'node-cron';
import prisma from '../utils/prisma';
import axios from 'axios';
import dotenv from 'dotenv';
import { addHours, addDays, subMinutes, addMinutes, format } from 'date-fns';
import { ru } from 'date-fns/locale';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(id => id);

export const sendTelegramMessage = async (chatId: string | number, text: string) => {
    if (!BOT_TOKEN || BOT_TOKEN === 'ВАШ_БОТ_ТОКЕН') {
        console.warn('Telegram message skipped: No BOT_TOKEN provided');
        return false;
    }

    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: chatId.toString(),
            text,
            parse_mode: 'HTML'
        });
        console.log(`Message sent to ${chatId}`);
        return true;
    } catch (error: any) {
        console.error('Failed to send TG message:', error.response?.data || error.message);
        return false;
    }
};

// Notify admins about new booking
export const notifyAdminsNewBooking = async (booking: any) => {
    if (ADMIN_IDS.length === 0) {
        console.warn('No admin IDs configured for notifications');
        return;
    }

    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);

    const dateStr = format(startTime, 'd MMMM yyyy', { locale: ru });
    const timeStr = `${format(startTime, 'HH:mm')} — ${format(endTime, 'HH:mm')}`;

    const serviceName = booking.service?.name || 'Не указана';
    const servicePrice = booking.service?.price || 0;
    const masterName = booking.master?.name || 'Не указан';
    const clientName = booking.client_name || booking.user?.first_name || 'Гость';
    const clientPhone = booking.client_phone && booking.client_phone !== 'N/A' ? booking.client_phone : 'Не указан';
    const clientUsername = booking.user?.username ? `@${booking.user.username}` : '';
    const status = booking.status === 'paid' ? '✅ Оплачено' : '⏳ Ожидает оплаты';

    const text = `🆕 <b>Новая запись!</b>

📅 <b>Дата:</b> ${dateStr}
⏰ <b>Время:</b> ${timeStr}

⭐ <b>Услуга:</b> ${serviceName}
💰 <b>Цена:</b> ${servicePrice} ₽
👤 <b>Мастер:</b> ${masterName}

👨‍💼 <b>Клиент:</b> ${clientName} ${clientUsername}
📞 <b>Телефон:</b> ${clientPhone}

${status}`;

    for (const adminId of ADMIN_IDS) {
        await sendTelegramMessage(adminId, text);
    }
};

// Reminder logic
const checkReminders = async () => {
    const now = new Date();
    console.log(`[${format(now, 'HH:mm:ss')}] Running reminder check...`);

    // 1. 24-hour Reminders
    const target24h = addDays(now, 1);
    const bookings24h = await prisma.booking.findMany({
        where: {
            start_time: {
                gte: subMinutes(target24h, 15),
                lte: addMinutes(target24h, 15)
            },
            reminder_24h_sent: false,
            status: { not: 'cancelled' },
            user: { isNot: null }
        },
        include: { user: true, service: true, master: true }
    });

    console.log(`Found ${bookings24h.length} bookings for 24h reminder`);

    for (const b of bookings24h) {
        if (b.user?.telegram_id) {
            const dateStr = format(b.start_time, 'd MMMM', { locale: ru });
            const timeStr = format(b.start_time, 'HH:mm');
            const text = `🔔 <b>Напоминание о записи!</b>

До вашей встречи остался 1 день.

📅 Дата: ${dateStr}
⏰ Время: ${timeStr}
👤 Мастер: ${b.master?.name}
⭐ Услуга: ${b.service?.name}

Ждём вас!`;
            const sent = await sendTelegramMessage(Number(b.user.telegram_id), text);
            if (sent) {
                await prisma.booking.update({ where: { id: b.id }, data: { reminder_24h_sent: true } });
            }
        }
    }

    // 2. 2-hour Reminders (changed from 1 hour)
    const target2h = addHours(now, 2);
    const bookings2h = await prisma.booking.findMany({
        where: {
            start_time: {
                gte: subMinutes(target2h, 15),
                lte: addMinutes(target2h, 15)
            },
            reminder_1h_sent: false, // Using same field, renamed logically
            status: { not: 'cancelled' },
            user: { isNot: null }
        },
        include: { user: true, service: true, master: true }
    });

    console.log(`Found ${bookings2h.length} bookings for 2h reminder`);

    for (const b of bookings2h) {
        if (b.user?.telegram_id) {
            const timeStr = format(b.start_time, 'HH:mm');
            const text = `🔔 <b>Вы записаны через 2 часа!</b>

Ждем вас совсем скоро!

⏰ Время: ${timeStr}
👤 Мастер: ${b.master?.name}
⭐ Услуга: ${b.service?.name}

До встречи!`;
            const sent = await sendTelegramMessage(Number(b.user.telegram_id), text);
            if (sent) {
                await prisma.booking.update({ where: { id: b.id }, data: { reminder_1h_sent: true } });
            }
        }
    }
};

// Test function - send test notification to specific user
export const sendTestReminder = async (userId: string | number, type: '24h' | '2h' | 'admin') => {
    const mockBooking = {
        start_time: new Date(),
        end_time: addHours(new Date(), 1),
        service: { name: 'Тестовая услуга', price: 1000 },
        master: { name: 'Тестовый мастер' },
        client_name: 'Тестовый клиент',
        client_phone: '+7 999 123-45-67',
        user: { first_name: 'Тестовый клиент', username: 'test_user' },
        status: 'paid'
    };

    if (type === '24h') {
        const dateStr = format(mockBooking.start_time, 'd MMMM', { locale: ru });
        const timeStr = format(mockBooking.start_time, 'HH:mm');
        const text = `🔔 <b>[ТЕСТ] Напоминание о записи!</b>

До вашей встречи остался 1 день.

📅 Дата: ${dateStr}
⏰ Время: ${timeStr}
👤 Мастер: ${mockBooking.master.name}
⭐ Услуга: ${mockBooking.service.name}

Ждём вас!`;
        return await sendTelegramMessage(userId, text);
    } else if (type === '2h') {
        const timeStr = format(mockBooking.start_time, 'HH:mm');
        const text = `🔔 <b>[ТЕСТ] Вы записаны через 2 часа!</b>

Ждем вас совсем скоро!

⏰ Время: ${timeStr}
👤 Мастер: ${mockBooking.master.name}
⭐ Услуга: ${mockBooking.service.name}

До встречи!`;
        return await sendTelegramMessage(userId, text);
    } else if (type === 'admin') {
        await notifyAdminsNewBooking(mockBooking);
        return true;
    }

    return false;
};

// Run every 15 minutes
cron.schedule('*/15 * * * *', () => {
    checkReminders();
});

// Check birthdays daily at 9:00 AM
cron.schedule('0 9 * * *', async () => {
    console.log('Running birthday check...');
    await checkBirthdays();
});

// Birthday check function
const checkBirthdays = async () => {
    try {
        const today = new Date();
        const month = today.getMonth() + 1; // 1-12
        const day = today.getDate();

        // Get settings
        let settings = await prisma.settings.findUnique({ where: { id: 'main' } });
        if (!settings) {
            settings = { id: 'main', birthday_discount: 10, birthday_message: '🎂 С днём рождения! Дарим вам скидку {discount}%!', birthday_promo_days: 7, require_prepayment: false };
        }

        // Find users with birthday today
        const users = await prisma.user.findMany({
            where: {
                birthday: { not: null }
            }
        });

        const birthdayUsers = users.filter(u => {
            if (!u.birthday) return false;
            const bd = new Date(u.birthday);
            return bd.getMonth() + 1 === month && bd.getDate() === day;
        });

        console.log(`Found ${birthdayUsers.length} users with birthday today`);

        for (const user of birthdayUsers) {
            if (user.telegram_id) {
                // Create birthday promo code
                const promoCode = `BDAY${user.telegram_id.toString().slice(-4)}${day}${month}`;

                // Check if promo already exists
                const existingPromo = await prisma.promotion.findFirst({
                    where: { promo_code: promoCode }
                });

                if (!existingPromo) {
                    // Create birthday promo
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + settings.birthday_promo_days);

                    await prisma.promotion.create({
                        data: {
                            name: `День рождения ${user.first_name || 'пользователя'}`,
                            description: 'Персональная скидка на день рождения',
                            discount_type: 'percent',
                            discount_value: settings.birthday_discount,
                            promo_code: promoCode,
                            start_date: new Date(),
                            end_date: endDate,
                            is_active: true,
                            applies_to: 'all'
                        }
                    });
                }

                // Send congratulation message
                const message = settings.birthday_message
                    .replace('{discount}', settings.birthday_discount.toString())
                    .replace('{promo_code}', promoCode)
                    .replace('{days}', settings.birthday_promo_days.toString());

                const text = `${message}\n\n🎁 Ваш персональный промокод: <b>${promoCode}</b>\n⏳ Действует ${settings.birthday_promo_days} дней`;

                await sendTelegramMessage(Number(user.telegram_id), text);
                console.log(`Birthday message sent to ${user.first_name} (${user.telegram_id})`);
            }
        }
    } catch (error) {
        console.error('Birthday check error:', error);
    }
};

// Initial run on startup
console.log('Reminder service initialized (24h and 2h reminders)');
console.log(`Configured admin IDs for notifications: ${ADMIN_IDS.join(', ') || 'None'}`);

