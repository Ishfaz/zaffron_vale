-- Zaffron Valley — Supabase table setup
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Schema derived from netlify/functions/*.js so column names match the code exactly.

-- ---------------------------------------------------------------- leads
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null,
  phone         text,
  dates         text,
  travellers    text,
  budget        text,
  interests     jsonb       default '[]'::jsonb,
  message       text,
  source        text        default 'contact_form',  -- contact_form | direct_booking
  status        text        default 'new',           -- new | contacted | booked | closed
                                                     -- read by admin.html: badge(r.status)
                                                     -- and .eq('status','new') for the stat card
  created_at    timestamptz not null default now()
);

create index if not exists leads_email_idx      on public.leads (email);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid references public.leads (id) on delete set null,
  item_type           text        default 'experience',   -- experience | package
  item_name           text        not null,
  guests              integer     default 1,
  travel_dates        text,
  total_amount        integer     not null,               -- PAISE (INR x 100)
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  razorpay_signature  text,                              -- written by verify-payment.js
  status              text        default 'pending',      -- pending | paid | failed | refunded
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists bookings_order_idx   on public.bookings (razorpay_order_id);
create index if not exists bookings_payment_idx on public.bookings (razorpay_payment_id);
create index if not exists bookings_status_idx  on public.bookings (status);

-- ------------------------------------------------------------- payments
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings (id) on delete cascade,
  razorpay_payment_id text unique not null,   -- upsert onConflict target
  razorpay_order_id   text,
  razorpay_signature  text,                   -- written by verify-payment.js
  amount              integer     not null,   -- PAISE
  method              text        default 'unknown',
  status              text        not null,   -- captured | failed
  webhook_event       text,
  webhook_payload     jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);

-- --------------------------------------------------- row level security
-- The Netlify Functions use the SERVICE ROLE key, which bypasses RLS.
-- So we enable RLS and add NO public policies: the browser (anon key) can
-- never read customer data even though the anon key is visible in admin.html.
alter table public.leads    enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

-- This is already handled correctly — do NOT add public policies.
--
-- The admin dashboard reads through netlify/functions/get-admin-data.js, which
-- checks ADMIN_PASSWORD server-side and queries with the service role key. The
-- browser never holds a database key, so RLS with no policies is exactly right.
--
-- If you are ever tempted to add `for select to anon using (true)` to make the
-- dashboard "work": don't. That would let anyone on the internet read every
-- customer's name, email and phone number straight from the browser.

-- ------------------------------------------------- updated_at auto-touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();
