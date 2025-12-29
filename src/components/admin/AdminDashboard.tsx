import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { XCircle, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { AllBookings } from './AllBookings';
import { TodaySchedule } from './TodaySchedule';
import { MastersManagement } from './MastersManagement';
import { ServicesManagement } from './ServicesManagement';
import { PromotionsManagement } from './PromotionsManagement';
import { BranchesManagement } from './BranchesManagement';
import { AdminBookingForm } from './AdminBookingForm';
import ReportGenerator from './ReportGenerator';
import { shopConfig } from '@/config/shopConfig';

export const AdminDashboard = () => {
    const { user, checkIsAdmin } = useAppStore();
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Verify Admin Access
    if (!user || !checkIsAdmin(user.telegram_id)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <XCircle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Доступ запрещён</h1>
                <p className="text-muted-foreground">У вас нет прав для просмотра этой страницы.</p>
            </div>
        );
    }

    const handleBookingSuccess = () => {
        // Trigger refresh of booking lists
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="container mx-auto p-4 min-h-screen pb-24">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Панель администратора</h1>
            </div>

            <Tabs defaultValue="today">
                <TabsList className="grid w-full grid-cols-4 gap-1 mb-2 h-auto">
                    <TabsTrigger value="today" className="text-xs py-2">Сегодня</TabsTrigger>
                    <TabsTrigger value="calendar" className="text-xs py-2">Календарь</TabsTrigger>
                    <TabsTrigger value="masters" className="text-xs py-2">Мастера</TabsTrigger>
                    <TabsTrigger value="services" className="text-xs py-2">Услуги</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-3 gap-1 mb-6 h-auto">
                    <TabsTrigger value="branches" className="text-xs py-2">Филиалы</TabsTrigger>
                    <TabsTrigger value="promos" className="text-xs py-2">Акции</TabsTrigger>
                    <TabsTrigger value="reports" className="text-xs py-2">Отчёты</TabsTrigger>
                </TabsList>

                <TabsContent value="today">
                    <TodaySchedule key={`today-${refreshKey}`} />
                </TabsContent>

                <TabsContent value="calendar">
                    <AllBookings key={`calendar-${refreshKey}`} />
                </TabsContent>

                <TabsContent value="masters">
                    <MastersManagement />
                </TabsContent>

                <TabsContent value="services">
                    <ServicesManagement />
                </TabsContent>

                <TabsContent value="branches">
                    <BranchesManagement />
                </TabsContent>

                <TabsContent value="promos">
                    <PromotionsManagement />
                </TabsContent>

                <TabsContent value="reports">
                    <ReportGenerator apiUrl={shopConfig.apiUrl.replace('/api', '')} />
                </TabsContent>
            </Tabs>

            {/* Floating Add Booking Button */}
            <Button
                onClick={() => setShowBookingForm(true)}
                className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
                size="icon"
            >
                <Plus className="h-6 w-6" />
            </Button>

            {/* Admin Booking Form Modal */}
            {showBookingForm && (
                <AdminBookingForm
                    onClose={() => setShowBookingForm(false)}
                    onSuccess={handleBookingSuccess}
                />
            )}
        </div>
    );
};
