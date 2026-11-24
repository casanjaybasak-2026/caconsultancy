-- Consultation booking payments (Razorpay). Safe to run more than once.
alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists amount_paise integer,
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at timestamptz;

do $$ begin
  alter table public.appointments
    add constraint appointments_payment_status_chk
    check (payment_status in ('unpaid','pending','paid','failed'));
exception when duplicate_object then null; end $$;

create unique index if not exists appointments_rzp_order_idx
  on public.appointments (razorpay_order_id);
-- The Worker writes with the service-role key, so existing RLS policies are unchanged.
