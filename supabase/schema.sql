-- =========================================
-- PT 트레이너 앱 - Supabase Schema
-- Supabase SQL Editor에서 실행하세요
-- =========================================

-- UUID 확장 활성화
create extension if not exists "uuid-ossp";

-- ==================
-- 테이블 생성
-- ==================

-- 프로필 (auth.users 확장)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text,
  phone       text,
  remaining_sessions int not null default 0,
  is_admin    boolean not null default false,
  last_active_at timestamptz,
  admin_note   text,
  coach_feedback text,
  created_at  timestamptz not null default now()
);

alter table public.profiles
  add column if not exists coach_feedback text;

-- 시간 슬롯
create table if not exists public.time_slots (
  id           uuid default uuid_generate_v4() primary key,
  slot_time    timestamptz not null,
  max_capacity int not null default 1,
  week_start   date not null,
  created_at   timestamptz not null default now()
);

-- 예약
create table if not exists public.bookings (
  id          uuid default uuid_generate_v4() primary key,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  slot_id     uuid not null references public.time_slots(id) on delete cascade,
  status      text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  attendance_status text not null default 'pending' check (attendance_status in ('pending', 'attended', 'no_show')),
  attendance_checked_at timestamptz,
  attendance_checked_by uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (member_id, slot_id, status)  -- 같은 슬롯 중복 예약 방지
);

-- 공지사항
create table if not exists public.notices (
  id         uuid default uuid_generate_v4() primary key,
  title      text not null,
  content    text not null,
  is_pinned  boolean not null default false,
  created_at timestamptz not null default now()
);

-- 예약/취소 정책 (단일 행)
create table if not exists public.booking_policies (
  id             int primary key default 1,
  booking_hours  int not null default 5,
  cancel_hours   int not null default 5,
  updated_at     timestamptz not null default now(),
  constraint booking_policies_singleton check (id = 1)
);

insert into public.booking_policies (id, booking_hours, cancel_hours)
values (1, 5, 5)
on conflict (id) do nothing;

