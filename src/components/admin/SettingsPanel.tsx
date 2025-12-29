import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Ban, X } from 'lucide-react';
import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

interface Settings {
    id: string;
    birthday_discount: number;
    birthday_message: string;
    birthday_promo_days: number;
    require_prepayment: boolean;
    banned_users: string;
}

export const SettingsPanel = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [banInput, setBanInput] = useState('');
    const [bannedUsers, setBannedUsers] = useState<string[]>([]);

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
            if (data.banned_users) {
                try {
                    setBannedUsers(JSON.parse(data.banned_users));
                } catch {
                    setBannedUsers([]);
                }
            }
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
            setSettings(settings);
        } finally {
            setSaving(false);
        }
    };

    const banUser = async () => {
        if (!banInput.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/settings/ban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ telegram_id: banInput.trim() })
            });
            if (!res.ok) throw new Error('Failed to ban user');
            const data = await res.json();
            setBannedUsers(data.banned_users || []);
            setBanInput('');
        } catch (error) {
            console.error('Failed to ban user:', error);
        } finally {
            setSaving(false);
        }
    };

    const unbanUser = async (telegramId: string) => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/settings/unban`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ telegram_id: telegramId })
            });
            if (!res.ok) throw new Error('Failed to unban user');
            const data = await res.json();
            setBannedUsers(data.banned_users || []);
        } catch (error) {
            console.error('Failed to unban user:', error);
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ban className="h-5 w-5" />
                        Блокировка пользователей
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Telegram User ID"
                            value={banInput}
                            onChange={(e) => setBanInput(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            onClick={banUser}
                            disabled={saving || !banInput.trim()}
                            variant="destructive"
                        >
                            Заблокировать
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Введите Telegram User ID пользователя для блокировки. ID отображается в списке записей.
                    </p>

                    {bannedUsers.length > 0 && (
                        <div className="space-y-2 mt-4">
                            <Label className="text-sm font-medium">Заблокированные:</Label>
                            <div className="flex flex-wrap gap-2">
                                {bannedUsers.map((id) => (
                                    <div
                                        key={id}
                                        className="flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-1 rounded-md text-sm"
                                    >
                                        <span>{id}</span>
                                        <button
                                            onClick={() => unbanUser(id)}
                                            className="hover:bg-destructive/20 rounded p-0.5"
                                            disabled={saving}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
