import { create } from 'zustand';
import type { User, Service, Master, Booking } from '@/types';
import { shopConfig } from '../config/shopConfig';
import { addMinutes, format, isSameDay, parseISO } from 'date-fns';

const API_URL = shopConfig.apiUrl;

interface MasterService {
    master_id: string;
    service_id: string;
}

interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    start_hour: number;
    end_hour: number;
}

interface AppState {
    // User Session
    user: User | null;
    isAdmin: boolean;
    isMaster: boolean;
    masterInfo: Master | null;
    setUser: (user: User) => void;
    checkIsAdmin: (telegramId: number) => boolean;
    checkIsMaster: (telegramId: number) => Promise<Master | null>;
    setMasterInfo: (master: Master | null) => void;

    // Booking Flow State
    currentStep: number;
    selectedBranch: Branch | null;
    selectedService: Service | null;
    selectedMaster: Master | null;
    selectedDate: Date | null;
    selectedTimeSlot: string | null;

    // Availability
    occupiedSlots: string[]; // List of start times or slot keys that are taken
    isCheckingAvailability: boolean;

    // Data Cache
    services: Service[];
    masters: Master[];
    masterServices: MasterService[];
    userBookings: Booking[];

    // Actions
    setBranch: (branch: Branch | null) => Promise<void>;
    setService: (service: Service | null) => void;
    setMaster: (master: Master | null) => void;
    setDate: (date: Date | null) => void;
    setTimeSlot: (time: string | null) => void;

    nextStep: () => void;
    prevStep: () => void;
    resetBooking: () => void;
    jumpToStep: (step: number) => void;

    // Async Actions
    loadInitialData: (userId?: string) => Promise<void>;
    checkAvailability: (date: Date) => Promise<void>;
    submitBooking: (customPrice?: number, promoId?: string) => Promise<{ success: boolean; error?: string }>;
    upsertUser: (telegramUser: { id: number; first_name: string; username?: string }) => Promise<User | null>;
    fetchUserBookings: () => Promise<void>;

    // Helpers
    formatPrice: (price: number) => string;
}


