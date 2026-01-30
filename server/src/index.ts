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
import importRoutes from './routes/import';
import uploadRoutes from './routes/upload';
import path from 'path';
import './services/reminderService';
import './services/botService';
import './services/bookingCleanupService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
});

app.use(limiter);

app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/import', importRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
