import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format, isToday, isBefore, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { shopConfig } from '@/config/shopConfig';
import { Loader2 } from 'lucide-react';

export const TimeSelection = () => {
    const {
        selectedDate,
        setDate,
        selectedTimeSlot,
        setTimeSlot,
        occupiedSlots,
        isCheckingAvailability,
        selectedMaster,
        nextStep
    } = useAppStore();

    // Generate available time slots dynamically
    const dynamicSlots = useMemo(() => {
        if (!selectedMaster) return [];
        const startHour = selectedMaster.start_hour ?? shopConfig.bookingDefaults.startHour;
        const endHour = selectedMaster.end_hour ?? shopConfig.bookingDefaults.endHour;
        const interval = selectedMaster.slot_interval ?? shopConfig.bookingDefaults.intervalMinutes;

        const slots: string[] = [];
        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += interval) {
                slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            }
        }
        return slots;
    }, [selectedMaster]);

    const [month, setMonth] = React.useState<Date>(new Date());

    // Check if a time slot is in the past (only for today)
    const isSlotInPast = (time: string): boolean => {
        if (!selectedDate) return false;

        const now = new Date();
        const selected = new Date(selectedDate);

        // Manually check if selected date is today (compare year, month, day only)
        const isSelectedToday =
            selected.getFullYear() === now.getFullYear() &&
            selected.getMonth() === now.getMonth() &&
            selected.getDate() === now.getDate();

        if (!isSelectedToday) return false;

        const [hours, minutes] = time.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);

        // Add 30 min buffer - can't book if less than 30 min until slot
        const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);
        return slotTime <= bufferTime;
    };

    const handleTimeSelect = (time: string, isOccupied: boolean, isPast: boolean) => {
        if (isOccupied || isPast) return;
        setTimeSlot(time);
    };

    const handleContinue = () => {
        if (selectedDate && selectedTimeSlot) {
            nextStep();
        }
    };

    // When date changes, clear selected time if it's now invalid
    useEffect(() => {
        if (selectedTimeSlot && selectedDate) {
            const isPast = isSlotInPast(selectedTimeSlot);
            const isOccupied = occupiedSlots.includes(selectedTimeSlot);
            if (isPast || isOccupied) {
                setTimeSlot(null);
            }
        }
    }, [selectedDate, occupiedSlots]);

    const handleDateSelect = (date: Date | null) => {
        if (date) {
            setDate(date);
            setMonth(date); // Automatically switch month view if selecting outside date
        } else {
            setDate(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Выберите дату и время</h2>

            {selectedDate && (
                <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-sm font-medium text-muted-foreground text-center">
                        Доступное время на {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                        {isToday(selectedDate) && <span className="text-orange-500 ml-1">(сегодня)</span>}
                    </h3>

                    {isCheckingAvailability ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {dynamicSlots.map((time) => {
                                const isOccupied = occupiedSlots.includes(time);
                                const isPast = isSlotInPast(time);
                                const isDisabled = isOccupied || isPast;

                                return (
                                    <Button
                                        key={time}
                                        variant={selectedTimeSlot === time ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleTimeSelect(time, isOccupied, isPast)}
                                        disabled={isDisabled}
                                        className={cn(
                                            "w-full transition-all",
                                            selectedTimeSlot === time && "scale-105 shadow-md",
                                            isOccupied && "opacity-50 cursor-not-allowed bg-red-50 text-red-400 line-through",
                                            isPast && !isOccupied && "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400"
                                        )}
                                        title={isPast ? "Время уже прошло" : isOccupied ? "Занято" : "Доступно"}
                                    >
                                        {time}
                                    </Button>
                                );
                            })}
                        </div>
                    )}

                    {isToday(selectedDate) && (
                        <p className="text-xs text-center text-muted-foreground">
                            ⏰ Серые слоты — время уже прошло
                        </p>
                    )}
                </div>
            )}

            <div className="flex justify-center bg-card rounded-lg p-2 shadow-sm border">
                <Calendar
                    mode="single"
                    required
                    selected={selectedDate || undefined}
                    onSelect={handleDateSelect}
                    month={month}
                    onMonthChange={setMonth}
                    className="rounded-md border shadow"
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                />
            </div>

            <Button
                className="w-full mt-6"
                size="lg"
                disabled={!selectedDate || !selectedTimeSlot}
                onClick={handleContinue}
            >
                Продолжить
            </Button>
        </div>
    );
};
