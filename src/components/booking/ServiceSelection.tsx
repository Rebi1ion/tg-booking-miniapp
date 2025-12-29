import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { shopConfig } from '@/config/shopConfig';

export const ServiceSelection = () => {
    const { services, setService, selectedService } = useAppStore();

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-center">Выберите услугу</h2>
            <div className="grid grid-cols-1 gap-3">
                {services.map((service: any) => (
                    <Card
                        key={service.id}
                        className={cn(
                            "cursor-pointer transition-all hover:scale-[1.02] border-2",
                            selectedService?.id === service.id ? "border-primary" : "border-transparent"
                        )}
                        onClick={() => setService(service)}
                    >
                        <CardHeader className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CardTitle className="text-lg">{service.name}</CardTitle>
                                        {service.order_count > 0 && (
                                            <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                                                Ваш выбор ⭐
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{service.duration_minutes} мин</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-lg">{service.price} {shopConfig.currency}</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
};
