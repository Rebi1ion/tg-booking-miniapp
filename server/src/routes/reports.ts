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

// Helper function to add a sheet with bookings data
function addBookingsSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    bookings: any[],
    tz: string
): { revenue: number; stats: Record<string, number> } {
    const sheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Excel limit

    // Define columns
    sheet.columns = [
        { header: '#', key: 'num', width: 5 },
        { header: 'Дата', key: 'date', width: 12 },
        { header: 'Время', key: 'time', width: 14 },
        { header: 'Услуга', key: 'service', width: 25 },
        { header: 'Мастер', key: 'master', width: 20 },
        { header: 'Клиент', key: 'client', width: 22 },
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

    let revenue = 0;
    const stats: Record<string, number> = {
        paid: 0,
        completed: 0,
        pending: 0,
        cancelled: 0
    };

    // Add data rows
    bookings.forEach((booking, index) => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);

        const clientName = booking.user?.first_name
            ? (booking.user.username ? `${booking.user.first_name} (@${booking.user.username})` : booking.user.first_name)
            : (booking.client_name || 'Гость');

        const row = sheet.addRow({
            num: index + 1,
            date: formatDateStr(startTime, tz),
            time: `${formatTimeStr(startTime, tz)} - ${formatTimeStr(endTime, tz)}`,
            service: booking.service?.name || '-',
            master: booking.master?.name || '-',
            client: clientName,
            tg_id: booking.user?.telegram_id?.toString() || '-',
            price: booking.service?.price || 0,
            status: statusLabels[booking.status] || booking.status
        });

        // Color code status and count
        const statusCell = row.getCell('status');
        if (booking.status === 'paid') {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            stats.paid++;
            revenue += booking.service?.price || 0;
        } else if (booking.status === 'completed') {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            stats.completed++;
            revenue += booking.service?.price || 0;
        } else if (booking.status === 'pending' || booking.status === 'pending_prepayment') {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFE0' } };
            stats.pending++;
        } else if (booking.status === 'cancelled') {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCB' } };
            stats.cancelled++;
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

    return { revenue, stats };
}

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

        // Get all branches
        const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

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

        let grandTotalRevenue = 0;
        let grandTotalBookings = 0;
        const grandStats = { paid: 0, completed: 0, pending: 0, cancelled: 0 };

        // Create sheet for each branch with bookings
        for (const branch of branches) {
            const branchBookings = bookingsByBranch[branch.id] || [];
            if (branchBookings.length > 0) {
                const { revenue, stats } = addBookingsSheet(workbook, branch.name, branchBookings, TIMEZONE);

                summarySheet.addRow({
                    branch: branch.name,
                    count: branchBookings.length,
                    paid: stats.paid,
                    completed: stats.completed,
                    pending: stats.pending,
                    cancelled: stats.cancelled,
                    revenue: revenue
                });

                grandTotalRevenue += revenue;
                grandTotalBookings += branchBookings.length;
                grandStats.paid += stats.paid;
                grandStats.completed += stats.completed;
                grandStats.pending += stats.pending;
                grandStats.cancelled += stats.cancelled;
            }
        }

        // Add sheet for bookings without branch
        if (bookingsWithoutBranch.length > 0) {
            const { revenue, stats } = addBookingsSheet(workbook, 'Без филиала', bookingsWithoutBranch, TIMEZONE);

            summarySheet.addRow({
                branch: 'Без филиала',
                count: bookingsWithoutBranch.length,
                paid: stats.paid,
                completed: stats.completed,
                pending: stats.pending,
                cancelled: stats.cancelled,
                revenue: revenue
            });

            grandTotalRevenue += revenue;
            grandTotalBookings += bookingsWithoutBranch.length;
            grandStats.paid += stats.paid;
            grandStats.completed += stats.completed;
            grandStats.pending += stats.pending;
            grandStats.cancelled += stats.cancelled;
        }

        // Add totals row
        const totalsRow = summarySheet.addRow({
            branch: 'ВСЕГО',
            count: grandTotalBookings,
            paid: grandStats.paid,
            completed: grandStats.completed,
            pending: grandStats.pending,
            cancelled: grandStats.cancelled,
            revenue: grandTotalRevenue
        });
        totalsRow.font = { bold: true };
        totalsRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F5E9' }
        };

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

        // Add chart data below summary
        const chartDataStartRow = summarySheet.rowCount + 3;

        summarySheet.getCell(`A${chartDataStartRow}`).value = 'Статистика по статусам';
        summarySheet.getCell(`A${chartDataStartRow}`).font = { bold: true, size: 12 };

        summarySheet.getCell(`A${chartDataStartRow + 1}`).value = 'Оплачено';
        summarySheet.getCell(`B${chartDataStartRow + 1}`).value = grandStats.paid;

        summarySheet.getCell(`A${chartDataStartRow + 2}`).value = 'Завершено';
        summarySheet.getCell(`B${chartDataStartRow + 2}`).value = grandStats.completed;

        summarySheet.getCell(`A${chartDataStartRow + 3}`).value = 'Ожидает';
        summarySheet.getCell(`B${chartDataStartRow + 3}`).value = grandStats.pending;

        summarySheet.getCell(`A${chartDataStartRow + 4}`).value = 'Отменено';
        summarySheet.getCell(`B${chartDataStartRow + 4}`).value = grandStats.cancelled;

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
