# Frontend UI Stabilization Report

> 작성일: 2026-06-10
> 범위: 전체 frontend/ UI 품질 감사
> 방식: 4개 팀 분업 분석 (A/B/C/D)
> 자동 커밋/푸시: 안 함. 보고만.

---

## Team A — Theme / Color System Audit

### 발견

| # | 위치 | 문제 | 위험도 |
|---|------|------|--------|
| A-1 | `src/styles/theme.css` | 라이트 모드 텍스트/배경 매핑은 잘 되어 있으나, **text-white/30~20 비율**이 시각적으로 거의 안 보임 (시각적 가독성 부족) | MEDIUM |
| A-2 | `Settings.tsx`, `PatternDB.tsx` 등 85+건 | `text-white/30` 단독 사용 (theme.css 변환되지만 너무 옅음) | HIGH |
| A-3 | `Settings.tsx`, `PatternDB.tsx`, `SMSSimulator.tsx` | `bg-[#111c30]`, `bg-[#0b1120]` 등 **다크 하드코딩** | LOW (theme.css가 라이트 변환 일부 지원) |
| A-4 | `ImageAnalyzer.tsx` 3곳, `result/*.tsx` 6곳 | `bg-white dark:bg-[#111c30]` 패턴 | OK (theme.css 매핑) |
| A-5 | `Primitives.tsx` line 11 | `bg-[#111c30] border border-white/10` (Card 컴포넌트) — **다크 전용** | **HIGH** |
| A-6 | `ImageAnalyzer.tsx` 등 | `opacity-30`, `mix-blend-` 사용 | OK (의도된 디자인) |
| A-7 | `AdminPanel.tsx` 다수 | 다크 하드코딩 | OK (어드민은 다크 의도) |

### 라이트/다크 모드 매핑 현황

- ✅ `text-white/XX` → `text-gray-XXX` 자동 변환 (theme.css line 286~)
- ✅ `bg-white/XX` → `bg-black/XX` 자동 변환 (line 329~)
- ✅ 300번대 파스텔 색상 → 다크 모드 (line 336~)
- ❌ `bg-[#XXXXXX]` 하드코딩 다크 색상은 theme.css line 275~ 일부만 매핑 (Settings/PatternDB는 매핑 안 됨)

### Team A 권장 수정 (보고만, 자동 수정 안 함)

1. `text-white/30` → `text-white/50` 이상 (전체 85+건)
2. `text-white/20` → `text-white/60` 이상
3. `Primitives.tsx` Card 배경 `bg-[#111c30]` → `bg-card dark:bg-[#111c30]` (다크 전용 → 라이트 지원)
4. `Settings.tsx`, `PatternDB.tsx` 하드코딩 배경 → `bg-card dark:bg-[#111c30]`

---

## Team B — Senior Mode Audit

### 발견

| # | 위치 | 문제 | 위험도 |
|---|------|------|--------|
| B-1 | `routes.public.tsx` line 32, 47 | **`senior-home` 라우트 2번 정의** (코드 중복) | MEDIUM |
| B-2 | `SeniorContext.tsx` | 정상 (localStorage + html class 동기화) | OK |
| B-3 | `theme.css` line 247~268 | senior-mode CSS: 폰트 1.1~1.8배, line-height 1.7 | OK |
| B-4 | `SeniorHome.tsx` 자체 sticky 헤더 | **이미 제거됨** (이전 fix) | OK |
| B-5 | `SeniorBottomBar` admin 시 hide | **이미 처리됨** (이전 fix) | OK |
| B-6 | 시니어 페이지 라이트 모드 별도 존재 | **NO** (theme.css의 senior-mode만 시니어 친화) | 의도된 설계 |
| B-7 | Layout Navbar 시니어 모드 표시 | 시니어 모드에서 **공통 Navbar** 표시 (의도) | OK |
| B-8 | admin 라우트 senior 모드 자동 해제 | **이미 처리됨** (이전 fix) | OK |

### Team B 권장 수정 (보고만)

1. **`routes.public.tsx` line 47의 중복 `senior-home` 제거** (line 32만 남김)

### 시니어 페이지 라이트 모드

- **별도 라이트 시니어 페이지 없음** — theme.css의 senior-mode만 시니어 친화
- **네 의도**: 시니어 페이지 새로 만들지 말기 → **OK, 추가 작업 불필요**

---

## Team C — Layout / Navigation Audit

### 발견

| # | 위치 | 문제 | 위험도 |
|---|------|------|--------|
| C-1 | `Layout.tsx` line 291 | 헤더 `sticky top-0 z-40` | OK (최상위) |
| C-2 | `SeniorBottomBar.tsx` line 20 | `fixed bottom-0 z-30` | OK (헤더 z-40 아래) |
| C-3 | `Layout.tsx` line 269 | `seniorMode && !isAdminRoute` 일 때만 `paddingBottom: 84px` | OK |
| C-4 | Logo button (Layout.tsx line 296) | `navigate("/")` 정상 (이전 테스트 확인) | OK |
| C-5 | `routes.public.tsx` 중복 라우트 | (B-1과 동일) | MEDIUM |
| C-6 | `overflow-hidden` 다수 | 의도된 디자인 (박스/스크롤 영역) | OK |
| C-7 | `fixed inset-0` 백드롭 | 모달/드로어 (의도) | OK |

