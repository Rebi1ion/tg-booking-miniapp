import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, Download, FileSpreadsheet } from 'lucide-react';

interface ReportGeneratorProps {
    apiUrl: string;
}

export default function ReportGenerator({ apiUrl }: ReportGeneratorProps) {
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [startOpen, setStartOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);

    const handleDownload = async () => {
        if (!startDate || !endDate) {
            alert('Выберите обе даты');
            return;
        }

        if (startDate > endDate) {
            alert('Начальная дата не может быть позже конечной');
            return;
        }

        setIsLoading(true);

        try {
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const response = await fetch(
                `${apiUrl}/api/reports/bookings?startDate=${startStr}&endDate=${endStr}`,
                {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Ошибка генерации отчёта');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookings_${format(startDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Report download error:', error);
            alert('Ошибка при скачивании отчёта');
        } finally {
            setIsLoading(false);
        }
    };

    // Quick date range presets
    const setLastWeek = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        setStartDate(start);
        setEndDate(end);
    };

    const setLastMonth = () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        setStartDate(start);
        setEndDate(end);
    };

    const setCurrentMonth = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <Card className="border-[var(--tg-section-separator-color)]">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Отчёт по бронированиям
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={setLastWeek}
                        className="text-xs"
                    >
                        Последние 7 дней
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={setLastMonth}
                        className="text-xs"
                    >
                        Последние 30 дней
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={setCurrentMonth}
                        className="text-xs"
                    >
                        Текущий месяц
                    </Button>
                </div>

                {/* Date pickers */}
                <div className="flex gap-2">
                    <Popover open={startOpen} onOpenChange={setStartOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex-1 justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, 'dd.MM.yyyy', { locale: ru }) : 'С даты'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(date) => {
                                    setStartDate(date);
                                    setStartOpen(false);
                                }}
                                locale={ru}
                            />
                        </PopoverContent>
                    </Popover>

                    <Popover open={endOpen} onOpenChange={setEndOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex-1 justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, 'dd.MM.yyyy', { locale: ru }) : 'По дату'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={(date) => {
                                    setEndDate(date);
                                    setEndOpen(false);
                                }}
                                locale={ru}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Download button */}
                <Button
                    onClick={handleDownload}
                    disabled={!startDate || !endDate || isLoading}
                    className="w-full"
                >
                    <Download className="mr-2 h-4 w-4" />
                    {isLoading ? 'Генерация...' : 'Скачать Excel отчёт'}
                </Button>
            </CardContent>
        </Card>
    );
}
