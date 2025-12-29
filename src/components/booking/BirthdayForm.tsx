import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { shopConfig } from '@/config/shopConfig';
import { Cake, Gift } from 'lucide-react';

interface BirthdayFormProps {
    userId: string;
    onBirthdaySet: (birthday: string) => void;
}

export function BirthdayForm({ userId, onBirthdaySet }: BirthdayFormProps) {
    const [birthday, setBirthday] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!birthday) return;

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`${shopConfig.apiUrl}/users/${userId}/birthday`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ birthday })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Ошибка при сохранении');
                return;
            }

            onBirthdaySet(birthday);
        } catch (err) {
            console.error('Failed to set birthday:', err);
            setError('Ошибка подключения');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate max date (must be at least 10 years old)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 10);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    // Min date (120 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    const minDateStr = minDate.toISOString().split('T')[0];

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Cake className="w-5 h-5 text-primary" />
                    Расскажите о вашем дне рождения
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-start gap-3 mb-4 p-3 bg-primary/10 rounded-lg">
                    <Gift className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                        Укажите дату рождения, и мы поздравим вас с праздником специальным промокодом на скидку! 🎂
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="birthday">Дата рождения</Label>
                        <Input
                            id="birthday"
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            min={minDateStr}
                            max={maxDateStr}
                            required
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            ⚠️ Дата рождения указывается один раз и не может быть изменена
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={!birthday || isSubmitting}
                    >
                        {isSubmitting ? 'Сохранение...' : 'Сохранить дату рождения'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
