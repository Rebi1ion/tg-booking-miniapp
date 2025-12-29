import React, { useEffect, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trash2, User, Filter, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Master, Booking } from '@/types';

import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

export const AllBookings = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [masters, setMasters] = useState<Master[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedMasterId, setSelectedMasterId] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [mastersRes, bookingsRes] = await Promise.all([
                fetch(`${API_URL}/masters`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                fetch(`${API_URL}/bookings`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            ]);

            // Проверяем успешность ответов
            const mastersData = mastersRes.ok ? await mastersRes.json() : [];
            const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];

            // Убеждаемся что данные - массивы
            setMasters(Array.isArray(mastersData) ? mastersData : []);
            setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            setMasters([]);
            setBookings([]);
        }
        setLoading(false);
    };

    const deleteBooking = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;

        try {
            await fetch(`${API_URL}/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            fetchData();
        } catch (error) {
            console.error("Failed to delete booking:", error);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await fetch(`${API_URL}/bookings/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ status })
            });
            fetchData();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter bookings for the selected date AND master
    const filteredBookings = bookings.filter(b => {
        const dateMatch = !selectedDate || isSameDay(new Date(b.start_time), selectedDate);
        const masterMatch = selectedMasterId === 'all' || b.master_id === selectedMasterId;
        return dateMatch && masterMatch;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Custom modifiers for Calendar to show dots
    const bookedDays = bookings.map(b => new Date(b.start_time));

    // Helper to get client display name
    const getClientName = (booking: any) => {
        if (booking.user?.first_name) {
            return booking.user.username
                ? `${booking.user.first_name} (@${booking.user.username})`
                : booking.user.first_name;
        }
        return booking.client_name || 'Гость';
    };

    // Проверка активности записи (не завершена и не отменена)
    const isActiveBooking = (booking: any) => {
        return booking.status !== 'cancelled' && booking.status !== 'completed';
    };

    // Получение цвета рамки в зависимости от статуса
    const getBorderColor = (status: string) => {
        switch (status) {
            case 'completed': return '#22c55e'; // green
            case 'paid': return '#3b82f6'; // blue
            case 'pending': return '#eab308'; // yellow
            case 'cancelled': return '#ef4444'; // red
            default: return '#9ca3af'; // gray
        }
    };

    const statusConfig: Record<string, { label: string; className: string }> = {
        'pending': { label: 'Ожидает', className: 'bg-yellow-100 text-yellow-700' },
        'paid': { label: 'Оплачено', className: 'bg-blue-100 text-blue-700' },
        'cancelled': { label: 'Отменено', className: 'bg-red-100 text-red-700' },
        'completed': { label: 'Завершено', className: 'bg-green-100 text-green-700' }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 bg-card rounded-lg p-3 shadow-sm border">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    modifiers={{ booked: bookedDays }}
                    modifiersClassNames={{ booked: "font-bold text-primary underline decoration-wavy" }}
                    className="rounded-md"
                />

                <div className="flex items-center gap-2 border-t pt-3">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        className="bg-transparent text-sm font-medium outline-none flex-1"
                        value={selectedMasterId}
                        onChange={(e) => setSelectedMasterId(e.target.value)}
                    >
                        <option value="all">Все мастера</option>
                        {masters.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                    {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
                </h3>

                {filteredBookings.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">Записей не найдено.</p>
                ) : (
                    filteredBookings.map((booking: any) => (
                        <Card
                            key={booking.id}
                            className={cn(
                                "text-sm border-l-4",
                                booking.status === 'completed' && "bg-green-50 text-black",
                                booking.status === 'cancelled' && "bg-red-50 opacity-60 text-black"
                            )}
                            style={{ borderLeftColor: getBorderColor(booking.status) }}
                        >
                            <CardContent className="p-3">
                                {/* Время и услуга */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-bold text-base">
                                                {format(new Date(booking.start_time), 'HH:mm')} — {format(new Date(booking.end_time), 'HH:mm')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Star className="h-4 w-4 text-yellow-500" />
                                            <span className="font-medium">{booking.service?.name}</span>
                                            <span className="text-blue-600 font-semibold">{booking.service?.price} ₽</span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold",
                                        statusConfig[booking.status]?.className || 'bg-gray-100 text-gray-700'
                                    )}>
                                        {statusConfig[booking.status]?.label || booking.status}
                                    </span>
                                </div>

                                {/* Клиент */}
                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                    <User className="h-3 w-3" />
                                    <span>Клиент: {getClientName(booking)}</span>
                                    {booking.user?.telegram_id && (
                                        <span className="ml-1">(ID: {booking.user.telegram_id.toString()})</span>
                                    )}
                                </div>

                                {/* Мастер */}
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed">
                                    <div className="text-xs">
                                        <span className="text-muted-foreground">Мастер:</span> <span className="font-semibold">{booking.master?.name}</span>
                                    </div>

                                    {/* Кнопки для активных записей */}
                                    {isActiveBooking(booking) && (
                                        <div className="flex gap-1">
                                            {booking.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                                                    onClick={() => updateStatus(booking.id, 'paid')}
                                                >
                                                    💳 Оплачено
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs"
                                                onClick={() => deleteBooking(booking.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Удалить
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
