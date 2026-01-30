import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../utils/prisma';
import { sendTelegramMessage } from './reminderService';
import { initPaymentHandlers } from './paymentService';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINIAPP_URL = process.env.MINIAPP_URL || 'https://your-app.com';
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(id => id);
const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';

if (!BOT_TOKEN || BOT_TOKEN === 'ВАШ_БОТ_ТОКЕН') {
    console.warn('Telegram Bot: No valid BOT_TOKEN provided, bot will not start');
} else {
    const bot = new Telegraf(BOT_TOKEN);

    // Check if user is admin
    const isAdmin = (userId: number): boolean => {
        return ADMIN_IDS.includes(userId.toString());
    };

    // Check if user is a master (async DB check)
    const checkIsMaster = async (userId: number): Promise<string | null> => {
        try {
            const master = await prisma.master.findUnique({
                where: { telegram_id: BigInt(userId) }
            });
            return master ? master.id : null;
        } catch (error) {
            console.error('Failed to check master status:', error);
            return null;
        }
    };

    // Set Menu Button for user (WebApp button in menu)
    const setMenuButton = async (chatId: number, role: 'admin' | 'master' | 'user') => {
        try {
            let buttonText = 'Записаться';
            if (role === 'admin') buttonText = 'Админ панель';
            else if (role === 'master') buttonText = 'Панель мастера';

            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
                chat_id: chatId,
                menu_button: {
                    type: 'web_app',
                    text: buttonText,
                    web_app: { url: MINIAPP_URL }
                }
            });
            console.log(`Menu button set for ${chatId}: "${buttonText}" (role: ${role})`);
        } catch (error) {
            console.error('Failed to set menu button:', error);
        }
    };

    // Reply keyboard for regular users (without WebApp button - using Menu Button instead)
    const userKeyboard = Markup.keyboard([
        ['📋 Мои записи', '❓ Помощь']
    ]).resize();

    // Reply keyboard for masters (empty as per request)
    const masterKeyboard = Markup.keyboard([]).resize();

    // Reply keyboard for admins (without WebApp button - using Menu Button instead)
    const adminKeyboard = Markup.keyboard([
        ['📊 Статистика', '📢 Рассылка'],
        ['❓ Помощь']
    ]).resize();

    // /start command - Welcome message with keyboards
    bot.command('start', async (ctx) => {
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || 'Гость';
        const isUserAdmin = isAdmin(userId);
        const masterId = await checkIsMaster(userId);
        const isMaster = masterId !== null;

        // Determine role
        let role: 'admin' | 'master' | 'user' = 'user';
        if (isUserAdmin) role = 'admin';
        else if (isMaster) role = 'master';

        // Set dynamic Menu Button based on user role
        await setMenuButton(userId, role);

        // Fetch settings for welcome message
        let welcomeMessage = '';
        try {
            const settings = await prisma.settings.findUnique({ where: { id: 'main' } });
            if (settings?.welcome_message) {
                welcomeMessage = settings.welcome_message.replace(/{name}/g, userName);
            }
        } catch (err) {
            console.error('Failed to fetch welcome message:', err);
        }

        if (isUserAdmin) {
            await ctx.reply(
                `👑 <b>Добро пожаловать, ${userName}!</b>\n\n` +
                `Вы вошли как <b>администратор</b>.\n\n` +
                `📱 Нажмите кнопку <b>меню</b> (слева от поля ввода) для открытия панели управления.\n\n` +
                `<b>Доступные команды:</b>\n` +
                `📊 Статистика — данные о бронированиях\n` +
                `📢 Рассылка — отправить сообщение всем\n` +
                `❓ Помощь — справка по командам`,
                { parse_mode: 'HTML', ...adminKeyboard }
            );
        } else if (isMaster) {
            await ctx.reply(
                `💇 <b>Добро пожаловать, ${userName}!</b>\n\n` +
                `Вы вошли как <b>мастер</b>.\n\n` +
                `📱 Нажмите кнопку <b>меню</b> "Панель мастера" (слева от поля ввода) для просмотра ваших записей.`,
                { parse_mode: 'HTML', ...masterKeyboard }
            );
        } else {
            // Use custom welcome message from settings or default
            const messageText = welcomeMessage ||
                `👋 <b>Добро пожаловать, ${userName}!</b>\n\n` +
                `🎉 Мы рады видеть вас в нашем сервисе бронирования!\n\n` +
                `📱 Нажмите кнопку <b>меню</b> (слева от поля ввода) чтобы записаться.\n` +
                `📋 Нажмите "Мои записи" чтобы посмотреть ваши бронирования.\n\n` +
                `✨ Быстро, удобно, в любое время!`;

            await ctx.reply(messageText, { parse_mode: 'HTML', ...userKeyboard });
        }

        // Save/update user in database
        try {
            await prisma.user.upsert({
                where: { telegram_id: BigInt(userId) },
                update: { first_name: ctx.from.first_name, username: ctx.from.username },
                create: { telegram_id: BigInt(userId), first_name: ctx.from.first_name, username: ctx.from.username }
            });
        } catch (error) {
            console.error('Failed to save user:', error);
        }
    });

    // /myid command - Show user's Telegram ID (for master linking)
    bot.command('myid', async (ctx) => {
        const userId = ctx.from.id;
        await ctx.reply(
            `🆔 <b>Ваш Telegram ID:</b>\n\n<code>${userId}</code>\n\n` +
            `💡 Отправьте этот ID администратору, чтобы он привязал вас как мастера.`,
            { parse_mode: 'HTML' }
        );
    });

    // Handle "Мои записи" button
    bot.hears('📋 Мои записи', async (ctx) => {
        try {
            const user = await prisma.user.findUnique({
                where: { telegram_id: BigInt(ctx.from.id) }
            });

            if (!user) {
                await ctx.reply('У вас пока нет записей.');
                return;
            }

            const bookings = await prisma.booking.findMany({
                where: { user_id: user.id, start_time: { gte: new Date() } },
                include: { service: true, master: true },
                orderBy: { start_time: 'asc' },
                take: 5
            });

            if (bookings.length === 0) {
                await ctx.reply(
                    '📋 <b>Ваши записи</b>\n\n' +
                    'У вас нет предстоящих записей.\n\n' +
                    'Нажмите кнопку меню чтобы записаться!',
                    { parse_mode: 'HTML' }
                );
                return;
            }

            let text = '📋 <b>Ваши предстоящие записи:</b>\n\n';
            for (const b of bookings) {
                const date = b.start_time.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: TIMEZONE });
                const time = b.start_time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE });
                const status = b.status === 'paid' ? '✅' : b.status === 'cancelled' ? '❌' : '⏳';
                text += `${status} <b>${date}</b> в ${time}\n   ⭐ ${b.service?.name}\n   👤 ${b.master?.name}\n\n`;
            }
            await ctx.reply(text, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Error fetching bookings:', error);
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });

    // Handle "Помощь" button
    bot.hears('❓ Помощь', async (ctx) => {
        if (isAdmin(ctx.from.id)) {
            await ctx.reply(
                `📚 <b>Справка для администратора</b>\n\n` +
                `<b>Кнопка меню:</b> Открывает панель управления\n\n` +
                `<b>Кнопки:</b>\n` +
                `📊 Статистика — данные о бронированиях\n` +
                `📢 Рассылка — отправить сообщение/фото/видео всем\n\n` +
                `<b>Рассылка с медиа:</b>\n` +
                `Нажмите "📢 Рассылка" и отправьте текст, фото или видео.`,
                { parse_mode: 'HTML' }
            );
        } else {
            await ctx.reply(
                `📚 <b>Справка</b>\n\n` +
                `<b>Как записаться:</b>\n` +
                `1. Нажмите кнопку меню (слева от поля ввода)\n` +
                `2. Выберите услугу и мастера\n` +
                `3. Выберите дату и время\n` +
                `4. Подтвердите запись\n\n` +
                `<b>Напоминания:</b>\n` +
                `🔔 За 24 часа до записи\n` +
                `🔔 За 2 часа до записи`,
                { parse_mode: 'HTML' }
            );
        }
    });

    // Handle "Статистика" button (admin)
    bot.hears('📊 Статистика', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('⛔ У вас нет прав для этой команды.');
            return;
        }

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [totalUsers, totalBookings, todayBookings, pendingBookings] = await Promise.all([
                prisma.user.count(),
                prisma.booking.count(),
                prisma.booking.count({ where: { start_time: { gte: today, lt: tomorrow } } }),
                prisma.booking.count({ where: { status: 'pending' } })
            ]);

            await ctx.reply(
                `📊 <b>Статистика</b>\n\n` +
                `👥 Всего пользователей: <b>${totalUsers}</b>\n` +
                `📅 Всего бронирований: <b>${totalBookings}</b>\n` +
                `📆 Записей сегодня: <b>${todayBookings}</b>\n` +
                `⏳ Ожидают оплаты: <b>${pendingBookings}</b>`,
                { parse_mode: 'HTML' }
            );
        } catch (error) {
            console.error('Stats error:', error);
            await ctx.reply('❌ Ошибка при получении статистики.');
        }
    });

    // Broadcast state storage
    const broadcastState = new Map<number, boolean>();

    // Handle "Рассылка" button (admin)
    bot.hears('📢 Рассылка', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('⛔ У вас нет прав для этой команды.');
            return;
        }

        broadcastState.set(ctx.from.id, true);

        await ctx.reply(
            `📢 <b>Режим рассылки</b>\n\n` +
            `Отправьте следующим сообщением:\n` +
            `• Текст\n` +
            `• Фото (можно с подписью)\n` +
            `• Видео (можно с подписью)\n` +
            `• Документ\n\n` +
            `Сообщение будет отправлено <b>всем пользователям</b> бота.\n\n` +
            `<i>Нажмите "❌ Отмена" чтобы отменить.</i>`,
            {
                parse_mode: 'HTML',
                ...Markup.keyboard([['❌ Отмена']]).resize()
            }
        );
    });

    // Cancel broadcast
    bot.hears('❌ Отмена', async (ctx) => {
        broadcastState.delete(ctx.from.id);
        const keyboard = isAdmin(ctx.from.id) ? adminKeyboard : userKeyboard;
        await ctx.reply('Рассылка отменена.', keyboard);
    });

    bot.command('cancel', async (ctx) => {
        broadcastState.delete(ctx.from.id);
        const keyboard = isAdmin(ctx.from.id) ? adminKeyboard : userKeyboard;
        await ctx.reply('Действие отменено.', keyboard);
    });

    // Helper function to send media to a user
    const sendMediaToUser = async (chatId: number, type: string, fileId: string, caption?: string): Promise<boolean> => {
        try {
            const url = `https://api.telegram.org/bot${BOT_TOKEN}/`;
            const captionText = caption ? `📢 <b>Уведомление</b>\n\n${caption}` : '📢 <b>Уведомление</b>';

            let endpoint = '';
            let data: any = { chat_id: chatId, parse_mode: 'HTML' };

            switch (type) {
                case 'photo':
                    endpoint = 'sendPhoto';
                    data.photo = fileId;
                    data.caption = captionText;
                    break;
                case 'video':
                    endpoint = 'sendVideo';
                    data.video = fileId;
                    data.caption = captionText;
                    break;
                case 'document':
                    endpoint = 'sendDocument';
                    data.document = fileId;
                    data.caption = captionText;
                    break;
                case 'animation':
                    endpoint = 'sendAnimation';
                    data.animation = fileId;
                    data.caption = captionText;
                    break;
                case 'voice':
                    endpoint = 'sendVoice';
                    data.voice = fileId;
                    data.caption = captionText;
                    break;
                case 'video_note':
                    endpoint = 'sendVideoNote';
                    data.video_note = fileId;
                    break;
                case 'sticker':
                    endpoint = 'sendSticker';
                    data.sticker = fileId;
                    break;
                default:
                    return false;
            }

            await axios.post(url + endpoint, data);
            return true;
        } catch (error) {
            console.error('Failed to send media:', error);
            return false;
        }
    };

    // Broadcast function for media
    const executeBroadcast = async (ctx: any, type: 'text' | 'photo' | 'video' | 'document' | 'animation' | 'voice' | 'video_note' | 'sticker', content: string, caption?: string) => {
        await ctx.reply('📤 Начинаю рассылку...');

        try {
            const users = await prisma.user.findMany({ select: { telegram_id: true } });

            let sent = 0;
            let failed = 0;

            for (const user of users) {
                let success = false;
                const userId = Number(user.telegram_id);

                if (type === 'text') {
                    success = await sendTelegramMessage(userId, `📢 <b>Уведомление</b>\n\n${content}`);
                } else {
                    success = await sendMediaToUser(userId, type, content, caption);
                }

                if (success) sent++;
                else failed++;

                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const keyboard = isAdmin(ctx.from.id) ? adminKeyboard : userKeyboard;
            await ctx.reply(
                `✅ <b>Рассылка завершена!</b>\n\n` +
                `📨 Отправлено: ${sent}\n` +
                `❌ Ошибок: ${failed}\n` +
                `👥 Всего пользователей: ${users.length}`,
                { parse_mode: 'HTML', ...keyboard }
            );
        } catch (error) {
            console.error('Broadcast error:', error);
            const keyboard = isAdmin(ctx.from.id) ? adminKeyboard : userKeyboard;
            await ctx.reply('❌ Произошла ошибка при рассылке.', keyboard);
        }
    };

    // Handle text messages for broadcast
    bot.on('text', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            await executeBroadcast(ctx, 'text', ctx.message.text);
        }
    });

    // Handle photo messages for broadcast
    bot.on('photo', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const caption = ctx.message.caption || '';
            await executeBroadcast(ctx, 'photo', photo.file_id, caption);
        }
    });

    // Handle video messages for broadcast
    bot.on('video', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            const caption = ctx.message.caption || '';
            await executeBroadcast(ctx, 'video', ctx.message.video.file_id, caption);
        }
    });

    // Handle document messages for broadcast
    bot.on('document', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            const caption = ctx.message.caption || '';
            await executeBroadcast(ctx, 'document', ctx.message.document.file_id, caption);
        }
    });

    // Handle animation (GIF) messages for broadcast
    bot.on('animation', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            const caption = ctx.message.caption || '';
            await executeBroadcast(ctx, 'animation', ctx.message.animation.file_id, caption);
        }
    });

    // Handle voice messages for broadcast
    bot.on('voice', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            await executeBroadcast(ctx, 'voice', ctx.message.voice.file_id);
        }
    });

    // Handle video notes for broadcast
    bot.on('video_note', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            await executeBroadcast(ctx, 'video_note', ctx.message.video_note.file_id);
        }
    });

    // Handle stickers for broadcast
    bot.on('sticker', async (ctx) => {
        if (broadcastState.get(ctx.from.id) && isAdmin(ctx.from.id)) {
            broadcastState.delete(ctx.from.id);
            await executeBroadcast(ctx, 'sticker', ctx.message.sticker.file_id);
        }
    });

    // /broadcast command (admin only) - text only
    bot.command('broadcast', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('⛔ У вас нет прав для выполнения этой команды.');
            return;
        }

        const messageText = ctx.message.text.replace('/broadcast', '').trim();

        if (!messageText) {
            await ctx.reply(
                `📢 <b>Рассылка сообщений</b>\n\n` +
                `Для текста: <code>/broadcast Ваше сообщение</code>\n\n` +
                `Для медиа: нажмите кнопку "📢 Рассылка"`,
                { parse_mode: 'HTML' }
            );
            return;
        }

        await executeBroadcast(ctx, 'text', messageText);
    });

    // /stats command
    bot.command('stats', async (ctx) => {
        if (!isAdmin(ctx.from.id)) {
            await ctx.reply('⛔ У вас нет прав для этой команды.');
            return;
        }
    });

    // /help command
    bot.command('help', async (ctx) => {
    });

    // Initialize payment handlers
    initPaymentHandlers(bot);

    // Launch bot
    bot.launch()
        .then(() => {
            console.log('🤖 Telegram bot started successfully!');
            console.log(`   Admin IDs: ${ADMIN_IDS.join(', ') || 'None configured'}`);
            console.log(`   MiniApp URL: ${MINIAPP_URL}`);
        })
        .catch((error) => {
            console.error('Failed to start Telegram bot:', error);
        });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

export const sendMassNotification = async (message: string): Promise<{ success: boolean; sent: number; failed: number; total: number }> => {
    try {
        const users = await prisma.user.findMany({ select: { telegram_id: true } });
        let sent = 0;
        let failed = 0;

        for (const user of users) {
            const userId = Number(user.telegram_id);
            const success = await sendTelegramMessage(userId, message);
            if (success) sent++;
            else failed++;

            // Small delay to avoid hitting rate limits too hard
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        return { success: true, sent, failed, total: users.length };
    } catch (error) {
        console.error('Mass notification error:', error);
        return { success: false, sent: 0, failed: 0, total: 0 };
    }
};

