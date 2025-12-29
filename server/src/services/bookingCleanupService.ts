import cron from 'node-cron';
import prisma from '../utils/prisma';
import dotenv from 'dotenv';
import { sendTelegramMessage } from './reminderService';

dotenv.config();

const AUTO_CANCEL_MINUTES = parseInt(process.env.AUTO_CANCEL_UNPAID_MINUTES || '30');

// Run every 5 minutes to check for expired bookings
cron.schedule('*/5 * * * *', async () => {
    if (AUTO_CANCEL_MINUTES <= 0) {
        return; // Feature disabled
    }

    console.log('[BookingCleanup] Checking for expired unpaid bookings...');

    try {
        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - AUTO_CANCEL_MINUTES);

        // Find all pending bookings older than cutoff time
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: 'pending',
                created_at: { lt: cutoffTime }
            },
            include: {
                user: true,
                service: true
            }
        });

        if (expiredBookings.length === 0) {
            return;
        }

        console.log(`[BookingCleanup] Found ${expiredBookings.length} expired bookings to cancel`);

        // Cancel each booking and notify user
        for (const booking of expiredBookings) {
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: 'cancelled' }
            });

            // Notify user if they have telegram_id
            if (booking.user?.telegram_id) {
                const serviceName = booking.service?.name || 'Услуга';
                await sendTelegramMessage(
                    Number(booking.user.telegram_id),
                    `⏰ <b>Запись отменена</b>\n\n` +
                    `Ваша запись на "${serviceName}" была автоматически отменена, ` +
                    `так как оплата не была получена в течение ${AUTO_CANCEL_MINUTES} минут.\n\n` +
                    `Вы можете создать новую запись в любое время.`
                );
            }

            console.log(`[BookingCleanup] Cancelled booking ${booking.id}`);
        }

        console.log(`[BookingCleanup] Cancelled ${expiredBookings.length} expired bookings`);
    } catch (error) {
        console.error('[BookingCleanup] Error:', error);
    }
});

console.log(`[BookingCleanup] Service started. Auto-cancel after ${AUTO_CANCEL_MINUTES} minutes (0 = disabled)`);

export { };
