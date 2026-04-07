# Chellem PT — Design System

Stripe Billing Plans 페이지를 레퍼런스로 한 디자인 시스템입니다.

---

## 1. 색상 토큰 (Color Tokens)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `brand` | `#635BFF` | 주요 액션, 링크, 포커스 링 |
| `brand-dark` | `#4F46E5` | 버튼 hover 상태 |
| `brand-light` | `#EEF2FF` | 뱃지 배경, 소프트 강조 |
| `brand-soft` | `#F5F4FF` | 섹션 배경 강조 |
| `ink` | `#0A2540` | 제목, 주요 텍스트 |
| `body` | `#425466` | 본문 텍스트 |
| `slate` | `#697386` | 부제, 메타 텍스트 |
| `surface` | `#FFFFFF` | 카드 배경 |
| `page` | `#F6F9FC` | 페이지 배경 |
| `mist` | `#E3E8EE` | 보더, 구분선 |
| `mist-dark` | `#C1C9D2` | hover 보더 |
| `success` | `#00A96E` | 성공 상태 |
| `accent` | `#00D4FF` | 하이라이트 (Hero 영역) |

### Tailwind 사용법

```tsx
// 텍스트
<p className="text-ink">제목</p>
<p className="text-body">본문</p>
<p className="text-slate">메타</p>

// 배경
<div className="bg-page">페이지 배경</div>
<div className="bg-surface">카드 배경</div>
<div className="bg-brand">브랜드 배경</div>
```

---

## 2. 타이포그래피 (Typography)

- **폰트**: Inter (Google Fonts) — 영문/숫자, Spoqa Han Sans Neo — 한글 fallback
- **최소 폰트 사이즈**: 12px (`text-xs`) — 11px 이하 사용 금지

| 클래스 | 크기 | 용도 |
|--------|------|------|
| `text-xs` | 12px | 메타, 뱃지, 레이블 |
| `text-sm` | 14px | 본문, 버튼 |
| `text-base` | 16px | 소제목 |
| `text-lg` | 18px | |
| `text-2xl` | 24px | 섹션 제목 |
| `text-4xl` | 36px | 페이지 제목 |
| `text-5xl` | 48px | Hero 제목 |

### CSS 유틸리티 클래스

```css
.eyebrow     /* text-xs font-semibold tracking-[0.1em] uppercase text-brand */
.page-title  /* text-4xl font-bold text-ink tracking-[-0.02em] */
```

사용 예시:
```tsx
<p className="eyebrow">Exercise</p>
<h1 className="page-title mt-2">운동 영상</h1>
```

---

## 3. 그림자 (Shadows)

| 토큰 | 적용 상태 |
|------|----------|
| `shadow-card` | 기본 카드 (`0 2px 5px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.06)`) |
| `shadow-card-hover` | 카드 hover (`0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)`) |

---

## 4. 테두리 반경 (Border Radius)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `rounded-badge` | `6px` | 뱃지 |
| `rounded-card` | `8px` | 카드 |
| `rounded-pill` | `9999px` | 완전한 원형 |

---

## 5. 컴포넌트 (Components)

### Card

```tsx
<div className="card">...</div>
/* bg-surface rounded-card shadow-card */
```

**Card Header Band** 패턴 (Stripe 스타일):
```tsx
<div className="card overflow-hidden">
  <div className="bg-page border-b border-mist px-4 py-2.5">
    <p className="text-xs font-semibold text-slate uppercase tracking-[0.07em]">섹션 제목</p>
  </div>
  <div className="p-5">...</div>
</div>
```

### 버튼

```tsx
// Primary
<button className="btn-primary">예약하기</button>
/* bg-brand text-white font-semibold px-4 py-2 rounded-md text-sm hover:bg-brand-dark */

// Secondary
<button className="btn-secondary">취소</button>
/* bg-surface text-body font-medium px-4 py-2 rounded-md text-sm border border-mist hover:bg-page */
```

### 뱃지 (Badge)

파스텔 단색 배경 + 동일 계열 더 진한 텍스트, 보더 없음.

```tsx
<span className="badge-available">가능</span>   /* bg-cyan-100 text-cyan-700 */
<span className="badge-booked">예약됨</span>    /* bg-violet-100 text-violet-700 */
<span className="badge-full">마감</span>        /* bg-gray-100 text-gray-500 */
```

공통 스타일: `text-xs px-2 py-0.5 rounded-badge font-medium`

### PolicyBanner

```tsx
<div className="flex items-center gap-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3">
  <svg className="h-4 w-4 shrink-0 text-brand" .../>
  <p className="text-sm text-ink">{message}</p>
</div>
```

---

## 6. 레이아웃 (Layout)

- 최대 너비: `max-w-5xl mx-auto px-6`
- 페이지 간격: `space-y-8` (섹션), `space-y-4` (카드 목록)
- 그리드: `grid gap-6 lg:grid-cols-[1fr_288px]` (메인 + 사이드바)

---

## 7. 네비게이션 (NavBar)

### 로고 — Stripe 스타일

```tsx
<Link href="/" className="flex items-center gap-2.5 shrink-0">
  <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0 shadow-sm">
    <span className="text-white font-bold text-l select-none">C</span>
  </div>
  <div className="leading-[1.2]">
    <span className="block font-semibold text-sm text-ink tracking-[-0.01em]">Chellem PT</span>
    <span className="block text-xs text-slate">예약 센터</span>
  </div>
</Link>
```

### 링크 스타일

- 기본: `text-slate hover:text-body hover:bg-page` (중립, 브랜드 색상 사용 안 함)
- 활성: `text-ink bg-page`

---

## 8. Hero 섹션

```tsx
<section className="relative left-1/2 right-1/2 -mx-[50vw] -mt-10 w-screen bg-ink">
  {/* 배경 이미지 */}
  <div className="absolute inset-0">
    <Image src="..." fill className="object-cover opacity-40" />
    {/* Stripe 스타일 그라디언트 오버레이 */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#0A2540]/60 via-[#0A2540]/70 to-[#0A2540]/90" />
  </div>

  {/* 컨텐츠 */}
  <div className="relative">
    <p className="eyebrow text-[#00D4FF]">PT 예약 센터</p>
    <h1 className="font-display text-5xl font-bold text-white leading-[1.08] tracking-[-0.03em]">
      루틴을 바꾸는<br />PT 예약 경험
    </h1>
  </div>

  {/* 글래스모피즘 사이드 카드 */}
  <aside className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-white">
    ...
  </aside>
</section>
```

---

## 9. WeeklyCalendar 슬롯 상태

| 상태 | 배경/보더 |
|------|----------|
| 내 예약 | `bg-brand-soft border-brand/25` |
| 예약 불가 | `bg-page border-mist` (비활성) |
| 예약 가능 | `bg-surface border-mist hover:shadow-card-hover` |

예약 버튼: `bg-brand text-white text-xs py-1.5 rounded-md font-medium hover:bg-brand-dark`

---

## 10. 전역 CSS 변수

```css
:root {
  --brand:   #635BFF;
  --ink:     #0A2540;
  --body:    #425466;
  --slate:   #697386;
  --page:    #F6F9FC;
  --surface: #FFFFFF;
  --border:  #E3E8EE;
  --success: #00A96E;
  --accent:  #00D4FF;
}
```
