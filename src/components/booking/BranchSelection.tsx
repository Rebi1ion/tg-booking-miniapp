import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

import { MapPin, Clock, Phone, ChevronRight, Building2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { shopConfig } from '@/config/shopConfig';

const API_URL = shopConfig.apiUrl;

interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    start_hour: number;
    end_hour: number;
}

interface BranchSelectionProps {
    onBranchSelected?: () => void;
}

export function BranchSelection({ onBranchSelected }: BranchSelectionProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { selectedBranch, setBranch, user } = useAppStore();

    // Flag to prevent preferred branch from being auto-restored after user clears
    const userClearedBranchRef = useRef(false);

    // Auto-select if only one branch
    useEffect(() => {
        if (branches.length === 1 && !selectedBranch && !userClearedBranchRef.current) {
            handleSelectBranch(branches[0]);
        }
    }, [branches, selectedBranch]);

    // Try to restore user's preferred branch (only on initial load, not after user clears)
    useEffect(() => {
        if (userClearedBranchRef.current) {
            return;
        }
        if (user?.preferred_branch_id && branches.length > 0 && !selectedBranch) {
            const preferred = branches.find(b => b.id === user.preferred_branch_id);
            if (preferred) {
                setBranch(preferred);
            }
        }
    }, [user?.preferred_branch_id, branches, selectedBranch]);

    // Auto-retry fetch effect
    useEffect(() => {
        let mounted = true;
        let attempt = 0;
        const maxAttempts = 3;

        const attemptFetch = async () => {
            if (!mounted) return;
            try {
                // Only set loading on first attempt to avoid flicker
                if (attempt === 0) setLoading(true);

                const res = await fetch(`${API_URL}/branches`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });

                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`);
                }

                const data = await res.json();
                if (mounted) {
                    setBranches(data);
                    setLoading(false);
                    setError(null);
                }
            } catch (err: any) {
                console.error(`Fetch branches attempt ${attempt + 1} failed:`, err);
                if (attempt < maxAttempts - 1) {
                    attempt++;
                    setTimeout(attemptFetch, 1000 * (attempt + 1)); // Exponential backoff: 1s, 2s, 3s
                } else {
                    if (mounted) {
                        setError(err.message || 'Сбой загрузки');
                        setLoading(false);
                    }
                }
            }
        };

        attemptFetch();

        return () => { mounted = false; };
    }, []);

    const manualRetry = () => {
        setError(null);
        setLoading(true);
        // Quick manual retry reuse
        const fetchOnce = async () => {
            try {
                const res = await fetch(`${API_URL}/branches`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                setBranches(data);
                setError(null);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOnce();
    };

    const handleSelectBranch = async (branch: Branch) => {
        // Reset the cleared flag when user selects a branch
        userClearedBranchRef.current = false;
        setBranch(branch);

        // Save preferred branch to user profile
        if (user?.id) {
            try {
                await fetch(`${API_URL}/users/${user.id}/preferred-branch`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    },
                    body: JSON.stringify({ branch_id: branch.id })
                });
            } catch (e) {
                console.error('Failed to save preferred branch:', e);
            }
        }

        onBranchSelected?.();
    };

    const handleClearBranch = () => {
        // Set flag to prevent auto-restoration of preferred branch
        userClearedBranchRef.current = true;
        setBranch(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // If no branches exist or fetch failed, show retry
    if (branches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="bg-muted rounded-full p-4 mb-4">
                    {error ? <AlertCircle className="w-8 h-8 text-destructive" /> : <Building2 className="w-8 h-8 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                    {error ? 'Ошибка загрузки' : 'Филиалы не найдены'}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-[280px] text-sm">
                    {error ? 'Большое количество запросов к серверу. Пожалуйста, подождите минуту и повторите попытку.' : 'Не удалось загрузить список филиалов. Проверьте соединение.'}
                </p>
                <Button onClick={manualRetry}>
                    Повторить загрузку
                </Button>
            </div>
        );
    }

    // If branch already selected, show compact view to change it
    if (selectedBranch) {
        return (
            <Card className="mb-4 border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-medium">{selectedBranch.name}</span>
                    </div>
                    {selectedBranch.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 ml-6 mb-1">
                            <MapPin className="w-3 h-3" />
                            {selectedBranch.address}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2 ml-6 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedBranch.start_hour}:00 — {selectedBranch.end_hour}:00
                        </span>
                        {selectedBranch.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {selectedBranch.phone}
                            </span>
                        )}
                    </div>
                    {branches.length > 1 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={handleClearBranch}
                        >
                            Изменить филиал
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h2 className="text-xl font-bold mb-1">Выберите филиал</h2>
                <p className="text-sm text-muted-foreground">
                    Выбор филиала определит доступных мастеров и услуги
                </p>
            </div>

            <div className="space-y-3">
                {branches.map((branch) => (
                    <Card
                        key={branch.id}
                        className="cursor-pointer transition-all hover:border-primary hover:shadow-md active:scale-[0.99]"
                        onClick={() => handleSelectBranch(branch)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        <span className="font-semibold text-lg">{branch.name}</span>
                                    </div>

                                    {branch.address && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                                            <MapPin className="w-3 h-3" />
                                            {branch.address}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <Badge variant="secondary" className="font-normal">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {branch.start_hour}:00 — {branch.end_hour}:00
                                        </Badge>
                                        {branch.phone && (
                                            <Badge variant="secondary" className="font-normal">
                                                <Phone className="w-3 h-3 mr-1" />
                                                {branch.phone}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
