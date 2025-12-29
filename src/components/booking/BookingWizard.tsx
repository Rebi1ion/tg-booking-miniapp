import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ServiceSelection } from './ServiceSelection';
import { MasterSelection } from './MasterSelection';
import { TimeSelection } from './TimeSelection';
import { BookingSummary } from './BookingSummary';
import { BranchSelection } from './BranchSelection';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BookingWizard = () => {
    const {
        currentStep,
        prevStep,
        selectedBranch,
    } = useAppStore();

    // If no branch selected yet, show branch selection first
    if (!selectedBranch) {
        return (
            <div className="container mx-auto max-w-md px-4 py-6 min-h-screen pb-20">
                <BranchSelection />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-md px-4 py-6 min-h-screen pb-20">
            {/* Branch Selection Header - allows changing branch */}
            <BranchSelection />

            {/* Header / Back Button */}
            <div className="flex items-center mb-6">
                {currentStep > 1 && (
                    <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={prevStep}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Назад
                    </Button>
                )}
                <div className="ml-auto text-sm text-muted-foreground">
                    Шаг {currentStep} из 4
                </div>
            </div>

            {/* Step Indicators */}
            <div className="flex gap-2 mb-8">
                {[1, 2, 3, 4].map((step) => (
                    <div
                        key={step}
                        className={cn(
                            "h-1 flex-1 rounded-full transition-all",
                            step <= currentStep ? "bg-primary" : "bg-secondary"
                        )}
                    />
                ))}
            </div>

            {/* Render Steps */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {currentStep === 1 && <ServiceSelection />}
                {currentStep === 2 && <MasterSelection />}
                {currentStep === 3 && <TimeSelection />}
                {currentStep === 4 && <BookingSummary />}
            </div>
        </div>
    );
};
