# AsyncJob 구조 점검 + 설계안

> 작성일: 2026-06-09
> 대상: `/Users/aku/Downloads/심화 프로젝트 웹사이트/frontend`
> 원칙: 수정 전 설계안만 제시, 자동 구현 안 함

---

## 점검 결과

### A. `api.getJob()` 실제 사용 여부

```bash
$ grep -rn "api\.getJob\|getJob(" src/
# 결과: 0건 (사용 안 함)
```

**`api.getJob()`은 정의만 있고 호출 0건.**

### B. AsyncJob 타입 (types/api.ts, line 303~310)

```ts
export interface AsyncJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;             // 0~100
  currentStep?: string;         // 'ocr' | 'vt_lookup' | 'sandbox' 등
  result?: unknown;             // 완료 시 결과
  error?: ApiError;
}
```

→ 잘 정의되어 있음. Mock의 `mockHandle.register('GET', '/api/jobs/job_demo_001', ...)`도 같은 모양 반환.

### C. AnalysisProgress.tsx 현재 상태

```ts
// line 14~24
const STEPS: AnalysisStep[] = [
  { id: 1, icon: FileText, label: "입력 확인 중", duration: 500 },
  { id: 2, icon: Search, label: "문자 분석 중", duration: 1000 },
  { id: 3, icon: Database, label: "유사 사례 검색 중", duration: 1000 },
  { id: 4, icon: Sparkles, label: "결과 생성 중", duration: 700 },
];

// 50ms 간격으로 progress bar 업데이트 + 단계별 setTimeout
// 모든 단계 끝나면 /analyze/result/{id}?text=...&type=... 로 navigate
```

- **로컬 시뮬레이션** — 실제 백엔드 호출 없음
- `text`와 `type`을 URL로 실어 나르는 안티 패턴 (긴 텍스트는 URL 길이 초과)
- 결과 페이지(`AnalysisResult`)는 URL의 `text`를 다시 `analyzeSms`로 분석 → 백엔드 결과 무시됨

### D. 진행률 표시 UI

- `AnalysisProgress` 자체에는 progress bar 있음 (50ms 간격 업데이트)
- `AsyncJob.progress` (0~100)와 직접 매핑 가능
- **현재는 단계별 duration을 시뮬레이션하는 형태**

### E. 연결 상태

| 항목 | 상태 |
|------|------|
| API Contract (`AsyncJob` 타입) | ✅ 정의됨 |
| API Client (`api.getJob`) | ✅ 정의됨 |
| Mock (`/api/jobs/job_demo_001`) | ✅ 정의됨 |
| 실제 페이지에서 사용 | ❌ 0건 |
| 실제 비동기 흐름 | ❌ 로컬 시뮬레이션 |

---

## 현재 흐름 (Before)

```
사용자: "분석하기" 클릭
   ↓
Analyzer: analyzeSms(textInput)        [로컬 함수]
   ↓
setResult(internalShape)              [snake_case]
   ↓
nav('/analyze/result/{id}?text=...&type=...')
   ↓
AnalysisResult: useParams, useSearchParams
   ↓
analyzeSms(text)                        [또 로컬 함수]
   ↓
setResult(...)                          [백엔드 무시]
```

**진짜 분석은 한 번도 일어나지 않음.** 로컬 규칙 기반 분석이 두 번 반복될 뿐.

---

## 목표 흐름 (After) — Option A: 동기 분석

```
사용자: "분석하기" 클릭
   ↓
Analyzer: await api.analyze({ type, content, sender })
   ↓
응답: SmsAnalysisResult | UrlAnalysisResult | ImageAnalysisResult
   ↓
setResult(adaptToInternal(resp))
   ↓
nav('/analyze/result/{result.id}')
   ↓
AnalysisResult: api.getHistoryItem(result.id)   또는 캐시된 결과 사용
   ↓
결과 표시
```

- **단순, 빠름, 백엔드 모델 결과 사용**
- 백엔드가 동기 응답(현재 800~1500ms 가정)을 반환한다는 전제
- 대부분의 경우(텍스트/URL 분석)는 이 흐름으로 충분

---

## 목표 흐름 (After) — Option B: 비동기 작업 (진짜 AsyncJob)

> OCR·VirusTotal·샌드박스 같이 **수 초~수십 초** 걸리는 작업용

