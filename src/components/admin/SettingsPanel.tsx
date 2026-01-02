import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Ban, X, Gift, MessageSquare, Save } from 'lucide-react';
import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

interface Settings {
    id: string;
    birthday_enabled: boolean;
    birthday_discount: number;
    birthday_message: string;
    birthday_promo_days: number;
    require_prepayment: boolean;
    banned_users: string;
    msg_booking_confirmed: string;
    msg_reminder_24h: string;
    msg_reminder_2h: string;
    msg_payment_success: string;
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

    const saveAllSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(settings)
            });
            if (!res.ok) throw new Error('Failed to save settings');
        } catch (error) {
            console.error('Failed to save settings:', error);
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
            {/* Payment Settings */}
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

            {/* Birthday Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Скидки ко дню рождения
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="birthday_enabled" className="text-base font-medium">
                                Включить скидки
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Автоматически отправлять промокод на день рождения
                            </p>
                        </div>
                        <Switch
                            id="birthday_enabled"
                            checked={settings?.birthday_enabled ?? true}
                            onCheckedChange={(checked) => updateSetting('birthday_enabled', checked)}
                            disabled={saving}
                        />
                    </div>

                    {settings?.birthday_enabled && (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="birthday_discount">Размер скидки (%)</Label>
                                    <Input
                                        id="birthday_discount"
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={settings?.birthday_discount || 10}
                                        onChange={(e) => setSettings(s => s ? { ...s, birthday_discount: parseInt(e.target.value) || 10 } : s)}
                                        onBlur={() => updateSetting('birthday_discount', settings?.birthday_discount)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthday_promo_days">Срок действия (дней)</Label>
                                    <Input
                                        id="birthday_promo_days"
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={settings?.birthday_promo_days || 7}
                                        onChange={(e) => setSettings(s => s ? { ...s, birthday_promo_days: parseInt(e.target.value) || 7 } : s)}
                                        onBlur={() => updateSetting('birthday_promo_days', settings?.birthday_promo_days)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthday_message">Текст поздравления</Label>
                                <textarea
                                    id="birthday_message"
                                    className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm resize-none"
                                    value={settings?.birthday_message || ''}
                                    onChange={(e) => setSettings(s => s ? { ...s, birthday_message: e.target.value } : s)}
                                    onBlur={() => updateSetting('birthday_message', settings?.birthday_message)}
                                    placeholder="Используйте {discount} для подстановки размера скидки"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Переменные: {'{discount}'} — размер скидки, {'{name}'} — имя клиента
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Message Templates */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Шаблоны сообщений
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Variable explanation block */}
                    <div className="bg-muted/50 rounded-lg p-3 border text-xs">
                        <p className="font-medium mb-2">📝 Доступные переменные:</p>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono">{'{name}'}</code>
                                <span className="text-muted-foreground">Имя клиента</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono">{'{date}'}</code>
                                <span className="text-muted-foreground">Дата записи</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono">{'{time}'}</code>
                                <span className="text-muted-foreground">Время записи</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono">{'{service}'}</code>
                                <span className="text-muted-foreground">Услуга</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono">{'{master}'}</code>
                                <span className="text-muted-foreground">Мастер</span>
                            </div>
                            <div className="flex justify-between">
                                <code className="bg-primary/10 px-1.5 py-0.5 rounded font-mono">{'{price}'}</code>
                                <span className="text-muted-foreground">Цена</span>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-2 text-[11px]">
                            Вставьте переменную в шаблон — она заменится на реальные данные.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Подтверждение записи</Label>
                        <textarea
                            className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm resize-none"
                            value={settings?.msg_booking_confirmed || ''}
                            onChange={(e) => setSettings(s => s ? { ...s, msg_booking_confirmed: e.target.value } : s)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Напоминание (за 24 часа)</Label>
                        <textarea
                            className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm resize-none"
                            value={settings?.msg_reminder_24h || ''}
                            onChange={(e) => setSettings(s => s ? { ...s, msg_reminder_24h: e.target.value } : s)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Напоминание (за 2 часа)</Label>
                        <textarea
                            className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm resize-none"
                            value={settings?.msg_reminder_2h || ''}
                            onChange={(e) => setSettings(s => s ? { ...s, msg_reminder_2h: e.target.value } : s)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Успешная оплата</Label>
                        <textarea
                            className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm resize-none"
                            value={settings?.msg_payment_success || ''}
                            onChange={(e) => setSettings(s => s ? { ...s, msg_payment_success: e.target.value } : s)}
                        />
                    </div>

                    <Button onClick={saveAllSettings} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Сохранить шаблоны
                    </Button>
                </CardContent>
            </Card>

            {/* Ban Users */}
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