export const useAppStore = create<AppState>((set, get) => ({
    user: null,
    isAdmin: false,
    isMaster: false,
    masterInfo: null,
    setUser: (user: User) => {
        const isAdmin = get().checkIsAdmin(user.telegram_id);
        set({ user, isAdmin });
    },
    checkIsAdmin: (telegramId: number) => {
        return shopConfig.adminIds.includes(telegramId);
    },
    checkIsMaster: async (telegramId: number) => {
        try {
            const response = await fetch(`${API_URL}/masters/by-telegram/${telegramId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (response.ok) {
                const master = await response.json();
                set({ isMaster: true, masterInfo: master });
                return master;
            }
            set({ isMaster: false, masterInfo: null });
            return null;
        } catch (error) {
            console.error('Failed to check master status:', error);
            set({ isMaster: false, masterInfo: null });
            return null;
        }
    },
    setMasterInfo: (master: any) => {
        set({ isMaster: !!master, masterInfo: master });
    },

    currentStep: 1,
    selectedBranch: null,
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTimeSlot: null,
    occupiedSlots: [],
    isCheckingAvailability: false,

    services: [],
    masters: [],
    masterServices: [],
    userBookings: [],

    setBranch: async (branch) => {
        set({
            selectedBranch: branch,
            selectedService: null,
            selectedMaster: null,
            selectedDate: null,
            selectedTimeSlot: null,
            currentStep: 1
        });

        // Load branch-specific services and masters
        if (branch) {
            try {
                const [servicesRes, mastersRes] = await Promise.all([
                    fetch(`${API_URL}/branches/${branch.id}/services`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                    fetch(`${API_URL}/branches/${branch.id}/masters`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                ]);
                const services = await servicesRes.json();
                const masters = await mastersRes.json();
                set({ services, masters });
            } catch (error) {
                console.error('Failed to load branch data:', error);
            }
        }
    },
    setService: (service) => set({ selectedService: service, selectedMaster: null, selectedDate: null, selectedTimeSlot: null, currentStep: 2 }),
    setMaster: (master) => set({ selectedMaster: master, selectedDate: null, selectedTimeSlot: null, currentStep: 3 }),
    setDate: (date) => {
        set({ selectedDate: date, selectedTimeSlot: null });
        if (date) {
            get().checkAvailability(date);
        }
    },
    setTimeSlot: (time) => set({ selectedTimeSlot: time }),

    nextStep: () => set((state: AppState) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
    prevStep: () => set((state: AppState) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
    jumpToStep: (step: number) => set({ currentStep: step }),

    resetBooking: () => set({
        currentStep: 1,
        selectedService: null,
        selectedMaster: null,
        selectedDate: null,
        selectedTimeSlot: null
    }),

    loadInitialData: async (userId?: string) => {
        try {
            // Use personalized endpoint if userId is provided
            const servicesUrl = userId
                ? `${API_URL}/services/personalized/${userId}`
                : `${API_URL}/services`;

            const [servicesRes, mastersRes] = await Promise.all([
                fetch(servicesUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                fetch(`${API_URL}/masters`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            ]);

            const services = await servicesRes.json();
            const masters = await mastersRes.json();

            // Fallback mock data if DB is empty (for demo check)
            const finalServices = (services && services.length > 0) ? services : [
                { id: '1', name: 'Men\'s Haircut', price: 1500, duration_minutes: 60, category: 'Hair', description: 'Classic haircut.' },
                { id: '2', name: 'Beard Trim', price: 800, duration_minutes: 30, category: 'Beard', description: 'Shape and trim.' }
            ];

            const finalMasters = (masters && masters.length > 0) ? masters : [
                { id: '1', name: 'Alex', role: 'Top Barber' },
                { id: '2', name: 'Dmitry', role: 'Barber' }
            ];

            set({
                services: finalServices,
                masters: finalMasters
            });
        } catch (error) {
            console.error("Failed to load initial data", error);
        }
    },

    checkAvailability: async (date: Date) => {
        const { selectedMaster, selectedService } = get();
        if (!selectedMaster) return;

        set({ isCheckingAvailability: true });

        try {
            // Fetch all bookings and filter client-side for simplicity in this local setup
            const res = await fetch(`${API_URL}/bookings`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const allBookings = await res.json();
            if (!Array.isArray(allBookings)) {
                console.error("Expected array from /api/bookings, got:", allBookings);
                set({ occupiedSlots: [], isCheckingAvailability: false });
                return;
            }

            const bookings = allBookings.filter((b: any) =>
                b.master_id === selectedMaster.id &&
                b.status !== 'cancelled' &&
                isSameDay(new Date(b.start_time), date)
            );

            // Generate dynamic slots based on master settings or shop defaults
            const startHour = selectedMaster.start_hour ?? shopConfig.bookingDefaults.startHour;
            const endHour = selectedMaster.end_hour ?? shopConfig.bookingDefaults.endHour;
            const interval = selectedMaster.slot_interval ?? shopConfig.bookingDefaults.intervalMinutes;

            const slots: string[] = [];
            for (let h = startHour; h < endHour; h++) {
                for (let m = 0; m < 60; m += interval) {
                    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
            }

            const occupied: string[] = [];
            const serviceDuration = selectedService?.duration_minutes || 60;

            bookings.forEach((booking: any) => {
                const bookingStart = parseISO(booking.start_time);
                const bookingEnd = booking.end_time ? parseISO(booking.end_time) : addMinutes(bookingStart, 60);

                slots.forEach(slot => {
                    const [hours, minutes] = slot.split(':').map(Number);
                    const slotStart = new Date(date);
                    slotStart.setHours(hours, minutes, 0, 0);
                    const slotEnd = addMinutes(slotStart, serviceDuration);

                    if (slotStart < bookingEnd && slotEnd > bookingStart) {
                        if (!occupied.includes(slot)) {
                            occupied.push(slot);
                        }
                    }
                });
            });

            set({ occupiedSlots: occupied });
        } catch (error) {
            console.error("Failed to check availability:", error);
            set({ occupiedSlots: [] });
        } finally {
            set({ isCheckingAvailability: false });
        }
    },

    submitBooking: async (customPrice?: number, promoId?: string) => {
        const { selectedService, selectedMaster, selectedDate, selectedTimeSlot, user } = get();
        if (!selectedService || !selectedMaster || !selectedDate || !selectedTimeSlot) {
            return { success: false, error: "Incomplete selection" };
        }

        try {
            // Calculate timestamps
            const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
            const startTime = new Date(selectedDate);
            startTime.setHours(hours, minutes, 0, 0);

            const endTime = addMinutes(startTime, selectedService.duration_minutes);

            // Create booking with pending status if payment enabled
            // Invoice will be sent to user via Telegram
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    user_id: user?.id,
                    service_id: selectedService.id,
                    master_id: selectedMaster.id,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'pending', // Will be updated to 'paid' after successful payment
                    payment_id: null,
                    client_phone: 'N/A',
                    client_name: user?.first_name || 'Anonymous',
                    send_invoice: shopConfig.payment.enabled, // Send payment invoice to user
                    custom_price: customPrice, // Discounted price if promo applied
                    promo_id: promoId // Promo ID if applied
                })
            });

            if (!response.ok) throw new Error('Failed to create booking');

            if (shopConfig.payment.enabled) {
                return {
                    success: true,
                    error: undefined
                };
            }

            return { success: true };
        } catch (err: any) {
            console.error("Booking failed", err);
            return { success: false, error: err.message || "Unknown error" };
        }
    },

    upsertUser: async (telegramUser) => {
        const { setUser } = get();
        try {
            const response = await fetch(`${API_URL}/users/upsert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    telegram_id: telegramUser.id,
                    first_name: telegramUser.first_name,
                    username: telegramUser.username
                })
            });

            if (!response.ok) throw new Error('Upsert failed');

            const userData = await response.json();
            setUser(userData);
            return userData;
        } catch (err) {
            console.error("upsertUser failed:", err);
            return null;
        }
    },

    fetchUserBookings: async () => {
        const { user } = get();
        if (!user || !user.telegram_id) return;

        try {
            const res = await fetch(`${API_URL}/bookings/user/${user.telegram_id}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            set({ userBookings: data });
        } catch (error) {
            console.error("Failed to fetch user bookings", error);
        }
    },

    formatPrice: (price: number) => {
        return `${price.toLocaleString('ru-RU')} ${shopConfig.currency === 'RUB' ? '₽' : shopConfig.currency}`;
    }
}));