```
사용자: "분석하기" 클릭 (이미지 업로드)
   ↓
Analyzer: await api.analyze({ type: 'image', content: base64, imageId })
   ↓
백엔드: 동기 응답으로 jobId 반환 (또는 즉시 202 Accepted + jobId)
   ↓
nav('/analyze/progress?jobId={jobId}')
   ↓
AnalysisProgress: 폴링 시작
   ↓
   GET /api/jobs/{jobId}
   ↓
   { status: 'processing', progress: 30, currentStep: 'ocr' }
   ↓
   progress bar 업데이트 + currentStep 라벨 표시
   ↓
   { status: 'completed', progress: 100, result: { ...AnalysisResult } }
   ↓
nav('/analyze/result/{jobId}')   [text 없이 ID만]
   ↓
AnalysisResult: api.getHistoryItem(jobId)   [또는 job.result 직접]
   ↓
결과 표시
```

### 핵심 변경점

| 항목 | Before | After |
|------|--------|-------|
| 분석 호출 | `analyzeSms()` (로컬) | `api.analyze()` (백엔드) |
| 결과 전달 | `?text=...&type=...` (URL) | `?jobId=...` (URL) 또는 캐시 |
| 진행률 | 4단계 로컬 setTimeout | `api.getJob()` 폴링 (진짜) |
| 결과 표시 | `analyzeSms()` 재호출 (로컬) | `api.getHistoryItem()` 또는 캐시 |
| 페이지 처리 | 동기 | 비동기 (jobId 기반) |

---

## Option A vs Option B — 언제 어떤 걸 쓰나

| 상황 | 권장 |
|------|------|
| SMS 분석 (1~2초) | **Option A** (동기) |
| URL 분석 (1초 이내) | **Option A** (동기) |
| 이미지 OCR+분석 (3~10초) | **Option B** (비동기) |
| VirusTotal 조회 (5~30초) | **Option B** (필수) |
| 샌드박스 URL 실행 (10~60초) | **Option B** (필수) |

**핵심 제안: 동기/비동기를 백엔드가 결정하고 클라이언트는 `jobId` 패턴으로 통일.**

### 백엔드 응답 표준안 (제안)

```ts
// 동기 분석 (SMS, URL, Image OCR 완료된 경우)
POST /api/analyze
→ 200 OK
{
  ok: true,
  data: {
    id: "anl_xxx",
    type: "sms",
    riskLevel: "high",
    ...
  }
}

// 비동기 분석 (VirusTotal·샌드박스 등 시간이 긴 경우)
POST /api/analyze
→ 202 Accepted
{
  ok: true,
  data: {
    jobId: "job_xxx",
    status: "queued"
  }
}

// 또는 단일 인터페이스:
POST /api/analyze
→ 200 OK
{
  ok: true,
  data: { id: "anl_xxx", jobId: "job_xxx"?, ... }
}
```

**클라이언트는 `data.jobId`가 있으면 폴링, 없으면 동기 결과로 간주.**

---

## 클라이언트 구현 설계안 (수정 안 함, 설계만)

### 1. 공통 폴링 유틸 (신규, `src/lib/pollJob.ts` — 만들지 않음, 설계만)

```ts
// src/lib/pollJob.ts (설계)
import { api } from './api';
import type { AsyncJob } from '@/types/api';

export interface PollOptions {
  intervalMs?: number;        // 기본 800
  maxAttempts?: number;       // 기본 60 (약 48초)
  onProgress?: (job: AsyncJob) => void;
}

export async function pollJob(
  jobId: string,
  opts: PollOptions = {}
): Promise<AsyncJob> {
  const { intervalMs = 800, maxAttempts = 60, onProgress } = opts;
  for (let i = 0; i < maxAttempts; i++) {
    const job = await api.getJob(jobId);
    onProgress?.(job);
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Job polling timeout');
}
```

### 2. Analyzer.tsx 변경 (설계)

```ts
// 현재: nav('/analyze/progress?text=...&type=...')
// 변경: jobId 패턴

const handleAnalyze = async () => {
  try {
    const resp = await api.analyze({ type: 'sms', content: textInput, sender });
    // resp.id가 resultId, resp.jobId가 있으면 비동기
    if ('jobId' in resp && resp.jobId) {
      // 비동기: 결과 페이지가 폴링
      nav(`/analyze/progress/${resp.jobId}`);
    } else {
      // 동기: 결과 페이지에 캐시
      resultCache.set(resp.id, resp);
      nav(`/analyze/result/${resp.id}`);
    }
  } catch (e) { ... }
};
```

### 3. AnalysisProgress 변경 (설계)

