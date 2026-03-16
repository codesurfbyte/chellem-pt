# PT 트레이너 예약 시스템

Next.js 14 + Supabase 기반 PT 회원 예약 관리 앱. Vercel 무료 배포 가능.

## 기능

- **회원**: 주간 시간표 조회, 시간대 예약/취소, 내 예약 확인
- **관리자**: 시간 슬롯 일괄 생성/삭제, 회원 정보 관리, 공지사항 CRUD
- **인증**: 이메일 매직 링크 (비밀번호 불필요)
- **공지**: 홈 화면 공지사항 (상단 고정 기능 포함)

---

## 🚀 배포 가이드

### 1단계: Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 회원가입 → 새 프로젝트 생성
2. **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣기 → Run
3. **Project Settings → API** 에서 아래 두 값을 복사
   - `Project URL`
   - `anon public` 키

### 2단계: Supabase Auth 설정

1. **Authentication → URL Configuration**
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`
2. **Authentication → Email Templates** (선택)
   - Magic Link 이메일 텍스트 한국어로 변경 가능

### 3단계: Vercel 배포

```bash
# 1. GitHub에 이 저장소 push
git init && git add . && git commit -m "init"
git remote add origin https://github.com/your-name/pt-trainer.git
git push -u origin main

# 2. vercel.com → Import Project → GitHub 저장소 선택
# 3. Environment Variables 설정:
```

Vercel 대시보드 → Settings → Environment Variables에 추가:

| 변수명 | 값 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_ADMIN_EMAIL` | 트레이너 이메일 (관리자) |
| `NEXT_PUBLIC_APP_URL` | https://your-app.vercel.app |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | Kakao JavaScript 키 |

### 4단계: 관리자 계정 설정

트레이너 이메일로 앱에 로그인한 뒤, Supabase SQL Editor에서 실행:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-trainer@email.com'
);
```

### 5단계: Supabase 무료티어 비활성 방지 (선택)

[cron-job.org](https://cron-job.org) 에서 무료 계정 생성 후:
- URL: `https://your-app.vercel.app/api/health`
- 주기: 5일마다

---

## 💻 로컬 개발

```bash
# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일에 Supabase 정보 입력

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```

---

## 🧩 변경 요청 템플릿

기능 추가/삭제 요청은 아래 템플릿을 복사해 사용:

- `docs/change-request-template.md`

---

## 📁 프로젝트 구조

```
pt-trainer/
├── app/
│   ├── page.tsx              # 홈 (공지사항)
│   ├── login/page.tsx        # 로그인 (Magic Link)
│   ├── book/page.tsx         # 주간 예약
│   ├── my/page.tsx           # 내 예약
│   ├── admin/page.tsx        # 관리자 대시보드
│   └── auth/callback/        # 인증 콜백
├── components/
│   ├── NavBar.tsx
│   ├── WeeklyCalendar.tsx    # 예약 캘린더
│   ├── CancelBookingButton.tsx
│   └── admin/
│       ├── AdminTabs.tsx
│       ├── SlotManager.tsx   # 시간 슬롯 관리
│       ├── MemberManager.tsx # 회원 관리
│       └── NoticeManager.tsx # 공지 관리
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # 브라우저 클라이언트
│   │   └── server.ts         # 서버 클라이언트
│   ├── types.ts
│   └── utils.ts
├── middleware.ts              # 인증 미들웨어
└── supabase/
    └── schema.sql            # DB 스키마 + RLS
```

---

## 📦 사용 기술

| 기술 | 용도 |
|------|------|
| Next.js 14 (App Router) | 프레임워크 |
| Supabase | DB + Auth + API |
| Tailwind CSS | 스타일링 |
| date-fns | 날짜 처리 |
| Vercel | 호스팅 (무료) |

---

## 💡 회원에게 링크 공유하기

배포 후 아래 URL을 카카오톡 등으로 공유:

```
https://your-app.vercel.app/book
```

회원이 링크 클릭 → 이메일 입력 → 매직 링크 수신 → 자동 로그인 → 예약 페이지로 이동

---

## 🔧 Supabase 무료 티어 한도

| 항목 | 한도 | 30명 앱 예상 사용량 |
|------|------|---------------------|
| DB 용량 | 500MB | < 1MB |
| Auth MAU | 50,000명 | 30명 |
| API 요청 | 무제한 | - |
| Edge Functions | 500,000회/월 | - |

**7일 미접속 시 프로젝트 일시 정지** → `/api/health` cron으로 해결
