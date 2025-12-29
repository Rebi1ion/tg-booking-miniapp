import React, { useEffect, useState } from 'react';
import type { Service } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, X, Check, Scissors } from 'lucide-react';

import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

export const ServicesManagement = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        duration_minutes: 60,
        price: 0,
        category: '',
        image_url: ''
    });

    const fetchServices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/services`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setServices(data || []);
        } catch (error) {
            console.error("Failed to fetch services:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const resetForm = () => {
        setFormData({ name: '', description: '', duration_minutes: 60, price: 0, category: '', image_url: '' });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setFormData({
            name: service.name,
            description: service.description || '',
            duration_minutes: service.duration_minutes,
            price: service.price,
            category: service.category || '',
            image_url: service.image_url || ''
        });
    };

    const handleSave = async () => {
        if (!formData.name.trim() || formData.price <= 0) return;

        const serviceData = {
            name: formData.name,
            description: formData.description || null,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            category: formData.category || null,
            image_url: formData.image_url || null,
            is_active: true
        };

        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/services/${editingId}` : `${API_URL}/services`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(serviceData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save service');
            }

            resetForm();
            fetchServices();
        } catch (error: any) {
            console.error("Error saving service:", error);
            alert(`Ошибка при сохранении услуги: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить эту услугу?')) return;

        try {
            const response = await fetch(`${API_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete service');
            }
            fetchServices();
        } catch (error: any) {
            console.error("Error deleting service:", error);
            alert(`Ошибка при удалении: ${error.message}`);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`${API_URL}/services/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update status');
            }
            fetchServices();
        } catch (error: any) {
            console.error("Error toggling active status:", error);
            alert(`Ошибка при изменении статуса: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8" />
            </div>
        );
    }

    // Group services by category
    const groupedServices = services.reduce((acc, service) => {
        const cat = service.category || 'Без категории';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
        return acc;
    }, {} as Record<string, Service[]>);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Услуги ({services.length})</h2>
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
                            placeholder="Название услуги *"
                            value={formData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            placeholder="Описание"
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-muted-foreground">Цена (₽) *</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Цена"
                                    value={formData.price === 0 ? '' : formData.price}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, price: val ? parseInt(val) : 0 });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Длительность (мин)</label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Минуты"
                                    value={formData.duration_minutes === 0 ? '' : formData.duration_minutes}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, duration_minutes: val ? parseInt(val) : 0 });
                                    }}
                                />
                            </div>
                        </div>
                        <Input
                            placeholder="Категория (например: Стрижки, Маникюр)"
                            value={formData.category}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
                        />
                        <Input
                            placeholder="URL изображения"
                            value={formData.image_url}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, image_url: e.target.value })}
                        />

                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSave} disabled={!formData.name.trim() || formData.price <= 0}>
                                <Check className="h-4 w-4 mr-1" /> Сохранить
                            </Button>
                            <Button size="sm" variant="outline" onClick={resetForm}>
                                <X className="h-4 w-4 mr-1" /> Отмена
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Services List grouped by category */}
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
                    <div className="space-y-2">
                        {categoryServices.map(service => (
                            <Card key={service.id} className={`${editingId === service.id ? 'opacity-50' : ''} ${!service.is_active ? 'opacity-60 border-dashed' : ''}`}>
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{service.name}</h3>
                                                {!service.is_active && (
                                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">скрыта</span>
                                                )}
                                            </div>
                                            {service.description && (
                                                <p className="text-sm text-muted-foreground">{service.description}</p>
                                            )}
                                            <div className="flex gap-4 mt-1 text-sm">
                                                <span className="font-medium">{service.price} ₽</span>
                                                <span className="text-muted-foreground">{service.duration_minutes} мин</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => toggleActive(service.id, service.is_active ?? true)}
                                                title={service.is_active ? 'Скрыть' : 'Показать'}
                                            >
                                                {service.is_active ? '👁' : '👁‍🗨'}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(service.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}

            {services.length === 0 && !isAdding && (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <Scissors className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Нет услуг</p>
                        <Button size="sm" variant="outline" className="mt-4" onClick={() => setIsAdding(true)}>
                            Добавить первую услугу
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
