import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../utils/prisma';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN;
const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';

// YooMoney error codes to Russian messages
const YOOMONEY_ERROR_MESSAGES: Record<string, string> = {
    '3d_secure_failed': '❌ Ошибка 3D-Secure. Попробуйте другую карту.',
    'call_issuer': '❌ Свяжитесь с банком для разрешения операции.',
    'card_expired': '❌ Срок действия карты истёк.',
    'fraud_suspected': '❌ Платёж отклонён системой безопасности.',
    'general_decline': '❌ Платёж отклонён. Попробуйте другую карту.',
    'insufficient_funds': '❌ Недостаточно средств на карте.',
    'invalid_card_number': '❌ Неверный номер карты.',
    'invalid_csc': '❌ Неверный CVV/CVC код.',
    'issuer_unavailable': '❌ Банк недоступен. Попробуйте позже.',
    'payment_method_limit_exceeded': '❌ Превышен лимит по карте.',
    'payment_method_restricted': '❌ Карта заблокирована для онлайн-платежей.',
    'country_forbidden': '❌ Платежи из вашей страны не поддерживаются.'
};

// Get user-friendly error message
const getPaymentErrorMessage = (errorCode?: string): string => {
    if (!errorCode) return 'Ошибка платежа. Попробуйте ещё раз.';
    return YOOMONEY_ERROR_MESSAGES[errorCode] || `Ошибка платежа: ${errorCode}`;
};

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
            year: 'numeric',
            timeZone: TIMEZONE
        });
        const time = booking.start_time.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: TIMEZONE
        });

        // Use customPrice if provided, otherwise use service price
        const finalPrice = customPrice !== undefined ? customPrice : (booking.service?.price || 0);

        // Build description with discount info if applicable
        let description = `📅 ${date} в ${time}\n👤 Мастер: ${booking.master?.name || 'Не указан'}`;
        if (customPrice !== undefined && booking.service?.price && customPrice < booking.service.price) {
            description += `\n🏷️ Скидка применена!`;
        }
        description += `\n\n\n⚠️ При ошибке оплаты —\nзапросите новый счёт в мини-аппе`;

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

// Prepayment data stored in payload
interface PrepaymentData {
    type: 'prepayment';
    user_id: string;
    service_id: string;
    master_id: string;
    start_time: string;
    end_time: string;
    client_name: string;
    custom_price?: number;
}

// Create prepayment invoice (booking will be created after successful payment)
export const createPrepaymentInvoice = async (
    telegramUserId: number,
    bookingData: {
        user_id: string;
        service_id: string;
        master_id: string;
        branch_id?: string;
        start_time: string;
        end_time: string;
        client_name: string;
        custom_price?: number;
    },
    serviceInfo: {
        name: string;
        price: number;
    },
    masterName: string
): Promise<boolean> => {
    if (!BOT_TOKEN || !PAYMENT_PROVIDER_TOKEN) {
        console.error('Payment: Missing BOT_TOKEN or PAYMENT_PROVIDER_TOKEN');
        return false;
    }

    try {
        const startDate = new Date(bookingData.start_time);
        const date = startDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: TIMEZONE
        });
        const time = startDate.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: TIMEZONE
        });

        const finalPrice = bookingData.custom_price !== undefined ? bookingData.custom_price : serviceInfo.price;
        let description = `📅 ${date} в ${time}\n👤 Мастер: ${masterName}`;
        if (bookingData.custom_price !== undefined && bookingData.custom_price < serviceInfo.price) {
            description += `\n🏷️ Скидка применена!`;
        }
        description += `\n\n\n⚠️ При ошибке оплаты —\nзапросите новый счёт в мини-аппе`;

        // First create booking with special status "pending_prepayment"
        // This will be updated to "paid" after successful payment
        const booking = await prisma.booking.create({
            data: {
                user_id: bookingData.user_id,
                service_id: bookingData.service_id,
                master_id: bookingData.master_id,
                branch_id: bookingData.branch_id,
                start_time: new Date(bookingData.start_time),
                end_time: new Date(bookingData.end_time),
                status: 'pending_prepayment', // Special status - not visible to admins until paid
                client_name: bookingData.client_name,
                client_phone: 'N/A'
            }
        });

        // Use short payload format: "prepay:BOOKING_ID"
        const payload = `prepay:${booking.id}`;

        const response = await axios.post<TelegramApiResponse>(`https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`, {
            chat_id: telegramUserId,
            title: serviceInfo.name,
            description,
            payload, // Short payload with booking ID
            provider_token: PAYMENT_PROVIDER_TOKEN,
            currency: 'RUB',
            prices: [
                {
                    label: serviceInfo.name,
                    amount: Math.round(finalPrice * 100)
                }
            ],
            start_parameter: `prepayment_${booking.id.slice(0, 8)}`,
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            is_flexible: false
        });

        console.log('Prepayment invoice sent:', response.data);

        if (!response.data.ok) {
            // If invoice failed, delete the pending booking
            await prisma.booking.delete({ where: { id: booking.id } });
            return false;
        }

        return true;
    } catch (error: any) {
        console.error('Failed to send prepayment invoice:', error.response?.data || error.message);
        return false;
    }
};