-- ==================
-- 인덱스
-- ==================
create index if not exists idx_time_slots_week_start on public.time_slots(week_start);
create index if not exists idx_time_slots_slot_time on public.time_slots(slot_time);
create index if not exists idx_bookings_member_id on public.bookings(member_id);
create index if not exists idx_bookings_slot_id on public.bookings(slot_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_notices_is_pinned on public.notices(is_pinned);

-- ==================
-- Row Level Security
-- ==================
alter table public.profiles  enable row level security;
alter table public.time_slots enable row level security;
alter table public.bookings  enable row level security;
alter table public.notices   enable row level security;
alter table public.booking_policies enable row level security;

-- profiles: 자신의 프로필 조회/수정
create policy "users_select_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users_update_own_profile"
  on public.profiles for update
  using (auth.uid() = id);

-- profiles: 관리자는 모든 프로필 접근 가능
create policy "admin_all_profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- time_slots: 로그인한 사용자 누구나 조회 가능
create policy "authenticated_select_slots"
  on public.time_slots for select
  to authenticated
  using (true);

-- time_slots: 관리자만 생성/수정/삭제
create policy "admin_manage_slots"
  on public.time_slots for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- bookings: 자신의 예약 조회/생성/수정
create policy "users_select_own_bookings"
  on public.bookings for select
  using (auth.uid() = member_id);

create policy "users_insert_own_bookings"
  on public.bookings for insert
  with check (auth.uid() = member_id);

create policy "users_update_own_bookings"
  on public.bookings for update
  using (auth.uid() = member_id);

-- bookings: 관리자는 모든 예약 접근 가능
create policy "admin_all_bookings"
  on public.bookings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- notices: 로그인한 사용자 누구나 조회 가능
create policy "authenticated_select_notices"
  on public.notices for select
  using (true);

-- notices: 관리자만 관리
create policy "admin_manage_notices"
  on public.notices for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- booking_policies: 로그인한 사용자 조회 가능
create policy "authenticated_select_booking_policies"
  on public.booking_policies for select
  to authenticated
  using (true);

-- booking_policies: 관리자만 관리
create policy "admin_manage_booking_policies"
  on public.booking_policies for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ==================
-- 트리거: 신규 가입 시 프로필 자동 생성
-- ==================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g'), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================
-- 트리거: 시간 슬롯 삭제 시 잔여 횟수 복구
-- =========================================

create or replace function public.handle_time_slot_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 삭제되는 슬롯에 확정 예약이 있으면 예약자 잔여 횟수 복구
  update public.profiles p
  set remaining_sessions = p.remaining_sessions + b.cnt
  from (
    select member_id, count(*) as cnt
    from public.bookings
    where slot_id = old.id
      and status = 'confirmed'
    group by member_id
  ) b
  where p.id = b.member_id;

  return old;
end;
$$;

drop trigger if exists on_time_slot_delete on public.time_slots;
create trigger on_time_slot_delete
  before delete on public.time_slots
  for each row execute procedure public.handle_time_slot_delete();

-- =========================================
-- 예약/횟수 처리 함수
-- =========================================

create or replace function public.book_slot(p_slot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_remaining int;
  v_booking_hours int;
  v_slot_time timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select slot_time into v_slot_time
  from public.time_slots
  where id = p_slot_id;

  if v_slot_time is null then
    raise exception 'slot not found';
  end if;

  select booking_hours into v_booking_hours
  from public.booking_policies
  where id = 1;

  if v_booking_hours is null then
    v_booking_hours := 5;
  end if;

  if now() > v_slot_time - (v_booking_hours * interval '1 hour') then
    raise exception '예약 가능 시간이 지났습니다.';
  end if;

  select remaining_sessions into v_remaining
  from public.profiles
  where id = v_user;

  if v_remaining is null then
    raise exception 'profile not found';
  end if;

  if v_remaining <= 0 then
    raise exception 'not enough sessions';
  end if;

  insert into public.bookings (member_id, slot_id, status)
  values (v_user, p_slot_id, 'confirmed');

  update public.profiles
  set remaining_sessions = remaining_sessions - 1
  where id = v_user;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_is_admin boolean;
  v_member uuid;
  v_slot uuid;
  v_status text;
  v_cancel_hours int;
  v_slot_time timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select is_admin into v_is_admin
  from public.profiles
  where id = v_user;

  select member_id, slot_id, status into v_member, v_slot, v_status
  from public.bookings
  where id = p_booking_id
  for update;

  if v_member is null then
    raise exception 'booking not found';
  end if;

  if v_user <> v_member and coalesce(v_is_admin, false) = false then
    raise exception 'not allowed';
  end if;

  if v_status <> 'confirmed' then
    return;
  end if;

  select cancel_hours into v_cancel_hours
  from public.booking_policies
  where id = 1;

  if v_cancel_hours is null then
    v_cancel_hours := 5;
  end if;

  select slot_time into v_slot_time
  from public.time_slots
  where id = v_slot;

  if v_slot_time is null then
    raise exception 'slot not found';
  end if;

  if now() > v_slot_time - (v_cancel_hours * interval '1 hour') then
    raise exception '취소 가능 시간이 지났습니다.';
  end if;

  -- 동일 슬롯에 이미 취소된 기록이 있으면 제거 (unique 제약 회피)
  delete from public.bookings
  where member_id = v_member
    and slot_id = v_slot
    and status = 'cancelled';

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  update public.profiles
  set remaining_sessions = remaining_sessions + 1
  where id = v_member;
end;
$$;

grant execute on function public.book_slot(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- ==================
-- 관리자 계정 설정
-- ※ 트레이너 이메일로 첫 로그인 후 아래 쿼리 실행
-- UPDATE public.profiles SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ==================

-- 샘플 공지사항
insert into public.notices (title, content, is_pinned) values
  ('PT 센터에 오신 것을 환영합니다! 🏋️', '예약 시스템을 통해 간편하게 PT 시간을 예약하세요. 예약/취소 정책은 예약 화면 상단에서 확인할 수 있습니다.', true),
  ('이번 주 스케줄 안내', '이번 주 시간표가 업데이트되었습니다. 원하는 시간대를 빠르게 예약하세요!', false);
