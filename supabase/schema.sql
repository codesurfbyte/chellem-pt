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
  created_at  timestamptz not null default now()
);

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

-- ==================
-- 트리거: 신규 가입 시 프로필 자동 생성
-- ==================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==================
-- 관리자 계정 설정
-- ※ 트레이너 이메일로 첫 로그인 후 아래 쿼리 실행
-- UPDATE public.profiles SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
-- ==================

-- 샘플 공지사항
insert into public.notices (title, content, is_pinned) values
  ('PT 센터에 오신 것을 환영합니다! 🏋️', '예약 시스템을 통해 간편하게 PT 시간을 예약하세요. 예약은 희망 시간 1시간 전까지 가능합니다.', true),
  ('이번 주 스케줄 안내', '이번 주 시간표가 업데이트되었습니다. 원하는 시간대를 빠르게 예약하세요!', false);
