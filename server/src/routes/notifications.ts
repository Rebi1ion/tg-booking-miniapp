import { Router } from 'express';
import { sendTestReminder, notifyAdminsNewBooking } from '../services/reminderService';

const router = Router();

// Test endpoint for notifications
// Usage: POST /api/notifications/test
// Body: { "userId": 123456789, "type": "24h" | "2h" | "admin" }
router.post('/test', async (req, res) => {
    const { userId, type } = req.body;

    if (!userId && type !== 'admin') {
        return res.status(400).json({ error: 'userId is required for non-admin notifications' });
    }

    if (!['24h', '2h', 'admin'].includes(type)) {
        return res.status(400).json({ error: 'type must be "24h", "2h", or "admin"' });
    }

    try {
        const result = await sendTestReminder(userId, type);
        res.json({
            success: true,
            message: `Test ${type} notification sent`,
            result
        });
    } catch (error: any) {
        console.error('Test notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
