import React, { useEffect, useState } from 'react';
import type { Booking } from '@/types';
import { format, isSameDay, isPast } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CalendarX, Trash2, User, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

export const TodaySchedule = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchToday = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/bookings`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const allBookings = await res.json();

            const today = new Date();
            const filtered = (Array.isArray(allBookings) ? allBookings : []).filter((b: any) =>
                isSameDay(new Date(b.start_time), today)
            ).sort((a: any, b: any) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );

            // Автоматически завершаем записи после истечения времени услуги
            for (const booking of filtered) {
                if (booking.status === 'paid' || booking.status === 'pending') {
                    const endTime = new Date(booking.end_time);
                    if (isPast(endTime)) {
                        // Автозавершение
                        await fetch(`${API_URL}/bookings/${booking.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'ngrok-skip-browser-warning': 'true'
                            },
                            body: JSON.stringify({ status: 'completed' })
                        });
                        booking.status = 'completed';
                    }
                }
            }

            setBookings(filtered);
        } catch (error) {
            console.error("Failed to fetch today's bookings", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchToday();
    }, []);

    const updateStatus = async (id: string, status: 'cancelled' | 'completed' | 'paid') => {

        try {
            await fetch(`${API_URL}/bookings/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ status })
            });
            fetchToday();
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const deleteBooking = async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;

        try {
            await fetch(`${API_URL}/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            fetchToday();
        } catch (error) {
            console.error("Failed to delete booking", error);
        }
    };

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <CalendarX className="h-12 w-12 mb-4 opacity-50" />
                <p>На сегодня записей нет.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bookings.map((booking: any) => (
                <Card
                    key={booking.id}
                    className={`relative overflow-hidden ${booking.status === 'completed' ? 'bg-green-50 border-green-200 text-black' :
                        booking.status === 'cancelled' ? 'bg-red-50 border-red-200 opacity-60 text-black' : ''
                        }`}
                >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${booking.status === 'completed' ? 'bg-green-500' :
                        booking.status === 'paid' ? 'bg-blue-500' :
                            booking.status === 'pending' ? 'bg-yellow-500' :
                                booking.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                    <CardContent className="p-4 pl-6">
                        <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                                {/* Время */}
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-bold text-lg">
                                        {format(new Date(booking.start_time), 'HH:mm')} — {format(new Date(booking.end_time), 'HH:mm')}
                                    </span>
                                </div>

                                {/* Услуга */}
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span className="font-medium">{booking.service?.name || 'Услуга не указана'}</span>
                                </div>

                                {/* Мастер */}
                                <p className="text-sm pl-6">
                                    <span className="opacity-70">Мастер:</span> <span className="font-medium">{booking.master?.name || 'Не указан'}</span>
                                </p>

                                {/* Цена */}
                                <div className="flex items-center gap-2 pl-6">
                                    <span className="text-sm opacity-70">Цена:</span>
                                    <span className="font-semibold text-blue-600">{booking.service?.price || 0} ₽</span>
                                </div>

                                {/* Клиент */}
                                <div className="flex items-center gap-1 text-sm mt-2 opacity-80">
                                    <User className="h-3 w-3" />
                                    <span>Клиент: {getClientName(booking)}</span>
                                </div>
                            </div>

                            {/* Статус */}
                            <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    booking.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                    }`}>
                                    {booking.status === 'paid' ? 'ОПЛАЧЕНО' :
                                        booking.status === 'pending' ? 'ОЖИДАЕТ' :
                                            booking.status === 'cancelled' ? 'ОТМЕНЕНО' :
                                                booking.status === 'completed' ? 'ЗАВЕРШЕНО' : booking.status?.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {booking.client_phone && booking.client_phone !== 'N/A' && (
                            <div className="text-sm text-gray-500 mb-2">
                                📞 {booking.client_phone}
                            </div>
                        )}

                        {/* Кнопки только для активных записей */}
                        {isActiveBooking(booking) && (
                            <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                                {booking.status === 'pending' && (
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(booking.id, 'paid')}>
                                        💳 Оплачено
                                    </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => updateStatus(booking.id, 'cancelled')}>
                                    Отменить
                                </Button>
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => updateStatus(booking.id, 'completed')}>
                                    Завершить
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => deleteBooking(booking.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Удалить
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
