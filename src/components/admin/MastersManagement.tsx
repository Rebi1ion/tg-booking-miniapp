import React, { useEffect, useState } from 'react';
import type { Master, Service } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, X, Check, User } from 'lucide-react';

import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

interface MasterWithServices extends Master {
    services?: { id: string; name: string }[];
}

export const MastersManagement = () => {
    const [masters, setMasters] = useState<MasterWithServices[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [serviceSearchQuery, setServiceSearchQuery] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        photo_url: '',
        bio: '',
        start_hour: '10',
        end_hour: '20',
        slot_interval: '30',
        telegram_id: '',
        work_days: '1,2,3,4,5,6,7', // Default to all days
        selectedServices: [] as string[]
    });

    const fetchMasters = async () => {
        setLoading(true);
        try {
            const [mastersRes, servicesRes] = await Promise.all([
                fetch(`${API_URL}/masters`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                fetch(`${API_URL}/services`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            ]);

            const mastersData = await mastersRes.json();
            const servicesData = await servicesRes.json();

            setMasters(mastersData || []);
            setAllServices(servicesData || []);
        } catch (error) {
            console.error("Failed to fetch masters", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMasters();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            role: '',
            photo_url: '',
            bio: '',
            start_hour: '10',
            end_hour: '20',
            slot_interval: '30',
            telegram_id: '',
            work_days: '1,2,3,4,5,6,7',
            selectedServices: []
        });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = async (master: MasterWithServices) => {
        setEditingId(master.id);
        setFormData({
            name: master.name,
            role: master.role || '',
            photo_url: master.photo_url || '',
            bio: master.bio || '',
            start_hour: (master.start_hour ?? 10).toString(),
            end_hour: (master.end_hour ?? 20).toString(),
            slot_interval: (master.slot_interval ?? 30).toString(),
            telegram_id: (master as any).telegram_id?.toString() || '',
            work_days: (master as any).work_days || '1,2,3,4,5,6,7',
            selectedServices: master.services?.map(s => s.id) || []
        });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return;

        // Validation for hours and interval
        const start = Math.max(0, Math.min(23, parseInt(formData.start_hour) || 0));
        const end = Math.max(1, Math.min(24, parseInt(formData.end_hour) || 0));
        const interval = Math.max(5, Math.min(120, parseInt(formData.slot_interval) || 30));

        if (start >= end) {
            alert('Время начала должно быть меньше времени окончания');
            return;
        }

        const masterData = {
            name: formData.name,
            role: formData.role || null,
            photo_url: formData.photo_url || null,
            bio: formData.bio || null,
            start_hour: start,
            end_hour: end,
            slot_interval: interval,
            work_days: formData.work_days,
            serviceIds: formData.selectedServices
        };

        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/masters/${editingId}` : `${API_URL}/masters`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(masterData)
            });

            if (!response.ok) throw new Error('Failed to save master');

            const savedMaster = await response.json();

            // Если указан telegram_id, привязываем его отдельно
            if (formData.telegram_id.trim()) {
                await fetch(`${API_URL}/masters/${savedMaster.id || editingId}/link-telegram`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({ telegram_id: formData.telegram_id.trim() })
                });
            } else if (editingId) {
                // Если поле очищено, удаляем привязку
                await fetch(`${API_URL}/masters/${editingId}/link-telegram`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({ telegram_id: null })
                });
            }

            resetForm();
            fetchMasters();
        } catch (err: any) {
            console.error('Error saving master:', err);
            alert(`Ошибка при сохранении: ${err.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить этого мастера?')) return;
        try {
            const response = await fetch(`${API_URL}/masters/${id}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete master');
            }
            fetchMasters();
        } catch (error: any) {
            console.error("Failed to delete master", error);
            alert(`Ошибка при удалении: ${error.message}`);
        }
    };

    const toggleDay = (dayId: string) => {
        const currentDays = formData.work_days ? formData.work_days.split(',') : [];
        const newDays = currentDays.includes(dayId)
            ? currentDays.filter(d => d !== dayId)
            : [...currentDays, dayId];
        setFormData({ ...formData, work_days: newDays.join(',') });
    };

    const toggleService = (serviceId: string) => {
        setFormData((prev: any) => ({
            ...prev,
            selectedServices: prev.selectedServices.includes(serviceId)
                ? prev.selectedServices.filter((id: string) => id !== serviceId)
                : [...prev.selectedServices, serviceId]
        }));
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Мастера ({masters.length})</h2>
                {!isAdding && !editingId && (
                    <Button size="sm" onClick={() => setIsAdding(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Добавить
                    </Button>
                )}
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <Card className="border-primary">
                    <CardContent className="p-4 space-y-3">
                        <Input
                            placeholder="Имя мастера *"
                            value={formData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            placeholder="Должность (например: Топ-стилист)"
                            value={formData.role}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, role: e.target.value })}
                        />
                        <Input
                            placeholder="URL фото"
                            value={formData.photo_url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, photo_url: e.target.value })}
                        />
                        <Input
                            placeholder="Описание / биография"
                            value={formData.bio}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bio: e.target.value })}
                        />
                        <div>
                            <label className="text-[10px] text-muted-foreground uppercase font-bold">Telegram ID (для доступа к панели)</label>
                            <Input
                                placeholder="Например: 123456789"
                                value={formData.telegram_id}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormData({ ...formData, telegram_id: val });
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Мастер может узнать ID командой /myid в боте
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold">Начало (ч)</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.start_hour}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, start_hour: val });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold">Конец (ч)</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.end_hour}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, end_hour: val });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold">Интервал (м)</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.slot_interval}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, slot_interval: val });
                                    }}
                                />
                            </div>
                        </div>

                        {/* Working Days */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Рабочие дни:</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '1', label: 'Пн' },
                                    { id: '2', label: 'Вт' },
                                    { id: '3', label: 'Ср' },
                                    { id: '4', label: 'Чт' },
                                    { id: '5', label: 'Пт' },
                                    { id: '6', label: 'Сб' },
                                    { id: '7', label: 'Вс' },
                                ].map(day => (
                                    <Button
                                        key={day.id}
                                        type="button"
                                        size="sm"
                                        variant={formData.work_days?.split(',').includes(day.id) ? "default" : "outline"}
                                        onClick={() => toggleDay(day.id)}
                                        className={formData.work_days?.split(',').includes(day.id) ? "bg-green-600 hover:bg-green-700" : ""}
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Услуги мастера:</p>
                            <div className="mb-2">
                                <Input
                                    placeholder="Поиск услуги..."
                                    value={serviceSearchQuery}
                                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border rounded-md">
                                {allServices
                                    .filter(s => s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                                    .map(service => (
                                        <Button
                                            key={service.id}
                                            size="sm"
                                            variant={formData.selectedServices.includes(service.id) ? "default" : "outline"}
                                            onClick={() => toggleService(service.id)}
                                            className="text-xs"
                                        >
                                            {service.name}
                                        </Button>
                                    ))}
                                {allServices.length === 0 && (
                                    <p className="text-xs text-muted-foreground p-2">Сначала добавьте услуги</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSave} disabled={!formData.name.trim()}>
                                <Check className="h-4 w-4 mr-1" /> Сохранить
                            </Button>
                            <Button size="sm" variant="outline" onClick={resetForm}>
                                <X className="h-4 w-4 mr-1" /> Отмена
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Masters List */}
            {masters.map(master => (
                <Card key={master.id} className={editingId === master.id ? 'opacity-50' : ''}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                {master.photo_url ? (
                                    <img src={master.photo_url} alt={master.name} className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                        <User className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold">{master.name}</h3>
                                    {master.role && <p className="text-sm text-muted-foreground">{master.role}</p>}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(master)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(master.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {master.services && master.services.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {master.services.map(service => (
                                    <span key={service.id} className="text-xs bg-secondary px-2 py-1 rounded">
                                        {service.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            {
                masters.length === 0 && !isAdding && (
                    <Card className="border-dashed">
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Нет мастеров</p>
                            <Button size="sm" variant="outline" className="mt-4" onClick={() => setIsAdding(true)}>
                                Добавить первого мастера
                            </Button>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
};
