import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { shopConfig } from '@/config/shopConfig';
import { Star, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export const ServiceSelection = () => {
    const { services, setService, selectedService } = useAppStore();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeHall, setActiveHall] = useState<string | null>(null);
    const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Separate recommended services (with order_count > 0) and group by category
    const { recommendedServices, categories, groupedServices, halls } = useMemo(() => {
        // 1. Recommended services (with order_count > 0)
        let recommended = services.filter((s: any) => s.order_count > 0);
        // Sort recommended by name
        recommended.sort((a: any, b: any) => a.name.localeCompare(b.name));

        // 2. Group all services
        const grouped = services.reduce((acc: Record<string, any[]>, service: any) => {
            const cat = service.category || 'Другое';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, any[]>);

        // 3. Sort categories alphabetically
        const cats = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

        // 4. Sort services within each category alphabetically
        cats.forEach(cat => {
            grouped[cat].sort((a: any, b: any) => a.name.localeCompare(b.name));
        });

        // 5. Get unique halls (global subcategories)
        const uniqueHalls = [...new Set(services.map((s: any) => s.hall).filter(Boolean))] as string[];
        uniqueHalls.sort((a, b) => a.localeCompare(b));

        return {
            recommendedServices: recommended,
            categories: cats,
            groupedServices: grouped,
            halls: uniqueHalls
        };
    }, [services]);

    // Set initial category - always start with "Ваш выбор" tab
    useEffect(() => {
        if (!activeCategory) {
            setActiveCategory('recommended');
        }
    }, [activeCategory]);

    // Reset subcategory when category changes
    useEffect(() => {
        setActiveSubcategory(null);
    }, [activeCategory]);

    // Get subcategories for current category
    const subcategoriesForCategory = useMemo(() => {
        if (!activeCategory || activeCategory === 'recommended') return [];
        const categoryServices = groupedServices[activeCategory] || [];
        const subs = [...new Set(categoryServices.map((s: any) => s.subcategory).filter(Boolean))] as string[];
        subs.sort((a, b) => a.localeCompare(b));
        return subs;
    }, [activeCategory, groupedServices]);

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

    // Get services to display based on active category, hall, and subcategory
    const displayServices = useMemo(() => {
        let list = [];

        if (activeCategory === 'recommended') {
            list = recommendedServices;
        } else {
            list = activeCategory ? (groupedServices[activeCategory] || []) : [];
        }

        // Apply hall filter if selected (global)
        if (activeHall) {
            list = list.filter((s: any) => s.hall === activeHall);
        }

        // Apply subcategory filter if selected (per-category)
        if (activeSubcategory) {
            list = list.filter((s: any) => s.subcategory === activeSubcategory);
        }

        // Apply search filter if query exists
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            // Search across ALL services if user is searching
            const allServicesList = Object.values(groupedServices).flat();
            const uniqueServices = Array.from(new Map(allServicesList.map(s => [s.id, s])).values());

            let filtered = uniqueServices.filter((s: any) =>
                s.name.toLowerCase().includes(query) ||
                (s.description?.toLowerCase() || '').includes(query) ||
                (s.category?.toLowerCase() || '').includes(query) ||
                (s.subcategory?.toLowerCase() || '').includes(query)
            );

            // Apply hall filter even in search
            if (activeHall) {
                filtered = filtered.filter((s: any) => s.hall === activeHall);
            }

            return filtered;
        }

        return list;
    }, [activeCategory, activeHall, activeSubcategory, recommendedServices, groupedServices, searchQuery]);

    // All tabs - always include "Ваш выбор" first
    const allTabs = useMemo(() => {
        const tabs: { key: string; label: string; icon?: React.ReactNode }[] = [];

        // Always show "Ваш выбор" tab first
        tabs.push({
            key: 'recommended',
            label: 'Ваш выбор',
            icon: <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        });

        categories.forEach(cat => {
            tabs.push({ key: cat, label: cat });
        });

        return tabs;
    }, [categories]);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-center">Выберите услугу</h2>

            {/* Search Input */}
            <div className="relative">
                <Input
                    placeholder="Поиск услуги..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            {/* Hall Tabs (Global subcategories) - Show only if halls exist */}
            {!searchQuery && halls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <button
                        onClick={() => setActiveHall(null)}
                        className={cn(
                            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            activeHall === null
                                ? "bg-secondary text-secondary-foreground shadow-sm"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                    >
                        Все залы
                    </button>
                    {halls.map(hall => (
                        <button
                            key={hall}
                            onClick={() => setActiveHall(hall)}
                            className={cn(
                                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                activeHall === hall
                                    ? "bg-secondary text-secondary-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {hall}
                        </button>
                    ))}
                </div>
            )}

            {/* Category Tabs with horizontal scroll - Hide tabs if searching */}
            {!searchQuery && allTabs.length > 1 && (
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

            {/* Subcategory Tabs (Per-category) - Show only if subcategories exist for current category */}
            {!searchQuery && subcategoriesForCategory.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <button
                        onClick={() => setActiveSubcategory(null)}
                        className={cn(
                            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            activeSubcategory === null
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                    >
                        Все
                    </button>
                    {subcategoriesForCategory.map(sub => (
                        <button
                            key={sub}
                            onClick={() => setActiveSubcategory(sub)}
                            className={cn(
                                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                activeSubcategory === sub
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {sub}
                        </button>
                    ))}
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
                                    <span className="font-bold text-lg">{service.price} ₽</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}

                {displayServices.length === 0 && activeCategory === 'recommended' && (
                    <div className="text-center py-12 px-4">
                        <div className="text-4xl mb-4">👋</div>
                        <h3 className="text-lg font-semibold mb-2">Добро пожаловать!</h3>
                        <p className="text-muted-foreground mb-4">
                            Здесь будут отображаться услуги, которые вы бронируете чаще всего.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Выберите категорию выше, чтобы найти нужную услугу ☝️
                        </p>
                    </div>
                )}

                {displayServices.length === 0 && activeCategory !== 'recommended' && (
                    <div className="text-center text-muted-foreground py-8">
                        Нет услуг в этой категории
                    </div>
                )}
            </div>
        </div>
    );
};
