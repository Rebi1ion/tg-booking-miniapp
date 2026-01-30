import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { shopConfig } from '@/config/shopConfig';
import { useAppStore } from '@/store/useAppStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Clock, User, Phone } from 'lucide-react';

interface Booking {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    client_name?: string;
    client_phone?: string;
    service?: { name: string; price: number };
    user?: { first_name: string; username?: string };
    custom_price?: number;
}

interface MasterTodayScheduleProps {
    masterId: string;
}

export function MasterTodaySchedule({ masterId }: MasterTodayScheduleProps) {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useAppStore();

    const today = new Date();

    useEffect(() => {
        fetchTodayBookings();
    }, [masterId]);

    const fetchTodayBookings = async () => {
        try {
            const dateStr = format(today, 'yyyy-MM-dd');
            const response = await fetch(
                `${shopConfig.apiUrl}/bookings?date=${dateStr}&master_id=${masterId}`,
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );
            const data = await response.json();
            setBookings(data);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { label: string; className: string }> = {
            pending: { label: 'Ожидает', className: 'bg-yellow-500/20 text-yellow-600' },
            paid: { label: 'Оплачено', className: 'bg-green-500/20 text-green-600' },
            completed: { label: 'Завершено', className: 'bg-blue-500/20 text-blue-600' },
            cancelled: { label: 'Отменено', className: 'bg-red-500/20 text-red-600' }
        };
        const variant = variants[status] || { label: status, className: 'bg-gray-500/20' };
        return <Badge className={variant.className}>{variant.label}</Badge>;
    };

    const getClientName = (booking: Booking) => {
        if (booking.user?.first_name) {
            return booking.user.username
                ? `${booking.user.first_name} (@${booking.user.username})`
                : booking.user.first_name;
        }
        return booking.client_name || 'Гость';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const activeBookings = bookings.filter(b => b.status !== 'cancelled');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                    📅 {format(today, 'd MMMM', { locale: ru })}
                </h2>
                <Badge variant="outline">{activeBookings.length} записей</Badge>
            </div>

            {activeBookings.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        На сегодня записей нет 🎉
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {activeBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                                        </span>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                </div>

                                <div className="text-sm space-y-1">
                                    <div className="font-medium text-foreground">
                                        {booking.service?.name || 'Услуга'}
                                    </div>

                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-3 h-3" />
                                        {getClientName(booking)}
                                    </div>

                                    {booking.client_phone && booking.client_phone !== 'N/A' && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="w-3 h-3" />
                                            {booking.client_phone}
                                        </div>
                                    )}

                                    {(booking.service?.price || booking.custom_price !== undefined) && (
                                        <div className="text-primary font-medium">
                                            {booking.custom_price !== undefined && booking.custom_price !== null && booking.service?.price && booking.custom_price < booking.service.price ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm text-muted-foreground line-through">{formatPrice(booking.service.price)}</span>
                                                    <span className="text-green-600 font-medium">{formatPrice(booking.custom_price)}</span>
                                                </div>
                                            ) : (
                                                formatPrice(booking.custom_price ?? booking.service?.price ?? 0)
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
