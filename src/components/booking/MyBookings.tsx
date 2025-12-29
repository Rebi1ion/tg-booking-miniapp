import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isAfter, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2, CalendarClock, History, CheckCircle2, Clock, XCircle, CreditCard } from 'lucide-react';
import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

export const MyBookings = () => {
    const { userBookings, fetchUserBookings, user } = useAppStore();
    const [loading, setLoading] = useState(true);
    const [sendingInvoice, setSendingInvoice] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (user) {
                await fetchUserBookings();
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handlePayClick = async (bookingId: string) => {
        setSendingInvoice(bookingId);
        try {
            const res = await fetch(`${API_URL}/bookings/${bookingId}/send-invoice`, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
                alert('✅ Счёт на оплату отправлен в чат бота!');
            } else {
                const data = await res.json();
                alert(data.error || 'Ошибка при отправке счёта');
            }
        } catch (error) {
            alert('Ошибка при отправке счёта');
        }
        setSendingInvoice(null);
    };

    if (loading) return (
        <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    const now = new Date();
    const upcoming = userBookings.filter(b => isAfter(new Date(b.start_time), now) && b.status !== 'cancelled');
    const past = userBookings.filter(b => isBefore(new Date(b.start_time), now) || b.status === 'cancelled');

    const statusMap: Record<string, { label: string, color: string, icon: any }> = {
        'pending': { label: 'Ожидает оплаты', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
        'paid': { label: 'Оплачено', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
        'completed': { label: 'Завершено', color: 'text-blue-600 bg-blue-50', icon: CheckCircle2 },
        'cancelled': { label: 'Отменено', color: 'text-red-600 bg-red-50', icon: XCircle },
    };

    const BookingCard = ({ booking }: { booking: any }) => {
        const startTime = new Date(booking.start_time);
        const status = statusMap[booking.status] || statusMap['pending'];
        const StatusIcon = status.icon;
        const isPending = booking.status === 'pending';
        const isSending = sendingInvoice === booking.id;

        return (
            <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: booking.status === 'paid' ? '#22c55e' : booking.status === 'pending' ? '#eab308' : '#ef4444' }}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">
                                {format(startTime, 'd MMMM yyyy', { locale: ru })}
                            </p>
                            <h3 className="font-bold text-lg">{format(startTime, 'HH:mm')}</h3>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="font-semibold">{booking.service?.name}</p>
                        <p className="text-sm text-muted-foreground">Мастер: {booking.master?.name}</p>
                        {booking.service?.price && (
                            <p className="text-sm font-medium text-primary">{booking.service.price} ₽</p>
                        )}
                    </div>

                    {isPending && (
                        <Button
                            onClick={() => handlePayClick(booking.id)}
                            disabled={isSending}
                            className="w-full mt-3 bg-green-600 hover:bg-green-700"
                            size="sm"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CreditCard className="h-4 w-4 mr-2" />
                            )}
                            Оплатить
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">Ближайшие записи</h2>
                </div>
                {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-lg text-center border border-dashed">
                        У вас нет активных записей
                    </p>
                ) : (
                    <div className="space-y-3">
                        {upcoming.map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                )}
            </div>

            {past.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-bold text-muted-foreground">История</h2>
                    </div>
                    <div className="space-y-3 opacity-80">
                        {past.map(b => <BookingCard key={b.id} booking={b} />)}
                    </div>
                </div>
            )}
        </div>
    );
};