### Team C 권장 수정

- **(B-1과 동일)** `routes.public.tsx` line 47 중복 라우트 제거

### z-index 계층

| 레이어 | 클래스 | 용도 |
|--------|---------|------|
| 50 | `z-50` | 모달 오버레이 (Dialog/Sheet) |
| 40 | `z-40` | 헤더 (Layout) |
| 30 | `z-30` | 시니어 바 (SeniorBottomBar) |
| 10 | `z-10` | 내부 툴팁 등 |

**충돌 없음**. 계층 정상.

---

## Team D — Component Rendering Audit

### 발견

| # | 위치 | 문제 | 위험도 |
|---|------|------|--------|
| D-1 | `Primitives.tsx` line 11 | Card `bg-[#111c30] border-white/10` — **다크 전용**, 라이트 모드에서 어두운 박스로 보임 | **HIGH** |
| D-2 | `Settings.tsx`, `PatternDB.tsx` 등 | 박스 배경 다크 하드코딩 | MEDIUM |
| D-3 | `Primitives.tsx` line 101 | `bg-white/25 + text-white` badge (그라데이션 위) | OK (의도) |
| D-4 | `bg-black/50` 모달 backdrop | 의도된 디자인 | OK |
| D-5 | `absolute -z-10` blur | 의도된 배경 효과 | OK |
| D-6 | `bg-black/20~60` 라이트 모드 | theme.css 매핑 OK | OK |
| D-7 | `AdminPanel.tsx` 다크 박스 | 어드민은 다크 의도 | OK |

### "흰 사각형처럼 보이는 현상" 재현 시나리오

**근본 원인**:
- `Primitives.tsx` Card 컴포넌트가 **다크 전용 색상** 사용
- **라이트 모드에서도 그대로 어두움** (theme.css가 text-white/XX는 변환하지만, 다크 박스 자체는 변환 안 함)
- 어드민/Research 페이지 등 다크 의도가 아닌 페이지가 Primitives를 import해서 사용 시, **라이트 모드에서 어두운 박스**로 표시됨

**실제 발생 위치**:
- AdminPanel, DatasetStats, PatternDB, ErrorAnalysis, AuditLog, ABTest, IOCList, Settings (전부 dev/admin 라우트이므로 영향 적음)
- **단, Theme.css 275~281 라이트 매핑**으로 어느 정도 변환됨 (bg-[#0b1120] → #f8fafc 등)

### Team D 권장 수정 (보고만)

1. **`Primitives.tsx` Card 배경** → `bg-card dark:bg-[#111c30] border-border dark:border-white/10`
2. **모든 admin 라우트 박스** → `bg-card dark:bg-[#111c30] border-border dark:border-white/10`

---

## 통합 권장 수정 (우선순위)

### 1순위 (BLOCKING — 실제 문제)

| # | 파일 | 변경 | 이유 |
|---|------|------|------|
| 1 | `src/app/routes.public.tsx` | line 47 중복 `senior-home` 라우트 제거 | 라우트 충돌 가능성 + 코드 중복 |
| 2 | `src/app/components/ui/Primitives.tsx` line 11 | Card 배경 `bg-[#111c30]` → `bg-card dark:bg-[#111c30]`, border `border-white/10` → `border-border dark:border-white/10` | 다크 전용 → 라이트/다크 둘 다 지원 (어드민 외 페이지에서 사용 시 라이트 모드 깨짐) |
| 3 | `src/app/components/AdminPanel.tsx` 박스 4개 | `bg-[#111c30]` → `bg-card dark:bg-[#111c30]`, `border-white/10` → `border-border dark:border-white/10` | 어드민은 다크 의도지만, theme.css 매핑으로 라이트 모드 호환 |

### 2순위 (MEDIUM)

| # | 파일 | 변경 | 이유 |
|---|------|------|------|
| 4 | `src/app/components/Settings.tsx` | 박스 배경 `bg-[#111c30]`, `bg-[#0b1120]` → 다크/라이트 자동 매핑 | 일관성 |
| 5 | `src/app/components/PatternDB.tsx` | 동일 | 일관성 |
| 6 | `src/app/components/SMSSimulator.tsx` | 동일 | 일관성 |
| 7 | `text-white/30` → `text-white/50` 일괄 | 가독성 | 다크 모드 + 라이트 모드 둘 다 |

### 3순위 (LOW)

- ImageAnalyzer, result/* 카드는 `bg-white dark:bg-[#111c30]` 패턴이라 OK
- 어드민 라우트의 다크 하드코딩은 의도된 디자인으로 보존

---

## 자동 커밋/푸시: 안 함

위 1순위 3개 + 2순위 4개는 **너의 명시적 승인 후 수정**.

답만 주면 진행:
- "1순위만 수정" → 3개 파일만 손봄
- "1+2순위 전부" → 7개 파일
- "다르게" → 알려줘

머지 진행 상태(staged 80개 파일)는 그대로 — 커밋 안 함.
