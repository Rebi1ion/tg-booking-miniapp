import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { shopConfig } from '@/config/shopConfig';
import { Star, ChevronLeft, ChevronRight, Search, Flame } from 'lucide-react';

export const ServiceSelection = () => {
    const {
        services,
        setService,
        selectedService,
        user,
        activeCategory,
        setActiveCategory,
        activeHall,
        setActiveHall,
        activeSubcategory,
        setActiveSubcategory
    } = useAppStore();

    // Refs for scroll container
    const tabsRef = useRef<HTMLDivElement>(null);
    const subTabsRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [showSubLeftArrow, setShowSubLeftArrow] = useState(false);
    const [showSubRightArrow, setShowSubRightArrow] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoPromotions, setAutoPromotions] = useState<any[]>([]);

    // Fetch auto-apply promotions
    useEffect(() => {
        // Optimization: Don't re-fetch if already loaded (unless user changed significantly)
        if (autoPromotions.length > 0) return;

        const fetchPromotions = async () => {
            try {
                const query = user?.id ? `?user_id=${user.id}` : '';
                const res = await fetch(`${shopConfig.apiUrl}/promotions/auto-active${query}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const data = await res.json();
                setAutoPromotions(data || []);
            } catch (error) {
                console.error('Failed to fetch promotions:', error);
            }
        };
        fetchPromotions();
    }, [user?.id]); // Keeping dependency but added length check guard

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

    // Reset category when hall changes (but keep 'recommended' and 'promotions' valid)
    useEffect(() => {
        if (activeCategory && activeCategory !== 'recommended' && activeCategory !== 'promotions') {
            // Check if current category exists in filtered categories
            const hallServices = activeHall
                ? services.filter((s: any) => s.hall === activeHall)
                : services;
            const hallCategories = [...new Set(hallServices.map((s: any) => s.category || 'Другое'))];
            if (!hallCategories.includes(activeCategory)) {
                setActiveCategory('recommended');
            }
        }
    }, [activeHall, services, activeCategory]);

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

    // Subcategory scroll functions
    const checkSubScrollArrows = () => {
        if (subTabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = subTabsRef.current;
            setShowSubLeftArrow(scrollLeft > 0);
            setShowSubRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
        }
    };

    const scrollSubTabs = (direction: 'left' | 'right') => {
        if (subTabsRef.current) {
            const scrollAmount = 150;
            subTabsRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkSubScrollArrows, 300);
        }
    };

    useEffect(() => {
        checkSubScrollArrows();
    }, [subcategoriesForCategory]);

    // Get services with active promotions and calculate discounts - BEFORE displayServices
    const { promoServicesWithDiscount, promoMap } = useMemo(() => {
        if (autoPromotions.length === 0) return { promoServicesWithDiscount: [], promoMap: new Map() };

        const promoServices: { service: any; originalPrice: number; discountedPrice: number; discount: number; discountType: string }[] = [];
        const promoInfoMap = new Map<string, { originalPrice: number; discountedPrice: number; discount: number; discountType: string }>();

        services.forEach((service: any) => {
            let bestDiscount = 0;
            let bestDiscountType = 'percent';
            let bestDiscountValue = 0;
            let bestPromoId = '';
            let bestPromoName = '';

            autoPromotions.forEach((promo: any) => {
                let applies = false;

                if (promo.applies_to_type === 'all' || !promo.applies_to_type) {
                    applies = true;
                } else if (promo.applies_to_type === 'services' && promo.applies_to) {
                    const serviceIds = promo.applies_to.split(',').map((s: string) => s.trim());
                    applies = serviceIds.includes(service.id);
                } else if (promo.applies_to_type === 'categories' && promo.applies_to) {
                    const cats = promo.applies_to.split(',').map((s: string) => s.trim());
                    applies = cats.includes(service.category);
                }

                if (applies) {
                    let discount = 0;
                    if (promo.discount_type === 'percent') {
                        discount = (service.price * promo.discount_value) / 100;
                    } else {
                        discount = promo.discount_value;
                    }

                    if (discount > bestDiscount) {
                        bestDiscount = discount;
                        bestDiscountType = promo.discount_type;
                        bestDiscountValue = promo.discount_value;
                        bestPromoId = promo.id;
                        bestPromoName = promo.name;
                    }
                }
            });

            if (bestDiscount > 0) {
                const promoInfo = {
                    originalPrice: service.price,
                    discountedPrice: Math.round(service.price - bestDiscount),
                    discount: bestDiscountValue,
                    discountType: bestDiscountType,
                    id: bestPromoId,
                    name: bestPromoName
                };
                promoServices.push({ service, ...promoInfo });
                promoInfoMap.set(service.id, promoInfo);
            }
        });

        return { promoServicesWithDiscount: promoServices, promoMap: promoInfoMap };
    }, [services, autoPromotions]);

    // Get services to display based on active category, hall, and subcategory
    const displayServices = useMemo(() => {
        let list: any[] = [];

        if (activeCategory === 'recommended') {
            list = recommendedServices;
        } else if (activeCategory === 'promotions') {
            // Return promo services (no hall filter for promotions tab)
            return promoServicesWithDiscount.map(p => ({
                ...p.service,
                _promoInfo: {
                    originalPrice: p.originalPrice,
                    discountedPrice: p.discountedPrice,
                    discount: p.discount,
                    discountType: p.discountType
                }
            }));
        } else {
            list = activeCategory ? (groupedServices[activeCategory] || []) : [];
        }

        // For recommended tab - don't apply hall filter
        if (activeCategory !== 'recommended' && activeHall) {
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
            const uniqueServices = Array.from(new Map(allServicesList.map((s: any) => [s.id, s])).values());

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

            // Add promo info to filtered services
            return filtered.map((s: any) => {
                const promoInfo = promoMap.get(s.id);
                return promoInfo ? { ...s, _promoInfo: promoInfo } : s;
            });
        }

        // Add promo info to all services in the list
        return list.map((s: any) => {
            const promoInfo = promoMap.get(s.id);
            return promoInfo ? { ...s, _promoInfo: promoInfo } : s;
        });
    }, [activeCategory, activeHall, activeSubcategory, recommendedServices, groupedServices, searchQuery, promoServicesWithDiscount, promoMap]);



    // All tabs - always include "Ваш выбор" first, then "Акции" if promotions exist, filter by activeHall
    const allTabs = useMemo(() => {
        const tabs: { key: string; label: string; icon?: React.ReactNode }[] = [];

        // Always show "Ваш выбор" tab first
        tabs.push({
            key: 'recommended',
            label: 'Ваш выбор',
            icon: <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        });

        // Show "Акции" tab if there are promo services
        if (promoServicesWithDiscount.length > 0) {
            tabs.push({
                key: 'promotions',
                label: 'Акции',
                icon: <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
            });
        }

        // Filter categories by activeHall
        let filteredCategories = categories;
        if (activeHall) {
            const hallServices = services.filter((s: any) => s.hall === activeHall);
            const hallCategories = [...new Set(hallServices.map((s: any) => s.category || 'Другое'))] as string[];
            filteredCategories = categories.filter(cat => hallCategories.includes(cat));
        }

        filteredCategories.forEach(cat => {
            tabs.push({ key: cat, label: cat });
        });

        return tabs;
    }, [categories, activeHall, services, promoServicesWithDiscount]);

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
                <div className="relative">
                    {/* Left scroll arrow */}
                    {showSubLeftArrow && (
                        <button
                            onClick={() => scrollSubTabs('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-background via-background to-transparent pr-4 h-full flex items-center"
                        >
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}

                    <div
                        ref={subTabsRef}
                        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
                        onScroll={checkSubScrollArrows}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <button
                            onClick={() => setActiveSubcategory(null)}
                            className={cn(
                                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
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
                                    "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                                    activeSubcategory === sub
                                        ? "bg-accent text-accent-foreground"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>

                    {/* Right scroll arrow */}
                    {showSubRightArrow && (
                        <button
                            onClick={() => scrollSubTabs('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-background via-background to-transparent pl-4 h-full flex items-center"
                        >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                                    {service._promoInfo ? (
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-sm text-muted-foreground line-through">
                                                {service._promoInfo.originalPrice} ₽
                                            </span>
                                            <span className="font-bold text-lg text-green-600">
                                                {service._promoInfo.discountedPrice} ₽
                                            </span>
                                            <Badge variant="destructive" className="text-xs">
                                                -{service._promoInfo.discount}{service._promoInfo.discountType === 'percent' ? '%' : ' ₽'}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-lg">{service.price} ₽</span>
                                    )}
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
