import React, { useEffect, useState } from 'react';
import { format, addMinutes, isBefore, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Calendar as CalendarIcon, Clock, User, Phone, CreditCard, Star, Building2, MapPin } from 'lucide-react';
import { shopConfig } from '@/config/shopConfig';
import type { Service, Master } from '@/types';

const API_URL = shopConfig.apiUrl;

interface Branch {
    id: string;
    name: string;
    address?: string;
    start_hour: number;
    end_hour: number;
}

interface AdminBookingFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminBookingForm: React.FC<AdminBookingFormProps> = ({ onClose, onSuccess }) => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [masters, setMasters] = useState<Master[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]); // Занятые слоты

    const [step, setStep] = useState(0); // 0: Branch, 1: Service, 2: Master, 3: DateTime, 4: Client Info

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(`${API_URL}/branches`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
                const data = await res.json();
                const activeBranches = Array.isArray(data) ? data.filter((b: Branch) => (b as any).is_active !== false) : [];
                setBranches(activeBranches);

                // Auto-select if only one branch
                if (activeBranches.length === 1) {
                    setSelectedBranch(activeBranches[0]);
                    setStep(1);
                } else if (activeBranches.length === 0) {
                    // No branches, skip to services
                    setStep(1);
                }
            } catch (error) {
                console.error('Failed to fetch branches:', error);
                setStep(1); // Skip to services on error
            }
            setLoading(false);
        };
        fetchBranches();
    }, []);

    // Fetch services and masters when branch is selected
    useEffect(() => {
        if (!selectedBranch) return;

        const fetchBranchData = async () => {
            try {
                const [servicesRes, mastersRes] = await Promise.all([
                    fetch(`${API_URL}/branches/${selectedBranch.id}/services`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    fetch(`${API_URL}/branches/${selectedBranch.id}/masters`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                ]);
                const servicesData = await servicesRes.json();
                const mastersData = await mastersRes.json();
                setServices(Array.isArray(servicesData) ? servicesData.filter((s: Service) => s.is_active) : []);
                setMasters(Array.isArray(mastersData) ? mastersData.filter((m: Master) => m.is_active) : []);
            } catch (error) {
                console.error('Failed to fetch branch data:', error);
            }
        };
        fetchBranchData();
    }, [selectedBranch]);

    // Fetch booked slots when master and date change
    useEffect(() => {
        if (!selectedMaster || !selectedDate || !selectedService) {
            setBookedSlots([]);
            return;
        }

        const fetchBookedSlots = async () => {
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const res = await fetch(
                    `${API_URL}/masters/${selectedMaster.id}/bookings?date=${dateStr}`,
                    { headers: { 'ngrok-skip-browser-warning': 'true' } }
                );
                const bookings = await res.json();

                if (Array.isArray(bookings)) {
                    // Собираем все занятые временные слоты
                    const occupied: string[] = [];
                    const serviceDuration = selectedService.duration_minutes;
                    const interval = selectedMaster.slot_interval || 30;

                    bookings.forEach((booking: any) => {
                        if (booking.status === 'cancelled') return;

                        const start = new Date(booking.start_time);
                        const end = new Date(booking.end_time);

                        // Добавляем все слоты которые перекрываются с этой бронью
                        let slotTime = new Date(selectedDate);
                        slotTime.setHours(selectedMaster.start_hour || 10, 0, 0, 0);
                        const endHour = selectedMaster.end_hour || 20;

                        while (slotTime.getHours() < endHour) {
                            const slotEnd = addMinutes(slotTime, serviceDuration);

                            // Проверяем пересечение: слот пересекается с бронью если
                            // начало слота < конец брони И конец слота > начало брони
                            if (slotTime < end && slotEnd > start) {
                                occupied.push(format(slotTime, 'HH:mm'));
                            }

                            slotTime = addMinutes(slotTime, interval);
                        }
                    });

                    setBookedSlots([...new Set(occupied)]); // Убираем дубликаты
                }
            } catch (error) {
                console.error('Failed to fetch booked slots:', error);
            }
        };

        fetchBookedSlots();
    }, [selectedMaster, selectedDate, selectedService]);

    // Generate time slots
    const generateTimeSlots = () => {
        if (!selectedMaster || !selectedDate) return [];

        const slots: string[] = [];
        const interval = selectedMaster.slot_interval || 30;
        const startHour = selectedMaster.start_hour || 10;
        const endHour = selectedMaster.end_hour || 20;

        const now = new Date();
        const isToday = startOfDay(selectedDate).getTime() === startOfDay(now).getTime();

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += interval) {
                const slotTime = new Date(selectedDate);
                slotTime.setHours(hour, minute, 0, 0);

                // Skip past times for today
                if (isToday && isBefore(slotTime, now)) continue;

                slots.push(format(slotTime, 'HH:mm'));
            }
        }
        return slots;
    };

    const handleSubmit = async () => {
        if (!selectedService || !selectedMaster || !selectedDate || !selectedTime || !clientName) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        setSubmitting(true);

        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const startTime = new Date(selectedDate);
            startTime.setHours(hours, minutes, 0, 0);

            const endTime = addMinutes(startTime, selectedService.duration_minutes);

            const bookingData = {
                service_id: selectedService.id,
                master_id: selectedMaster.id,
                branch_id: selectedBranch?.id,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                status: isPaid ? 'paid' : 'pending',
                client_name: clientName,
                client_phone: clientPhone || 'N/A',
                payment_id: isPaid ? `admin_cash_${Date.now()}` : null
            };

            const res = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(bookingData)
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Ошибка при создании бронирования');
            }
        } catch (error) {
            console.error('Failed to create booking:', error);
            alert('Ошибка при создании бронирования');
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="w-full max-w-md mx-4">
                    <CardContent className="p-8 flex justify-center">
                        <Loader2 className="animate-spin h-8 w-8" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
            <Card className="w-full max-w-md mb-8 max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Новая запись</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Step 0: Select Branch */}
                    {step === 0 && (
                        <div className="space-y-3">
                            <h3 className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                Выберите филиал
                            </h3>
                            <div className="grid gap-2 max-h-60 overflow-y-auto">
                                {branches.map(branch => (
                                    <button
                                        key={branch.id}
                                        className={`p-3 border rounded-lg text-left transition-colors ${selectedBranch?.id === branch.id
                                            ? 'border-primary bg-primary/10'
                                            : 'hover:bg-muted'
                                            }`}
                                        onClick={() => {
                                            setSelectedBranch(branch);
                                            setSelectedService(null);
                                            setSelectedMaster(null);
                                        }}
                                    >
                                        <div className="font-medium">{branch.name}</div>
                                        {branch.address && (
                                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {branch.address}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => setStep(1)}
                                disabled={!selectedBranch}
                            >
                                Далее
                            </Button>
                        </div>
                    )}

                    {/* Step 1: Select Service */}
                    {step === 1 && (
                        <div className="space-y-3">
                            {selectedBranch && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                                    <Building2 className="h-3 w-3" />
                                    {selectedBranch.name}
                                    {branches.length > 1 && (
                                        <button
                                            className="text-primary underline ml-2"
                                            onClick={() => setStep(0)}
                                        >
                                            Изменить
                                        </button>
                                    )}
                                </div>
                            )}
                            <h3 className="font-medium flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                Выберите услугу
                            </h3>
                            <div className="grid gap-2 max-h-60 overflow-y-auto">
                                {services.map(service => (
                                    <button
                                        key={service.id}
                                        className={`p-3 border rounded-lg text-left transition-colors ${selectedService?.id === service.id
                                            ? 'border-primary bg-primary/10'
                                            : 'hover:bg-muted'
                                            }`}
                                        onClick={() => setSelectedService(service)}
                                    >
                                        <div className="font-medium">{service.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {service.duration_minutes} мин • {service.price} ₽
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => setStep(2)}
                                disabled={!selectedService}
                            >
                                Далее
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Select Master */}
                    {step === 2 && (
                        <div className="space-y-3">
                            <h3 className="font-medium flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Выберите мастера
                            </h3>
                            <div className="grid gap-2">
                                {masters.map(master => (
                                    <button
                                        key={master.id}
                                        className={`p-3 border rounded-lg text-left transition-colors ${selectedMaster?.id === master.id
                                            ? 'border-primary bg-primary/10'
                                            : 'hover:bg-muted'
                                            }`}
                                        onClick={() => setSelectedMaster(master)}
                                    >
                                        <div className="font-medium">{master.name}</div>
                                        {master.role && (
                                            <div className="text-sm text-muted-foreground">{master.role}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(1)}>Назад</Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => setStep(3)}
                                    disabled={!selectedMaster}
                                >
                                    Далее
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Select Date & Time */}
                    {step === 3 && (
                        <div className="space-y-3">
                            <h3 className="font-medium flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                Выберите дату и время
                            </h3>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    setSelectedDate(date);
                                    setSelectedTime('');
                                }}
                                disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                                className="rounded-md border"
                            />

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Время
                                    {bookedSlots.length > 0 && (
                                        <span className="text-xs text-muted-foreground font-normal">(серые — занято)</span>
                                    )}
                                </h4>
                                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                    {generateTimeSlots().map(time => {
                                        const isBooked = bookedSlots.includes(time);
                                        return (
                                            <button
                                                key={time}
                                                disabled={isBooked}
                                                className={`p-2 text-sm border rounded transition-colors ${isBooked
                                                    ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50 line-through'
                                                    : selectedTime === time
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted'
                                                    }`}
                                                onClick={() => !isBooked && setSelectedTime(time)}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(2)}>Назад</Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => setStep(4)}
                                    disabled={!selectedTime}
                                >
                                    Далее
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Client Info */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="font-medium">Данные клиента</h3>

                            {/* Summary */}
                            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                                <div><span className="text-muted-foreground">Услуга:</span> {selectedService?.name}</div>
                                <div><span className="text-muted-foreground">Мастер:</span> {selectedMaster?.name}</div>
                                <div><span className="text-muted-foreground">Дата:</span> {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: ru })}</div>
                                <div><span className="text-muted-foreground">Время:</span> {selectedTime}</div>
                                <div><span className="text-muted-foreground">Стоимость:</span> <span className="font-semibold text-primary">{selectedService?.price} ₽</span></div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                                        <User className="h-4 w-4" />
                                        Имя клиента *
                                    </label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Введите имя"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                                        <Phone className="h-4 w-4" />
                                        Телефон
                                    </label>
                                    <input
                                        type="tel"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="+7 (___) ___-__-__"
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-3 border rounded-lg">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <div className="font-medium">Оплата</div>
                                        <div className="text-sm text-muted-foreground">Клиент уже оплатил?</div>
                                    </div>
                                    <button
                                        onClick={() => setIsPaid(!isPaid)}
                                        className={`w-12 h-6 rounded-full transition-colors ${isPaid ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0.5'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(3)}>Назад</Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleSubmit}
                                    disabled={!clientName || submitting}
                                >
                                    {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Создать запись'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
