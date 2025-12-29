import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Simple Avatar replacement if not implementing full shadcn avatar yet
const SimpleAvatar = ({ src, alt, fallback }: { src?: string, alt: string, fallback: string }) => (
    <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
        {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : fallback}
    </div>
);

export const MasterSelection = () => {
    const { masters, selectedService, setMaster, selectedMaster } = useAppStore();

    // Фильтруем мастеров: оставляем только тех, кто выполняет выбранную услугу
    const filteredMasters = masters.filter(master => {
        if (!selectedService) return true;
        // @ts-ignore - master.services is an array of Service objects from backend transform
        return master.services?.some((s: any) => s.id === selectedService.id);
    });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-center">Выберите мастера</h2>
            <div className="grid grid-cols-2 gap-3">
                {filteredMasters.map((master: any) => (
                    <Card
                        key={master.id}
                        className={cn(
                            "cursor-pointer transition-all hover:scale-[1.02] border-2",
                            selectedMaster?.id === master.id ? "border-primary" : "border-transparent"
                        )}
                        onClick={() => setMaster(master)}
                    >
                        <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                            <SimpleAvatar
                                src={master.photo_url}
                                alt={master.name}
                                fallback={master.name.charAt(0)}
                            />
                            <div>
                                <h3 className="font-semibold">{master.name}</h3>
                                <p className="text-xs text-muted-foreground">{master.role}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {filteredMasters.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                    К сожалению, для этой услуги сейчас нет доступных мастеров.
                </p>
            )}
        </div>
    );
};