```ts
// 현재: 4단계 로컬 setTimeout
// 변경: jobId 기반 폴링

export function AnalysisProgress() {
  const { jobId } = useParams();
  const [job, setJob] = useState<AsyncJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    pollJob(jobId, {
      onProgress: (j) => { if (!cancelled) setJob(j); },
    })
      .then((j) => {
        if (j.status === 'completed' && j.result) {
          // 결과 페이지로 (ID만 전달)
          resultCache.set(j.jobId, j.result);
          nav(`/analyze/result/${j.jobId}`);
        } else if (j.status === 'failed') {
          setError(j.error?.message ?? '분석 실패');
        }
      })
      .catch((e) => setError(e.message));
    return () => { cancelled = true; };
  }, [jobId]);

  if (error) return <ErrorState type="server" message={error} />;
  return <ProgressUI progress={job?.progress ?? 0} step={job?.currentStep} />;
}
```

### 4. AnalysisResult 변경 (설계)

```ts
// 현재: URL ?text=...&type=... 받아서 로컬 analyzeSms
// 변경: ID로 캐시 조회 또는 API 호출

const { id } = useParams();
const [result, setResult] = useState<ApiAnalysisResult | null>(null);

useEffect(() => {
  if (!id) return;
  // 1. 캐시 확인 (Analyzer에서 set해둔 것)
  const cached = resultCache.get(id);
  if (cached) {
    setResult(cached);
    return;
  }
  // 2. 캐시 없으면 API 호출 (이력 페이지에서 진입한 경우)
  api.getHistoryItem(id)
    .then(setResult)
    .catch((e) => setError(e.message));
}, [id]);
```

### 5. 라우트 변경 (설계)

```ts
// routes.public.tsx
{ path: "analyze/progress/:jobId", Component: AnalysisProgress },  // ID 기반
{ path: "analyze/result/:id", Component: AnalysisResult },
```

---

## 단계별 진행 (수정 안 함, 순서만)

| Phase | 작업 | 의존성 |
|-------|------|--------|
| 1 | `resultCache` 유틸 추가 (in-memory Map) | 없음 |
| 2 | `pollJob` 유틸 추가 | `api.getJob` (이미 있음) |
| 3 | `Analyzer`가 `api.analyze()` 호출 + jobId 분기 | Phase 1 |
| 4 | `AnalysisProgress`가 jobId 폴링 | Phase 2, 3 |
| 5 | `AnalysisResult`가 ID로 캐시/API 조회 | Phase 1 |
| 6 | 라우트 `:jobId` 파라미터 추가 | Phase 4 |
| 7 | E2E 테스트 (Mock + 실 백엔드) | 모두 |

---

## 백엔드 합의 필요 항목 (요약)

API Contract v1.0에는 `AsyncJob` 타입이 정의되어 있지만, **실제 흐름의 세부 사항**은 합의 안 됨:

1. **`POST /api/analyze`의 응답이 동기/비동기 어떻게 구분되는가?**
   - 옵션 A: 항상 200 + `data: { id, jobId? }` (jobId 유무로 분기)
   - 옵션 B: 200 = 동기, 202 = 비동기
   - 옵션 C: 별도 엔드포인트 `POST /api/analyze/async` (이건 비추)

2. **폴링 주기는?**
   - 800ms? 1초? 2초?
   - 클라이언트가 결정 vs 백엔드가 `Retry-After` 헤더로 결정

3. **타임아웃은?**
   - 클라이언트: `maxAttempts = 60` × `intervalMs = 800` = 48초
   - 백엔드: 작업 자체의 타임아웃 (OCR 30초, VT 60초 등)

4. **폴링 중단 조건은?**
   - 클라이언트가 페이지 떠날 때 cleanup
   - `AbortController` 사용 가능?

5. **결과 캐싱은?**
   - `analyzeId` 기반 캐시는 백엔드에서?
   - 클라이언트는 메모리 캐시만?

이 항목들은 백엔드팀과 별도 미팅에서 합의 필요.

---

## 결론

### 현재 상태

- AsyncJob **인프라 정의는 완성** (타입, 클라이언트, Mock)
- **실제 사용 0건** — 클라이언트가 폴링을 안 함, 페이지가 로컬 시뮬레이션
- 백엔드 합의사항 일부 누락 (동기/비동기 구분, 폴링 정책)

### 우선순위

1. **동기 분석 흐름 먼저** (Option A) — SMS/URL은 이걸로 충분
2. **비동기 흐름은 이미지 OCR부터** (Option B) — VirusTotal·샌드박스는 그 다음
3. **백엔드와 응답 형태 합의** — 합의 전에는 임시로 동기 + 0~2초 가정으로 진행 가능

### 작업 승인 요청

**자동 구현 안 함.** 위 설계대로 구현하려면 **명시적 승인** 필요. 너의 우선순위에 따라 단계별로 진행할게.

---
