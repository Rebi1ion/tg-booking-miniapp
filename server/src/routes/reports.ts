import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';

// Helper to format date for display
const formatDateStr = (date: Date, tz: string): string => {
    return date.toLocaleDateString('ru-RU', { timeZone: tz });
};

const formatTimeStr = (date: Date, tz: string): string => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz });
};

// Status labels
const statusLabels: Record<string, string> = {
    'pending': 'Ожидает',
    'pending_prepayment': 'Ожидает оплаты',
    'paid': 'Оплачено',
    'completed': 'Завершено',
    'cancelled': 'Отменено'
};

// GET /api/reports/bookings - Generate Excel report for date range
router.get('/bookings', async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    console.log("GET /api/reports/bookings hit", { startDate, endDate });

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    try {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);

        // Get all bookings with relations
        const bookings = await prisma.booking.findMany({
            where: {
                start_time: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                service: true,
                master: true,
                user: true,
                branch: true
            },
            orderBy: { start_time: 'asc' }
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MiniApp Booking System';
        workbook.created = new Date();

        // Create main sheet with all bookings
        const sheet = workbook.addWorksheet('Bookings');

        // Define columns
        sheet.columns = [
            { header: '#', key: 'num', width: 5 },
            { header: 'Дата', key: 'date', width: 12 },
            { header: 'Время', key: 'time', width: 12 },
            { header: 'Филиал', key: 'branch', width: 20 },
            { header: 'Услуга', key: 'service', width: 25 },
            { header: 'Мастер', key: 'master', width: 20 },
            { header: 'Клиент', key: 'client', width: 20 },
            { header: 'TG ID', key: 'tg_id', width: 12 },
            { header: 'Цена', key: 'price', width: 10 },
            { header: 'Статус', key: 'status', width: 15 }
        ];

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;

        // Statistics
        let totalRevenue = 0;
        let paidCount = 0;
        let completedCount = 0;
        let pendingCount = 0;
        let cancelledCount = 0;

        // Add data rows
        bookings.forEach((booking, index) => {
            const startTime = new Date(booking.start_time);
            const endTime = new Date(booking.end_time);

            const clientName = booking.user?.first_name
                ? (booking.user.username ? `${booking.user.first_name} (@${booking.user.username})` : booking.user.first_name)
                : (booking.client_name || 'Гость');

            const row = sheet.addRow({
                num: index + 1,
                date: formatDateStr(startTime, TIMEZONE),
                time: `${formatTimeStr(startTime, TIMEZONE)} - ${formatTimeStr(endTime, TIMEZONE)}`,
                branch: booking.branch?.name || '-',
                service: booking.service?.name || '-',
                master: booking.master?.name || '-',
                client: clientName,
                tg_id: booking.user?.telegram_id?.toString() || '-',
                price: booking.service?.price || 0,
                status: statusLabels[booking.status] || booking.status
            });

            // Color code status
            const statusCell = row.getCell('status');
            if (booking.status === 'paid') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
                paidCount++;
                totalRevenue += booking.service?.price || 0;
            } else if (booking.status === 'completed') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
                completedCount++;
                totalRevenue += booking.service?.price || 0;
            } else if (booking.status === 'pending' || booking.status === 'pending_prepayment') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFE0' } };
                pendingCount++;
            } else if (booking.status === 'cancelled') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCB' } };
                cancelledCount++;
            }
        });

        // Add borders
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber <= bookings.length + 1) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        });

        // Add summary section below data
        const summaryStartRow = bookings.length + 4;

        sheet.getCell(`A${summaryStartRow}`).value = 'ИТОГИ';
        sheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 14 };

        sheet.getCell(`A${summaryStartRow + 1}`).value = 'Всего записей:';
        sheet.getCell(`B${summaryStartRow + 1}`).value = bookings.length;

        sheet.getCell(`A${summaryStartRow + 2}`).value = 'Оплачено:';
        sheet.getCell(`B${summaryStartRow + 2}`).value = paidCount;

        sheet.getCell(`A${summaryStartRow + 3}`).value = 'Завершено:';
        sheet.getCell(`B${summaryStartRow + 3}`).value = completedCount;

        sheet.getCell(`A${summaryStartRow + 4}`).value = 'Ожидает:';
        sheet.getCell(`B${summaryStartRow + 4}`).value = pendingCount;

        sheet.getCell(`A${summaryStartRow + 5}`).value = 'Отменено:';
        sheet.getCell(`B${summaryStartRow + 5}`).value = cancelledCount;

        sheet.getCell(`A${summaryStartRow + 7}`).value = 'Общая выручка:';
        sheet.getCell(`A${summaryStartRow + 7}`).font = { bold: true };
        sheet.getCell(`B${summaryStartRow + 7}`).value = totalRevenue;
        sheet.getCell(`C${summaryStartRow + 7}`).value = 'руб.';
        sheet.getCell(`B${summaryStartRow + 7}`).font = { bold: true, color: { argb: 'FF008000' } };

        // Generate filename
        const formatFilenameDate = (d: Date) => {
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();
            return `${day}_${month}_${year}`;
        };
        const filename = `report_${formatFilenameDate(start)}_${formatFilenameDate(end)}.xlsx`;

        // Write to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers - prevent caching
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Send buffer directly
        res.send(Buffer.from(buffer));

    } catch (error: any) {
        console.error("Report generation error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
