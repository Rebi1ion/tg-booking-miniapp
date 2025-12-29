-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  telegram_id bigint unique not null,
  first_name text,
  last_name text,
  username text,
  photo_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MASTERS TABLE
create table public.masters (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  photo_url text,
  role text, -- e.g. "Top Barber", "Stylist"
  bio text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SERVICES TABLE
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  duration_minutes integer not null, -- e.g. 60
  price integer not null, -- e.g. 1500 (in rubles)
  image_url text,
  category text, -- e.g. "Hair", "Nails"
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BOOKINGS TABLE
create table public.bookings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete set null,
  master_id uuid references public.masters(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null, -- Calculate based on duration
  status text check (status in ('pending', 'paid', 'cancelled', 'completed')) default 'pending',
  payment_id text, -- From payment provider
  client_phone text,
  client_name text, -- Fallback if user is null
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Simple setup for demo)
alter table public.users enable row level security;
alter table public.masters enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;

-- Public read access for services and masters
create policy "Allow public read services" on public.services for select using (true);
create policy "Allow public read masters" on public.masters for select using (true);

-- Users can read their own bookings
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = id); 
-- Note: In TMA context, we might need a custom auth flow or just trust the client for simple demos, 
-- but ideally we use Supabase Auth with Telegram. 
-- For this demo, we will allow public insert but restricts read/update to admin or owner.
-- Actually, for "White-Label" simple demo, we might make bookings publicly readable or just by ID?
-- Let's allow public insert for bookings.
create policy "Allow public insert bookings" on public.bookings for insert with check (true);

-- USERS Table
create policy "Allow public insert users" on public.users for insert with check (true);
create policy "Allow public read users" on public.users for select using (true);

-- Allow update and delete for bookings (admin functionality)
create policy "Allow public update bookings" on public.bookings for update using (true);
create policy "Allow public delete bookings" on public.bookings for delete using (true);

-- MASTER_SERVICES TABLE (many-to-many relationship)
create table public.master_services (
  id uuid default uuid_generate_v4() primary key,
  master_id uuid references public.masters(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  unique(master_id, service_id)
);

-- RLS for master_services
alter table public.master_services enable row level security;
create policy "Allow public read master_services" on public.master_services for select using (true);
create policy "Allow public insert master_services" on public.master_services for insert with check (true);
create policy "Allow public update master_services" on public.master_services for update using (true);
create policy "Allow public delete master_services" on public.master_services for delete using (true);

-- Admin CRUD policies for masters and services
create policy "Allow public insert masters" on public.masters for insert with check (true);
create policy "Allow public update masters" on public.masters for update using (true);
create policy "Allow public delete masters" on public.masters for delete using (true);

create policy "Allow public insert services" on public.services for insert with check (true);
create policy "Allow public update services" on public.services for update using (true);
create policy "Allow public delete services" on public.services for delete using (true);
