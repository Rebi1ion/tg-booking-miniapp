import { Router } from 'express';
import prisma from '../utils/prisma';
import ExcelJS from 'exceljs';

const router = Router();

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
                user: true
            },
            orderBy: { start_time: 'asc' }
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'MiniApp Booking System';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Бронирования');

        // Define columns
        sheet.columns = [
            { header: '№', key: 'num', width: 5 },
            { header: 'Дата', key: 'date', width: 15 },
            { header: 'Время', key: 'time', width: 12 },
            { header: 'Услуга', key: 'service', width: 25 },
            { header: 'Мастер', key: 'master', width: 20 },
            { header: 'Клиент', key: 'client', width: 25 },
            { header: 'Телефон', key: 'phone', width: 15 },
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
            'paid': 'Оплачено',
            'completed': 'Завершено',
            'cancelled': 'Отменено'
        };

        // Add data rows
        let totalRevenue = 0;
        let paidCount = 0;
        let pendingCount = 0;
        let cancelledCount = 0;

        bookings.forEach((booking, index) => {
            const startTime = new Date(booking.start_time);
            const endTime = new Date(booking.end_time);

            const clientName = booking.user?.first_name
                ? (booking.user.username ? `${booking.user.first_name} (@${booking.user.username})` : booking.user.first_name)
                : (booking.client_name || 'Гость');

            const row = sheet.addRow({
                num: index + 1,
                date: startTime.toLocaleDateString('ru-RU'),
                time: `${startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
                service: booking.service?.name || 'Не указана',
                master: booking.master?.name || 'Не указан',
                client: clientName,
                phone: booking.client_phone !== 'N/A' ? booking.client_phone : '-',
                price: booking.service?.price || 0,
                status: statusLabels[booking.status] || booking.status
            });

            // Color code status
            const statusCell = row.getCell('status');
            if (booking.status === 'paid') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
                paidCount++;
                totalRevenue += booking.service?.price || 0;
            } else if (booking.status === 'pending') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFE0' } };
                pendingCount++;
            } else if (booking.status === 'cancelled') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCB' } };
                cancelledCount++;
            } else if (booking.status === 'completed') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
                totalRevenue += booking.service?.price || 0;
            }
        });

        // Add summary section
        sheet.addRow([]);
        sheet.addRow([]);

        const summaryRow1 = sheet.addRow(['', '', '', '', '', '', 'Итого оплачено:', totalRevenue, '₽']);
        summaryRow1.font = { bold: true };

        sheet.addRow(['', '', '', '', '', '', 'Всего записей:', bookings.length, '']);
        sheet.addRow(['', '', '', '', '', '', 'Оплачено/Завершено:', paidCount, '']);
        sheet.addRow(['', '', '', '', '', '', 'Ожидает оплаты:', pendingCount, '']);
        sheet.addRow(['', '', '', '', '', '', 'Отменено:', cancelledCount, '']);

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

        // Generate filename
        const startStr = start.toLocaleDateString('ru-RU').replace(/\./g, '-');
        const endStr = end.toLocaleDateString('ru-RU').replace(/\./g, '-');
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