// Initialize payment handlers for the bot
export const initPaymentHandlers = (bot: Telegraf) => {
    // Handle pre-checkout query (required - must respond within 10 seconds)
    bot.on('pre_checkout_query', async (ctx) => {
        try {
            const payload = ctx.preCheckoutQuery.invoice_payload;

            // Check if this is a prepayment (prepay:BOOKING_ID format)
            if (payload.startsWith('prepay:')) {
                const bookingId = payload.replace('prepay:', '');
                console.log('Pre-checkout query for prepayment:', bookingId);

                const booking = await prisma.booking.findUnique({
                    where: { id: bookingId }
                });

                if (!booking) {
                    console.log('Pre-checkout: booking not found');
                    await ctx.answerPreCheckoutQuery(false, 'Бронирование не найдено');
                    return;
                }

                console.log('Pre-checkout: booking status =', booking.status);

                if (booking.status === 'paid') {
                    await ctx.answerPreCheckoutQuery(false, 'Уже оплачено');
                    return;
                }

                if (booking.status === 'cancelled') {
                    await ctx.answerPreCheckoutQuery(false, 'Бронирование отменено');
                    return;
                }

                // Allow payment for pending or pending_prepayment statuses
                await ctx.answerPreCheckoutQuery(true);
                console.log('Pre-checkout approved for prepayment:', bookingId);
                return;
            }

            // Regular booking payment - verify booking exists
            const booking = await prisma.booking.findUnique({
                where: { id: payload }
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

            await ctx.answerPreCheckoutQuery(true);
            console.log('Pre-checkout approved for booking:', payload);
        } catch (error) {
            console.error('Pre-checkout error:', error);
            await ctx.answerPreCheckoutQuery(false, 'Ошибка проверки платежа');
        }
    });

    // Handle successful payment
    bot.on('successful_payment', async (ctx) => {
        try {
            const payment = ctx.message.successful_payment;
            const payload = payment.invoice_payload;

            console.log('Payment successful:', {
                payload,
                amount: payment.total_amount,
                currency: payment.currency,
                telegramPaymentChargeId: payment.telegram_payment_charge_id,
                providerPaymentChargeId: payment.provider_payment_charge_id
            });

            let booking;
            let bookingId = payload;

            // Check if this is a prepayment (prepay:BOOKING_ID format)
            if (payload.startsWith('prepay:')) {
                bookingId = payload.replace('prepay:', '');
                // Update existing pending_prepayment booking to paid
                booking = await prisma.booking.update({
                    where: { id: bookingId },
                    data: { status: 'paid' },
                    include: {
                        service: true,
                        master: true,
                        user: true,
                        branch: true
                    }
                });
                console.log('Prepayment booking confirmed:', booking.id);
            } else {
                // Regular booking payment - update existing booking
                booking = await prisma.booking.update({
                    where: { id: payload },
                    data: { status: 'paid' },
                    include: {
                        service: true,
                        master: true,
                        user: true,
                        branch: true
                    }
                });
            }

            if (!booking) {
                console.error('No booking found or created');
                return;
            }

            const date = booking.start_time.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                timeZone: TIMEZONE
            });
            const time = booking.start_time.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: TIMEZONE
            });

            // Send confirmation to user
            await ctx.reply(
                `✅ <b>Оплата прошла успешно!</b>\n\n` +
                `📅 Дата: ${date}\n` +
                `⏰ Время: ${time}\n` +
                `⭐ Услуга: ${booking.service?.name}\n` +
                `👤 Мастер: ${booking.master?.name}\n` +
                (booking.branch ? `🏢 Филиал: ${booking.branch.name}\n` : '') +
                `💰 Сумма: ${payment.total_amount / 100} ₽\n\n` +
                `Ждём вас! 🎉`,
                { parse_mode: 'HTML' }
            );

            // Notify admins about successful payment
            const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(id => id);

            const paidAmount = payment.total_amount / 100;
            const originalPrice = booking.service?.price || 0;
            let priceText = `${paidAmount} ₽`;

            if (originalPrice > paidAmount) {
                priceText = `${paidAmount} ₽ (до скидки: ${originalPrice} ₽)`;
            }

            for (const adminId of ADMIN_IDS) {
                try {
                    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        chat_id: adminId,
                        text: `💰 <b>Новая оплата!</b>\n\n` +
                            `📅 ${date} в ${time}\n` +
                            `⭐ ${booking.service?.name}\n` +
                            `👤 Мастер: ${booking.master?.name}\n` +
                            `💳 Сумма: ${priceText}\n` +
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
