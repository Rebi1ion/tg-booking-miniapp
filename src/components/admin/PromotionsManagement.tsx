import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { shopConfig } from '@/config/shopConfig';
import { Plus, Pencil, Trash2, Tag, Percent, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Promotion {
    id: string;
    name: string;
    description?: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    promo_code?: string;
    start_date?: string;
    end_date?: string;
    is_active: boolean;
    applies_to?: string;
    max_uses_per_user: number;
    max_total_uses?: number;
    created_at: string;
}

export function PromotionsManagement() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discount_type: 'percent' as 'percent' | 'fixed',
        discount_value: 10,
        promo_code: '',
        start_date: '',
        end_date: '',
        is_active: true,
        applies_to: 'all',
        max_uses_per_user: 1,
        max_total_uses: '' as string | number
    });

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const res = await fetch(`${shopConfig.apiUrl}/promotions`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            setPromotions(data);
        } catch (error) {
            console.error('Failed to fetch promotions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingPromotion
                ? `${shopConfig.apiUrl}/promotions/${editingPromotion.id}`
                : `${shopConfig.apiUrl}/promotions`;

            const method = editingPromotion ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    ...formData,
                    promo_code: formData.promo_code.toUpperCase() || null
                })
            });

            resetForm();
            fetchPromotions();
        } catch (error) {
            console.error('Failed to save promotion:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить акцию?')) return;
        try {
            await fetch(`${shopConfig.apiUrl}/promotions/${id}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            fetchPromotions();
        } catch (error) {
            console.error('Failed to delete promotion:', error);
        }
    };

    const handleEdit = (promotion: Promotion) => {
        setEditingPromotion(promotion);
        setFormData({
            name: promotion.name,
            description: promotion.description || '',
            discount_type: promotion.discount_type,
            discount_value: promotion.discount_value,
            promo_code: promotion.promo_code || '',
            start_date: promotion.start_date ? promotion.start_date.split('T')[0] : '',
            end_date: promotion.end_date ? promotion.end_date.split('T')[0] : '',
            is_active: promotion.is_active,
            applies_to: promotion.applies_to || 'all',
            max_uses_per_user: promotion.max_uses_per_user || 1,
            max_total_uses: promotion.max_total_uses || ''
        });
        setIsCreating(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            discount_type: 'percent',
            discount_value: 10,
            promo_code: '',
            start_date: '',
            end_date: '',
            is_active: true,
            applies_to: 'all',
            max_uses_per_user: 1,
            max_total_uses: ''
        });
        setEditingPromotion(null);
        setIsCreating(false);
    };

    const formatDiscount = (promotion: Promotion) => {
        if (promotion.discount_type === 'percent') {
            return `-${promotion.discount_value}%`;
        }
        return `-${promotion.discount_value} ₽`;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Акции и промокоды
                </h2>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} size="sm">
                        <Plus className="w-4 h-4 mr-1" /> Добавить
                    </Button>
                )}
            </div>

            {/* Create/Edit Form */}
            {isCreating && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {editingPromotion ? 'Редактировать акцию' : 'Новая акция'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Название</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Скидка на стрижку"
                                        required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <Label>Описание</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Описание акции"
                                    />
                                </div>

                                <div>
                                    <Label>Тип скидки</Label>
                                    <select
                                        className="w-full h-10 px-3 rounded-md border bg-background"
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                                    >
                                        <option value="percent">Процент (%)</option>
                                        <option value="fixed">Сумма (₽)</option>
                                    </select>
                                </div>

                                <div>
                                    <Label>Размер скидки</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.discount_value || ''}
                                        onChange={(e) => setFormData({ ...formData, discount_value: e.target.value === '' ? 0 : parseInt(e.target.value) })} required
                                    />
                                </div>

                                <div className="col-span-2">
                                    <Label>Промокод (необязательно)</Label>
                                    <Input
                                        value={formData.promo_code}
                                        onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                                        placeholder="SALE20"
                                    />
                                </div>

                                <div>
                                    <Label>Дата начала</Label>
                                    <Input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <Label>Дата окончания</Label>
                                    <Input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>

                                {!formData.promo_code && (formData.start_date || formData.end_date) && (
                                    <div className="col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            💡 Без промокода скидка автоматически применится к записям на даты в указанном диапазоне
                                        </p>
                                    </div>
                                )}

                                <div className="col-span-2 flex items-center gap-2">
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <Label>Активна</Label>
                                </div>

                                <div>
                                    <Label className="text-sm">На клиента</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.max_uses_per_user}
                                        onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Раз на 1 человека</p>
                                </div>

                                <div>
                                    <Label className="text-sm">Всего</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="∞"
                                        value={formData.max_total_uses}
                                        onChange={(e) => setFormData({ ...formData, max_total_uses: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Первые N человек</p>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Отмена
                                </Button>
                                <Button type="submit">
                                    {editingPromotion ? 'Сохранить' : 'Создать'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Promotions List */}
            {promotions.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Акции не созданы
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {promotions.map((promotion) => (
                        <Card key={promotion.id}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold">{promotion.name}</span>
                                            <Badge className={promotion.is_active ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}>
                                                {promotion.is_active ? 'Активна' : 'Неактивна'}
                                            </Badge>
                                        </div>

                                        {promotion.description && (
                                            <p className="text-sm text-muted-foreground mb-2">{promotion.description}</p>
                                        )}

                                        <div className="flex flex-wrap gap-2 text-sm">
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Percent className="w-3 h-3" />
                                                {formatDiscount(promotion)}
                                            </Badge>

                                            {promotion.promo_code && (
                                                <Badge variant="outline" className="flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {promotion.promo_code}
                                                </Badge>
                                            )}
                                        </div>

                                        {(promotion.start_date || promotion.end_date) && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {promotion.start_date && `С ${format(new Date(promotion.start_date), 'd MMM', { locale: ru })}`}
                                                {promotion.start_date && promotion.end_date && ' — '}
                                                {promotion.end_date && `до ${format(new Date(promotion.end_date), 'd MMM', { locale: ru })}`}
                                            </p>
                                        )}

                                        {promotion.max_uses_per_user > 1 && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Макс. {promotion.max_uses_per_user} исп. на клиента
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEdit(promotion)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() => handleDelete(promotion.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
