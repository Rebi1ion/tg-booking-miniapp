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
    services?: Service[];
    branch_id?: string;
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
    custom_price?: number;
    branch_id?: string;
    branch?: Branch;
}

export interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    is_active: boolean;
}

export interface PromoUsage {
    id: string;
    promotion_id: string;
    user_id: string;
    used_at: string;
}

export interface Promotion {
    id: string;
    name: string;
    description?: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    promo_code?: string;
    start_date?: string;
    end_date?: string;
    is_active: boolean;
    applies_to_type: 'all' | 'specific';
    applies_to?: string; // Comma-separated service IDs
    max_uses_per_user: number;
    max_total_uses?: number;
    current_uses: number;
    // New fields
    is_auto_apply: boolean;
    valid_days?: string; // "1,2,3,4,5" (Mon-Fri)
    time_start?: string;
    time_end?: string;
    notify_clients: boolean;
    notification_message?: string;
    branch_id?: string;
    branch?: Branch;
}
