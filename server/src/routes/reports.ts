import { Router } from 'express';
import prisma from '../utils/prisma';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const TIMEZONE = process.env.TIMEZONE || 'Europe/Moscow';

// Helper to add data sheet for a branch
const addBranchSheet = (
    workbook: ExcelJS.Workbook,
    sheetName: string,
    bookings: any[],
    timezone: string
) => {
    const sheet = workbook.addWorksheet(sheetName);

    // Define columns
    sheet.columns = [
        { header: '№', key: 'num', width: 5 },
        { header: 'Дата', key: 'date', width: 15 },
        { header: 'Время', key: 'time', width: 12 },
        { header: 'Услуга', key: 'service', width: 25 },
        { header: 'Мастер', key: 'master', width: 20 },
        { header: 'Клиент', key: 'client', width: 25 },
        { header: 'Telegram ID', key: 'telegram_id', width: 15 },
        { header: 'Цена (₽)', key: 'price', width: 12 },
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

    // Status labels
    const statusLabels: Record<string, string> = {
        'pending': 'Ожидает',
        'pending_prepayment': 'Ожидает оплаты',
        'paid': 'Оплачено',
        'completed': 'Завершено',
        'cancelled': 'Отменено'
    };

    // Statistics
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;

    // Add data rows
    bookings.forEach((booking, index) => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);

        const clientName = booking.user?.first_name
            ? (booking.user.username ? `${booking.user.first_name} (@${booking.user.username})` : booking.user.first_name)
            : (booking.client_name || 'Гость');

        const telegramId = booking.user?.telegram_id?.toString() || '-';

        const row = sheet.addRow({
            num: index + 1,
            date: startTime.toLocaleDateString('ru-RU', { timeZone: timezone }),
            time: `${startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: timezone })} - ${endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: timezone })}`,
            service: booking.service?.name || 'Не указана',
            master: booking.master?.name || 'Не указан',
            client: clientName,
            telegram_id: telegramId,
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

    // Add borders to all data cells
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

    // Add summary section
    const summaryStartRow = bookings.length + 4;

    sheet.getCell(`A${summaryStartRow}`).value = 'ИТОГИ';
    sheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 14 };

    sheet.getCell(`A${summaryStartRow + 1}`).value = 'Всего записей:';
    sheet.getCell(`B${summaryStartRow + 1}`).value = bookings.length;

    sheet.getCell(`A${summaryStartRow + 2}`).value = 'Оплачено:';
    sheet.getCell(`B${summaryStartRow + 2}`).value = paidCount;

    sheet.getCell(`A${summaryStartRow + 3}`).value = 'Завершено:';
    sheet.getCell(`B${summaryStartRow + 3}`).value = completedCount;

    sheet.getCell(`A${summaryStartRow + 4}`).value = 'Ожидает оплаты:';
    sheet.getCell(`B${summaryStartRow + 4}`).value = pendingCount;

    sheet.getCell(`A${summaryStartRow + 5}`).value = 'Отменено:';
    sheet.getCell(`B${summaryStartRow + 5}`).value = cancelledCount;

    sheet.getCell(`A${summaryStartRow + 7}`).value = 'Общая выручка:';
    sheet.getCell(`A${summaryStartRow + 7}`).font = { bold: true };
    sheet.getCell(`B${summaryStartRow + 7}`).value = totalRevenue;
    sheet.getCell(`C${summaryStartRow + 7}`).value = '₽';
    sheet.getCell(`B${summaryStartRow + 7}`).font = { bold: true, color: { argb: 'FF008000' } };

    // Create chart data for status distribution
    const chartDataStartRow = summaryStartRow + 10;
    sheet.getCell(`A${chartDataStartRow}`).value = 'Статус';
    sheet.getCell(`B${chartDataStartRow}`).value = 'Количество';
    sheet.getCell(`A${chartDataStartRow + 1}`).value = 'Оплачено';
    sheet.getCell(`B${chartDataStartRow + 1}`).value = paidCount;
    sheet.getCell(`A${chartDataStartRow + 2}`).value = 'Завершено';
    sheet.getCell(`B${chartDataStartRow + 2}`).value = completedCount;
    sheet.getCell(`A${chartDataStartRow + 3}`).value = 'Ожидает';
    sheet.getCell(`B${chartDataStartRow + 3}`).value = pendingCount;
    sheet.getCell(`A${chartDataStartRow + 4}`).value = 'Отменено';
    sheet.getCell(`B${chartDataStartRow + 4}`).value = cancelledCount;

    return { totalRevenue, paidCount, completedCount, pendingCount, cancelledCount, bookingsCount: bookings.length };
};

// GET /api/reports/bookings - Generate Excel report for date range
router.get('/bookings', async (req, res) => {
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

        // Get all branches
        const branches = await prisma.branch.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });

        // Get all bookings with branch info
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

        // Group bookings by branch
        const bookingsByBranch: Record<string, any[]> = {};
        const bookingsWithoutBranch: any[] = [];

        for (const booking of bookings) {
            if (booking.branch_id && booking.branch) {
                if (!bookingsByBranch[booking.branch_id]) {
                    bookingsByBranch[booking.branch_id] = [];
                }
                bookingsByBranch[booking.branch_id].push(booking);
            } else {
                bookingsWithoutBranch.push(booking);
            }
        }

        // Create summary sheet first
        const summarySheet = workbook.addWorksheet('Сводка');
        summarySheet.columns = [
            { header: 'Филиал', key: 'branch', width: 30 },
            { header: 'Записей', key: 'count', width: 12 },
            { header: 'Оплачено', key: 'paid', width: 12 },
            { header: 'Завершено', key: 'completed', width: 12 },
            { header: 'Ожидает', key: 'pending', width: 12 },
            { header: 'Отменено', key: 'cancelled', width: 12 },
            { header: 'Выручка (₽)', key: 'revenue', width: 15 }
        ];

        const summaryHeaderRow = summarySheet.getRow(1);
        summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summaryHeaderRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2E7D32' }
        };
        summaryHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
        summaryHeaderRow.height = 25;

        let grandTotalRevenue = 0;
        let grandTotalBookings = 0;

        // Create sheet for each branch
        for (const branch of branches) {
            const branchBookings = bookingsByBranch[branch.id] || [];
            if (branchBookings.length > 0) {
                const stats = addBranchSheet(workbook, branch.name.substring(0, 31), branchBookings, TIMEZONE);

                summarySheet.addRow({
                    branch: branch.name,
                    count: stats.bookingsCount,
                    paid: stats.paidCount,
                    completed: stats.completedCount,
                    pending: stats.pendingCount,
                    cancelled: stats.cancelledCount,
                    revenue: stats.totalRevenue
                });

                grandTotalRevenue += stats.totalRevenue;
                grandTotalBookings += stats.bookingsCount;
            }
        }

        // Add sheet for bookings without branch
        if (bookingsWithoutBranch.length > 0) {
            const stats = addBranchSheet(workbook, 'Без филиала', bookingsWithoutBranch, TIMEZONE);

            summarySheet.addRow({
                branch: 'Без филиала',
                count: stats.bookingsCount,
                paid: stats.paidCount,
                completed: stats.completedCount,
                pending: stats.pendingCount,
                cancelled: stats.cancelledCount,
                revenue: stats.totalRevenue
            });

            grandTotalRevenue += stats.totalRevenue;
            grandTotalBookings += stats.bookingsCount;
        }

        // Add total row to summary
        const totalRow = summarySheet.addRow({
            branch: 'ИТОГО',
            count: grandTotalBookings,
            paid: '',
            completed: '',
            pending: '',
            cancelled: '',
            revenue: grandTotalRevenue
        });
        totalRow.font = { bold: true };
        totalRow.getCell('revenue').font = { bold: true, color: { argb: 'FF008000' } };

        // Add borders to summary sheet
        summarySheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Generate filename
        const startStr = start.toLocaleDateString('ru-RU', { timeZone: TIMEZONE }).replace(/\./g, '-');
        const endStr = end.toLocaleDateString('ru-RU', { timeZone: TIMEZONE }).replace(/\./g, '-');
        const filename = `bookings_${startStr}_${endStr}.xlsx`;

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error: any) {
        console.error("Report generation error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
