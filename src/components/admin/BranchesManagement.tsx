import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { shopConfig } from '@/config/shopConfig';
import { Plus, Pencil, Trash2, MapPin, Clock, Phone, Users, Scissors, Settings2 } from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    start_hour: number;
    end_hour: number;
    is_active: boolean;
    created_at: string;
    masters?: {
        master: {
            id: string;
            name: string;
            services?: { service_id: string }[];
        }
    }[];
    services?: { service: { id: string; name: string } }[];
}

interface Master {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
}

export function BranchesManagement() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [allMasters, setAllMasters] = useState<Master[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [configuringBranch, setConfiguringBranch] = useState<Branch | null>(null);
    const [selectedMasters, setSelectedMasters] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        start_hour: '10',
        end_hour: '20',
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [branchesRes, mastersRes, servicesRes] = await Promise.all([
                fetch(`${shopConfig.apiUrl}/branches/all`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                fetch(`${shopConfig.apiUrl}/masters`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                fetch(`${shopConfig.apiUrl}/services`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            ]);
            const [branchesData, mastersData, servicesData] = await Promise.all([
                branchesRes.json(),
                mastersRes.json(),
                servicesRes.json()
            ]);
            setBranches(branchesData);
            setAllMasters(mastersData);
            setAllServices(servicesData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingBranch
                ? `${shopConfig.apiUrl}/branches/${editingBranch.id}`
                : `${shopConfig.apiUrl}/branches`;

            const payload = {
                ...formData,
                start_hour: formData.start_hour === '' ? 0 : parseInt(formData.start_hour),
                end_hour: formData.end_hour === '' ? 23 : parseInt(formData.end_hour)
            };

            await fetch(url, {
                method: editingBranch ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify(payload)
            });

            resetForm();
            fetchData();
        } catch (error) {
            console.error('Failed to save branch:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить филиал?')) return;
        try {
            await fetch(`${shopConfig.apiUrl}/branches/${id}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            fetchData();
        } catch (error) {
            console.error('Failed to delete branch:', error);
        }
    };

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            start_hour: branch.start_hour.toString(),
            end_hour: branch.end_hour.toString(),
            is_active: branch.is_active
        });
        setIsCreating(true);
    };

    const handleConfigure = (branch: Branch) => {
        setConfiguringBranch(branch);
        setSelectedMasters(branch.masters?.map(m => m.master.id) || []);
    };

    const handleMasterToggle = async (masterId: string) => {
        if (!configuringBranch) return;
        const isSelected = selectedMasters.includes(masterId);

        try {
            if (isSelected) {
                await fetch(`${shopConfig.apiUrl}/branches/${configuringBranch.id}/masters/${masterId}`, {
                    method: 'DELETE',
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                setSelectedMasters(prev => prev.filter(id => id !== masterId));
            } else {
                await fetch(`${shopConfig.apiUrl}/branches/${configuringBranch.id}/masters`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                    body: JSON.stringify({ master_id: masterId })
                });
                setSelectedMasters(prev => [...prev, masterId]);
            }
        } catch (error) {
            console.error('Failed to toggle master:', error);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', address: '', phone: '', start_hour: '10', end_hour: '20', is_active: true });
        setEditingBranch(null);
        setIsCreating(false);
    };

    if (loading) {
        return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    // Configuration Mode
    if (configuringBranch) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Настройка: {configuringBranch.name}</h2>
                    <Button variant="outline" onClick={() => { setConfiguringBranch(null); fetchData(); }}>
                        Готово
                    </Button>
                </div>

                {/* Masters Assignment */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5" /> Мастера филиала
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Выберите мастеров, работающих в этом филиале. Услуги филиала определяются автоматически на основе услуг выбранных мастеров.
                        </p>
                        <div className="space-y-2">
                            {allMasters.map(master => (
                                <label key={master.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                                    <Checkbox
                                        checked={selectedMasters.includes(master.id)}
                                        onCheckedChange={() => handleMasterToggle(master.id)}
                                    />
                                    <span>{master.name}</span>
                                </label>
                            ))}
                            {allMasters.length === 0 && (
                                <p className="text-muted-foreground text-sm">Сначала добавьте мастеров в разделе "Мастера"</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Info about services */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Scissors className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-blue-900">Услуги филиала</p>
                                <p className="text-sm text-blue-700">
                                    Услуги определяются автоматически. Назначьте мастерам услуги в разделе "Мастера", затем добавьте мастеров в филиал.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Helper to calculate unique services count from branch masters
    const getUniqueServicesCount = (branch: Branch) => {
        if (!branch.masters || branch.masters.length === 0) return 0;

        const serviceIds = new Set<string>();
        branch.masters.forEach(mb => {
            if (mb.master.services) {
                mb.master.services.forEach((ms: any) => {
                    serviceIds.add(ms.service_id);
                });
            }
        });

        return serviceIds.size;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Филиалы
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
                            {editingBranch ? 'Редактировать' : 'Новый филиал'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Название</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="col-span-2">
                                    <Label>Адрес</Label>
                                    <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <Label>Телефон</Label>
                                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Начало работы</Label>
                                    <Input type="number" min="0" max="23" value={formData.start_hour} onChange={(e) => setFormData({ ...formData, start_hour: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Конец работы</Label>
                                    <Input type="number" min="0" max="24" value={formData.end_hour} onChange={(e) => setFormData({ ...formData, end_hour: e.target.value })} />
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                                    <Label>Активен</Label>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={resetForm}>Отмена</Button>
                                <Button type="submit">{editingBranch ? 'Сохранить' : 'Создать'}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Branches List */}
            {branches.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Филиалы не созданы</CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {branches.map((branch) => (
                        <Card key={branch.id}>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold">{branch.name}</span>
                                            <Badge className={branch.is_active ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}>
                                                {branch.is_active ? 'Активен' : 'Неактивен'}
                                            </Badge>
                                        </div>
                                        {branch.address && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                                                <MapPin className="w-3 h-3" />{branch.address}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                                            {branch.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{branch.phone}</span>}
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{branch.start_hour}:00 — {branch.end_hour}:00</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />{branch.masters?.length || 0} мастеров</Badge>
                                            <Badge variant="secondary"><Scissors className="w-3 h-3 mr-1" />{getUniqueServicesCount(branch)} услуг</Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => handleConfigure(branch)} title="Настроить мастеров и услуги">
                                            <Settings2 className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleEdit(branch)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(branch.id)}>
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
