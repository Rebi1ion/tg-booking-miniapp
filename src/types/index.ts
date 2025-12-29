export type BookingStatus = 'pending' | 'paid' | 'cancelled' | 'completed';

export interface User {
    id: string; // UUID from Supabase
    telegram_id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    is_admin: boolean;
    birthday?: string; // ISO date string
    preferred_branch_id?: string;
}

export interface Service {
    id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    image_url?: string;
    category?: string;
    is_active?: boolean;
}

export interface Master {
    id: string;
    name: string;
    role?: string;
    photo_url?: string;
    bio?: string;
    is_active?: boolean;
    start_hour?: number;
    end_hour?: number;
    slot_interval?: number;
}

export interface Booking {
    id: string;
    user_id: string;
    master_id: string;
    service_id: string;
    start_time: string; // ISO string
    end_time: string; // ISO string
    status: BookingStatus;
    payment_id?: string;
    client_phone?: string;
    client_name?: string;
}
