import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard } from 'lucide-react';
import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

interface Settings {
    id: string;
    birthday_discount: number;
    birthday_message: string;
    birthday_promo_days: number;
    require_prepayment: boolean;
}

export const SettingsPanel = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/settings`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        if (!settings) return;

        setSaving(true);
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(newSettings)
            });
            if (!res.ok) throw new Error('Failed to save settings');
        } catch (error) {
            console.error('Failed to save settings:', error);
            // Revert on error
            setSettings(settings);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Оплата
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="prepayment" className="text-base font-medium">
                                Обязательная предоплата
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Клиент должен оплатить запись сразу при бронировании
                            </p>
                        </div>
                        <Switch
                            id="prepayment"
                            checked={settings?.require_prepayment || false}
                            onCheckedChange={(checked) => updateSetting('require_prepayment', checked)}
                            disabled={saving}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
