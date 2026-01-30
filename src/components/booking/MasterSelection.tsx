import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardContent } from '@/components/ui/card';
import { shopConfig } from '@/config/shopConfig';
import { User } from 'lucide-react';

const SimpleAvatar = ({ src, alt, fallback }: { src?: string; alt: string; fallback: string }) => {
    return (
        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center border border-muted">
            {src ? (
                <img src={src} alt={alt} className="w-full h-full object-cover" />
            ) : (
                <div className="flex items-center justify-center w-full h-full bg-muted">
                    <span className="text-sm font-semibold text-muted-foreground uppercase">
                        {fallback}
                    </span>
                </div>
            )}
        </div>
    );
};

export const MasterSelection = () => {
    const { masters, masterServices, selectedService, setMaster } = useAppStore();

    const filteredMasters = useMemo(() => {
        if (!selectedService) return [];

        return masters.filter(m => {
            if (m.is_active === false) return false;

            // Check if master has the selected service in their list
            // If services array is missing (legacy), show master (or hide? likely better to show to avoid empty screens)
            if (!m.services || m.services.length === 0) return true;

            return m.services.some((s: any) => s.id === selectedService.id);
        });
    }, [masters, selectedService]);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-center">Выберите мастера</h2>

            <div className="grid grid-cols-1 gap-3">
                {filteredMasters.map(master => (
                    <Card
                        key={master.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setMaster(master)}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <SimpleAvatar
                                src={master.photo_url ? (master.photo_url.startsWith('http') ? master.photo_url : `${shopConfig.baseUrl}${master.photo_url}`) : undefined}
                                alt={master.name}
                                fallback={master.name.charAt(0)}
                            />
                            <div>
                                <h3 className="font-semibold">{master.name}</h3>
                                {master.role && (
                                    <p className="text-sm text-muted-foreground">{master.role}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredMasters.length === 0 && (
                <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>К сожалению, для этой услуги сейчас нет доступных мастеров.</p>
                </div>
            )}
        </div>
    );
};
