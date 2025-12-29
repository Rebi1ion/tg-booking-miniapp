import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XCircle } from 'lucide-react';
import { MasterTodaySchedule } from './MasterTodaySchedule';
import { MasterAllBookings } from './MasterAllBookings';

interface MasterDashboardProps {
    masterId: string;
    masterName?: string;
}

export const MasterDashboard = ({ masterId, masterName }: MasterDashboardProps) => {
    if (!masterId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <XCircle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Ошибка</h1>
                <p className="text-muted-foreground">Не удалось определить мастера.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 min-h-screen pb-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Мои записи</h1>
                {masterName && (
                    <p className="text-muted-foreground">{masterName}</p>
                )}
            </div>

            <Tabs defaultValue="today">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="today">Сегодня</TabsTrigger>
                    <TabsTrigger value="calendar">Календарь</TabsTrigger>
                </TabsList>

                <TabsContent value="today">
                    <MasterTodaySchedule masterId={masterId} />
                </TabsContent>

                <TabsContent value="calendar">
                    <MasterAllBookings masterId={masterId} />
                </TabsContent>
            </Tabs>
        </div>
    );
};
