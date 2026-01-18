import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { shopConfig } from '@/config/shopConfig';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2, Tag, CheckCircle2, XCircle, Gift } from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface PromoValidation {
    valid: boolean;
    error?: string;
    promotion?: {
        id: string;
        name: string;
        discount_type: 'percent' | 'fixed';
        discount_value: number;
    };
}

interface DatePromotion {
    found: boolean;
    promotion?: {
        id: string;
        name: string;
        discount_type: 'percent' | 'fixed';
        discount_value: number;
    };
}

export const BookingSummary = () => {
    const { selectedService, selectedMaster, selectedDate, selectedTimeSlot, submitBooking, resetBooking, user, loadInitialData } = useAppStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoValidation, setPromoValidation] = useState<PromoValidation | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [datePromotion, setDatePromotion] = useState<DatePromotion | null>(null);

    // Check for date-based discounts when date or service changes
    useEffect(() => {
        const checkDateDiscount = async () => {
            if (!selectedDate || !selectedService) {
                setDatePromotion(null);
                return;
            }

            try {
                const res = await fetch(`${shopConfig.apiUrl}/promotions/check-date`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({
                        booking_date: selectedDate.toISOString(),
                        service_id: selectedService.id,
                        user_id: user?.id
                    })
                });
                const data = await res.json();
                setDatePromotion(data);
            } catch (error) {
                console.error('Failed to check date discount:', error);
                setDatePromotion(null);
            }
        };

        checkDateDiscount();
    }, [selectedDate, selectedService, user?.id]);

    if (!selectedService || !selectedMaster || !selectedDate || !selectedTimeSlot) return null;

    const validatePromoCode = async () => {
        if (!promoCode.trim()) {
            setPromoValidation(null);
            return;
        }

        setIsValidating(true);
        try {
            const res = await fetch(`${shopConfig.apiUrl}/promotions/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    promo_code: promoCode.trim(),
                    service_id: selectedService.id,
                    user_id: user?.id  // Pass user_id for usage limit checking
                })
            });
            const data = await res.json();
            setPromoValidation(data);
        } catch (error) {
            setPromoValidation({ valid: false, error: 'Ошибка проверки' });
        } finally {
            setIsValidating(false);
        }
    };


    // Calculate discounted price - prioritize promo code, then date-based discount
    const originalPrice = selectedService.price;
    let discountAmount = 0;
    let finalPrice = originalPrice;
    let activePromotion: { id: string; name: string; discount_type: string; discount_value: number } | null = null;
    let isDateBasedDiscount = false;

    if (promoValidation?.valid && promoValidation.promotion) {
        // Promo code takes priority
        activePromotion = promoValidation.promotion;
    } else if (datePromotion?.found && datePromotion.promotion) {
        // Date-based discount if no promo code
        activePromotion = datePromotion.promotion;
        isDateBasedDiscount = true;
    }

    if (activePromotion) {
        const { discount_type, discount_value } = activePromotion;
        if (discount_type === 'percent') {
            discountAmount = Math.round(originalPrice * discount_value / 100);
        } else {
            discountAmount = discount_value;
        }
        finalPrice = Math.max(0, originalPrice - discountAmount);
    }

    const handleBooking = async () => {
        setIsProcessing(true);

        // Pass the final price (with discount if promo applied)
        const result = await submitBooking(finalPrice, activePromotion?.id);

        // If booking successful and promo was used, record the usage
        if (result.success && activePromotion && user) {
            try {
                await fetch(`${shopConfig.apiUrl}/promotions/use`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({
                        promotion_id: activePromotion.id,
                        user_id: user.id
                    })
                });
            } catch (e) {
                console.error('Failed to record promo usage:', e);
            }
        }

        setIsProcessing(false);

        if (result.success) {
            if (result.invoiceSent) {
                // Prepayment flow - invoice sent, booking will be created after payment
                showToast("Инвойс на оплату отправлен в Telegram! Запись будет создана автоматически после оплаты.", 'payment');
            } else if (shopConfig.payment.enabled) {
                showToast("Запись создана! Счёт на оплату отправлен вам в чат бота.", 'payment');
            } else {
                showToast("Запись подтверждена!", 'success');
            }
            resetBooking();

            // Reload services to update recommendations (with delay to allow backend to process)
            setTimeout(() => {
                loadInitialData(user?.id);
            }, 2000);
        } else {
            showToast(result.error || "Не удалось создать запись.", 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-center">Подтверждение записи</h2>

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-center text-primary">
                        {shopConfig.appName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Услуга</span>
                        <span className="font-medium">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Мастер</span>
                        <span className="font-medium">{selectedMaster.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Дата</span>
                        <span className="font-medium uppercase">{format(selectedDate, 'd MMMM yyyy', { locale: ru })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Время</span>
                        <span className="font-medium">{selectedTimeSlot}</span>
                    </div>

                    {/* Automatic Date Discount Banner */}
                    {isDateBasedDiscount && datePromotion?.promotion && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600">
                            <Gift className="w-4 h-4 flex-shrink-0" />
                            <div className="text-sm">
                                <span className="font-medium">{datePromotion.promotion.name}</span>
                                <span className="ml-1">
                                    ({datePromotion.promotion.discount_type === 'percent'
                                        ? `-${datePromotion.promotion.discount_value}%`
                                        : `-${datePromotion.promotion.discount_value} ₽`})
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Promo Code Input */}
                    <div className="border-t pt-4 space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={promoCode}
                                    onChange={(e) => {
                                        setPromoCode(e.target.value.toUpperCase());
                                        setPromoValidation(null);
                                    }}
                                    placeholder="Промокод"
                                    className="pl-9"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={validatePromoCode}
                                disabled={isValidating || !promoCode.trim()}
                            >
                                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ОК'}
                            </Button>
                        </div>

                        {/* Promo validation result */}
                        {promoValidation && (
                            <div className={`flex items-center gap-2 text-sm ${promoValidation.valid ? 'text-green-600' : 'text-red-500'}`}>
                                {promoValidation.valid ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Скидка применена: {promoValidation.promotion?.discount_type === 'percent'
                                            ? `-${promoValidation.promotion.discount_value}%`
                                            : `-${promoValidation.promotion?.discount_value} ₽`
                                        }</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        <span>{promoValidation.error}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Price Summary */}
                    <div className="border-t pt-4 space-y-2">
                        {discountAmount > 0 && (
                            <>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Стоимость</span>
                                    <span className="line-through">{originalPrice} ₽</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Скидка</span>
                                    <span>-{discountAmount} ₽</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between text-lg font-bold">
                            <span>Итого</span>
                            <span>{finalPrice} ₽</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleBooking}
                className="w-full h-12 text-lg bg-[#007AFF] hover:bg-[#007AFF]/90 font-bold"
                disabled={isProcessing}
            >
                {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {shopConfig.payment.enabled
                    ? `Оплатить ${finalPrice} ₽`
                    : "Записаться"
                }
            </Button>
        </div>
    );
};
