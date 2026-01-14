import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { shopConfig } from '@/config/shopConfig';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

export const ServiceSelection = () => {
    const { services, setService, selectedService } = useAppStore();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Separate recommended services (with order_count > 0) and group by category
    const { recommendedServices, categories, groupedServices } = useMemo(() => {
        const recommended = services.filter((s: any) => s.order_count > 0);
        const grouped = services.reduce((acc: Record<string, any[]>, service: any) => {
            const cat = service.category || 'Другое';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, any[]>);

        const cats = Object.keys(grouped).sort();

        return {
            recommendedServices: recommended,
            categories: cats,
            groupedServices: grouped
        };
    }, [services]);

    // Set initial category
    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            // If there are recommended services, show "Рекомендованные" first
            if (recommendedServices.length > 0) {
                setActiveCategory('recommended');
            } else {
                setActiveCategory(categories[0]);
            }
        }
    }, [categories, activeCategory, recommendedServices]);

    // Check scroll arrows visibility
    const checkScrollArrows = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    useEffect(() => {
        checkScrollArrows();
        window.addEventListener('resize', checkScrollArrows);
        return () => window.removeEventListener('resize', checkScrollArrows);
    }, [categories]);

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsRef.current) {
            const scrollAmount = 150;
            tabsRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScrollArrows, 300);
        }
    };

    // Get services to display based on active category
    const displayServices = useMemo(() => {
        if (activeCategory === 'recommended') {
            return recommendedServices;
        }
        return activeCategory ? (groupedServices[activeCategory] || []) : [];
    }, [activeCategory, recommendedServices, groupedServices]);

    // All tabs including "Рекомендованные" if applicable
    const allTabs = useMemo(() => {
        const tabs: { key: string; label: string; icon?: React.ReactNode }[] = [];

        if (recommendedServices.length > 0) {
            tabs.push({
                key: 'recommended',
                label: 'Для вас',
                icon: <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            });
        }

        categories.forEach(cat => {
            tabs.push({ key: cat, label: cat });
        });

        return tabs;
    }, [categories, recommendedServices]);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-center">Выберите услугу</h2>

            {/* Category Tabs with horizontal scroll */}
            {allTabs.length > 1 && (
                <div className="relative">
                    {/* Left scroll arrow */}
                    {showLeftArrow && (
                        <button
                            onClick={() => scrollTabs('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-background via-background to-transparent pr-4 h-full flex items-center"
                        >
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}

                    {/* Tabs container */}
                    <div
                        ref={tabsRef}
                        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
                        onScroll={checkScrollArrows}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {allTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveCategory(tab.key)}
                                className={cn(
                                    "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                                    activeCategory === tab.key
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Right scroll arrow */}
                    {showRightArrow && (
                        <button
                            onClick={() => scrollTabs('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-background via-background to-transparent pl-4 h-full flex items-center"
                        >
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}
                </div>
            )}

            {/* Services List */}
            <div className="grid grid-cols-1 gap-3">
                {displayServices.map((service: any) => (
                    <Card
                        key={service.id}
                        className={cn(
                            "cursor-pointer transition-all hover:scale-[1.02] border-2",
                            selectedService?.id === service.id ? "border-primary" : "border-transparent"
                        )}
                        onClick={() => setService(service)}
                    >
                        <CardHeader className="p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CardTitle className="text-lg">{service.name}</CardTitle>
                                        {service.order_count > 0 && activeCategory !== 'recommended' && (
                                            <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                                                Ваш выбор ⭐
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{service.duration_minutes} мин</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-lg">{service.price} {shopConfig.currency}</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}

                {displayServices.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        Нет услуг в этой категории
                    </div>
                )}
            </div>
        </div>
    );
};
