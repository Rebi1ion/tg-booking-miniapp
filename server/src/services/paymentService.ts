import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../utils/prisma';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN;

interface PaymentData {
    bookingId: string;
    userId: number;
    title: string;
    description: string;
    amount: number; // in kopeks (1 ruble = 100 kopeks)
    currency?: string;
}

interface TelegramApiResponse {
    ok: boolean;
    result?: unknown;
    description?: string;
}

// Create invoice and send to user
export const createPaymentInvoice = async (data: PaymentData): Promise<boolean> => {
    if (!BOT_TOKEN || !PAYMENT_PROVIDER_TOKEN) {
        console.error('Payment: Missing BOT_TOKEN or PAYMENT_PROVIDER_TOKEN');
        return false;
    }

    try {
        const response = await axios.post<TelegramApiResponse>(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {
            chat_id: data.userId,
            title: data.title,
            description: data.description,
            payload: data.bookingId, // Used to identify booking in pre_checkout_query
            provider_token: PAYMENT_PROVIDER_TOKEN,
            currency: data.currency || 'RUB',
            prices: [
                {
                    label: data.title,
                    amount: data.amount // Amount in smallest units (kopeks for RUB)
                }
            ],
            start_parameter: `booking_${data.bookingId}`,
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            is_flexible: false
        });

        console.log('Invoice sent:', response.data);
        return response.data.ok;
    } catch (error: any) {
        console.error('Failed to send invoice:', error.response?.data || error.message);
        return false;
    }
};

// Create invoice from booking
// If customPrice is provided, use it instead of the service price (for promo discounts)
export const createBookingInvoice = async (bookingId: string, customPrice?: number): Promise<boolean> => {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                service: true,
                master: true,
                user: true
            }
        });

        if (!booking || !booking.user) {
            console.error('Booking not found or has no user:', bookingId);
            return false;
        }

        const date = booking.start_time.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const time = booking.start_time.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Use customPrice if provided, otherwise use service price
        const finalPrice = customPrice !== undefined ? customPrice : (booking.service?.price || 0);

        // Build description with discount info if applicable
        let description = `📅 ${date} в ${time}\n👤 Мастер: ${booking.master?.name || 'Не указан'}`;
        if (customPrice !== undefined && booking.service?.price && customPrice < booking.service.price) {
            description += `\n🏷️ Скидка применена!`;
        }

        return await createPaymentInvoice({
            bookingId: booking.id,
            userId: Number(booking.user.telegram_id),
            title: booking.service?.name || 'Услуга',
            description,
            amount: Math.round(finalPrice * 100) // Convert to kopeks
        });
    } catch (error) {
        console.error('Failed to create booking invoice:', error);
        return false;
    }
};

// Initialize payment handlers for the bot
export const initPaymentHandlers = (bot: Telegraf) => {
    // Handle pre-checkout query (required - must respond within 10 seconds)
    bot.on('pre_checkout_query', async (ctx) => {
        try {
            const bookingId = ctx.preCheckoutQuery.invoice_payload;

            // Verify booking exists and is still pending
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId }
            });

            if (!booking) {
                await ctx.answerPreCheckoutQuery(false, 'Бронирование не найдено');
                return;
            }

            if (booking.status === 'paid') {
                await ctx.answerPreCheckoutQuery(false, 'Это бронирование уже оплачено');
                return;
            }

            if (booking.status === 'cancelled') {
                await ctx.answerPreCheckoutQuery(false, 'Это бронирование отменено');
                return;
            }

            // All good - approve the payment
            await ctx.answerPreCheckoutQuery(true);
            console.log('Pre-checkout approved for booking:', bookingId);
        } catch (error) {
            console.error('Pre-checkout error:', error);
            await ctx.answerPreCheckoutQuery(false, 'Ошибка проверки платежа');
        }
    });

    // Handle successful payment
    bot.on('successful_payment', async (ctx) => {
        try {
            const payment = ctx.message.successful_payment;
            const bookingId = payment.invoice_payload;

            console.log('Payment successful:', {
                bookingId,
                amount: payment.total_amount,
                currency: payment.currency,
                telegramPaymentChargeId: payment.telegram_payment_charge_id,
                providerPaymentChargeId: payment.provider_payment_charge_id
            });

            // Update booking status to paid
            const booking = await prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'paid' },
                include: {
                    service: true,
                    master: true,
                    user: true
                }
            });

            const date = booking.start_time.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long'
            });
            const time = booking.start_time.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Send confirmation to user
            await ctx.reply(
                `✅ <b>Оплата прошла успешно!</b>\n\n` +
                `📅 Дата: ${date}\n` +
                `⏰ Время: ${time}\n` +
                `⭐ Услуга: ${booking.service?.name}\n` +
                `👤 Мастер: ${booking.master?.name}\n` +
                `💰 Сумма: ${payment.total_amount / 100} ₽\n\n` +
                `Ждём вас! 🎉`,
                { parse_mode: 'HTML' }
            );

            // Notify admins about successful payment
            const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(id => id);
            for (const adminId of ADMIN_IDS) {
                try {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: adminId,
                        text: `💰 <b>Новая оплата!</b>\n\n` +
                            `📅 ${date} в ${time}\n` +
                            `⭐ ${booking.service?.name}\n` +
                            `👤 Мастер: ${booking.master?.name}\n` +
                            `💳 Сумма: ${payment.total_amount / 100} ₽\n` +
                            `👤 Клиент: ${booking.user?.first_name || 'Не указан'}`,
                        parse_mode: 'HTML'
                    });
                } catch (err) {
                    console.error('Failed to notify admin:', err);
                }
            }

        } catch (error) {
            console.error('Successful payment handling error:', error);
            await ctx.reply('Оплата прошла успешно, но произошла ошибка при обработке. Пожалуйста, свяжитесь с администратором.');
        }
    });

    console.log('Payment handlers initialized');
};

export default {
    createPaymentInvoice,
    createBookingInvoice,
    initPaymentHandlers
};
