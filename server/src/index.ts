// Polyfill для сериализации BigInt в JSON
// Необходим для telegram_id который хранится как BigInt
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import servicesRoutes from './routes/services';
import mastersRoutes from './routes/masters';
import bookingsRoutes from './routes/bookings';
import usersRoutes from './routes/users';
import notificationsRoutes from './routes/notifications';
import reportsRoutes from './routes/reports';
import promotionsRoutes from './routes/promotions';
import settingsRoutes from './routes/settings';
import branchesRoutes from './routes/branches';
import './services/reminderService'; // Root import for cron job
import './services/botService'; // Telegram bot
import './services/bookingCleanupService'; // Auto-cancel unpaid bookings

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting - protect from DDoS
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'), // limit per IP
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);
app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// Routes
app.use('/api/services', servicesRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/branches', branchesRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
