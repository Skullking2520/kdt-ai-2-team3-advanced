# Component Migration Plan

> 작성일: 2026-06-09
> 대상: `/Users/aku/Downloads/심화 프로젝트 웹사이트/frontend`
> 원칙: 파일 삭제 금지, git 명령 금지, UI 변경 금지, 최소 리팩토링

> **각 컴포넌트의 현재 로컬 분석 함수를 `api.analyze()`로 교체하는 계획만 제시합니다.**
> **자동 수정 안 함 — 모든 변경은 너의 명시적 승인 후 진행.**

---

## 1. Analyzer.tsx (메인 SMS 분석)

### 현재

```ts
// line 9
import { analyzeSms, toLegacyRiskLevel, URGENCY_KEYWORDS } from "@/lib/smsAnalysis";

// line 154
const [result, setResult] = useState<AnalysisResult | null>(null);

// line 165~189
const sms = analyzeSms(textInput);
setResult({
  risk_level: toLegacyRiskLevel(sms.risk_level),
  risk_score: sms.risk_score,
  smishing_type: sms.smishing_type,
  reasons: sms.reasons,
  action_guide: sms.action_guide,
  similar_cases: sms.similar_cases,
  has_url: sms.has_url,
  has_impersonation: sms.has_impersonation,
  has_payment_request: sms.has_payment_request,
  has_personal_info_request: sms.has_personal_info_request,
});
```

- `smsAnalysis.ts` (로컬 함수) 사용
- 결과는 snake_case 내부 타입으로 매핑
- 에러 핸들링 없음

### 변경

```ts
// 추가 import
import { api, ApiException } from "@/lib/api";
import type { AnalysisResult as ApiAnalysisResult, SmsAnalysisResult } from "@/types/api";

// line 168~189 교체
const handleAnalyze = async () => {
  if (!textInput.trim()) { setResult(null); return; }
  setLoading(true);
  setError("");
  try {
    const resp = await api.analyze({
      type: "sms",
      content: textInput,
      sender: senderInput || undefined,
    });
    // resp는 SmsAnalysisResult (camelCase) — 기존 내부 타입에 어댑트
    setResult(adaptToInternal(resp));
  } catch (e) {
    if (e instanceof ApiException) {
      setError(e.message);
    } else {
      setError("분석 중 오류가 발생했어요");
    }
    setResult(null);
  } finally {
    setLoading(false);
  }
};
```

- `adaptToInternal()` 어댑터: `SmsAnalysisResult` (camelCase) → 컴포넌트 내부 `AnalysisResult` (snake_case) — 기존 `setResult` 모양 유지
- `setLoading`, `setError` 추가 (없으면)
- `ApiException` 코드별 분기 (`MODEL_TIMEOUT` → "잠시 후 다시 시도" 등)

### 영향도

- **파일 변경**: `Analyzer.tsx` 1개
- **타입 변경**: 없음 (내부 타입 유지, 어댑터로 흡수)
- **UI 변경**: 없음
- **다른 페이지 영향**: 없음
- **Mock 영향**: `VITE_USE_MOCK=true`에서 `api.analyze()` 호출 → Mock의 `buildSmsResult`가 같은 도메인 규칙을 적용하므로 결과 비슷 (단, Mock은 0~5개 cases vs 백엔드는 다를 수 있음)
- **리스크**: 낮음. 기존 `smsAnalysis.ts`는 그대로 두고 어댑터로 분리 가능 (점진적 전환)

### 제거 가능 (옵션, 자동 수정 금지)

- `import { analyzeSms, toLegacyRiskLevel, URGENCY_KEYWORDS } from "@/lib/smsAnalysis"` — Analyzer에서 더 이상 안 쓰면
- 단, **자동 제거 안 함** — 너 승인 후 처리

---

## 2. URLAnalyzer.tsx (URL 검사)

### 현재

```ts
// line 5~6
import {api, ApiException} from "@/lib/api";
import type { UrlAnalysisResult } from "@/types/api";

// line 22
function adaptUrlResult(r: UrlAnalysisResult): URLResult { ... }  // 이미 있음

// line 44
function _analyzeURL(raw: string): URLResult { ... }  // dead code

// line 127
const resp = await api.analyze({ type: "url", content: target });
const urlResult = adaptUrlResult(resp);
setResult(urlResult);
```

- **이미 `api.analyze()` 사용 중** — 이 파일은 마이그레이션 **완료**된 상태
- 어댑터 `adaptUrlResult`가 `UrlAnalysisResult` → 내부 `URLResult` 변환
- `_analyzeURL`은 dead code (선언만, 호출 0건)

### 변경

**없음** — 이미 정상 동작.

### 영향도

- **없음**
- (옵션) `_analyzeURL` dead code는 보류 (자동 수정 금지)

---

## 3. ImageAnalyzer.tsx (OCR + 분석)

### 현재

```ts
// line 13
const MOCK_OCR_RESULTS = [ ... ];  // 하드코딩 OCR 결과

// line 59~87 (handleOcr)
const handleOcr = () => {
  setOcrRunning(true);
  const willFail = Math.random() < 0.05;  // 5% 확률 실패
  let step = 0;
  const interval = setInterval(() => { ... }, 650);  // 5단계 시뮬레이션
  setTimeout(() => {
    if (willFail) {
      setOcrError(true);
    } else {
      const mockText = MOCK_OCR_RESULTS[Math.floor(Math.random() * ...)];
      setOcrText(mockText);
    }
  }, 400);
};

// handleAnalyze (line 90~95)
const handleAnalyze = () => {
  const textToAnalyze = isEditing ? editedText : ocrText;
  nav(`/analyze/progress?text=${encodeURIComponent(textToAnalyze)}&type=image`);
};
```

- `api.ocr()` 안 부름
- `api.analyze({ type: 'image' })`도 안 부름 (AnalysisResult에서 로컬 재분석)

### 변경 (Phase 1: OCR)

```ts
// 추가 import
import { api, ApiException } from "@/lib/api";

// handleOcr 교체
const handleOcr = async () => {
  if (!file || ocrRunning) return;
  setOcrRunning(true);
  setOcrStep(0);
  setOcrText(null);
  setOcrError(false);

  // 진행률 시뮬레이션은 유지 (백엔드가 동기 응답이라)
  // 단, 5% 랜덤 실패 제거
  let step = 0;
  const interval = setInterval(() => {
    step += 1;
    setOcrStep(step);
    if (step >= OCR_STEPS.length - 1) clearInterval(interval);
  }, 650);

  try {
    // file을 base64로 변환
    const base64 = await fileToBase64(file);
    const resp = await api.ocr(base64);
    setOcrText(resp.text);
    setEditedText(resp.text);
  } catch (e) {
    setOcrError(true);
    // TODO: ErrorState type="ocr" 사용
  } finally {
    setOcrRunning(false);
    clearInterval(interval);
  }
};

// 헬퍼
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
```

### 변경 (Phase 2: 분석)

- `handleAnalyze()`가 `nav("/analyze/progress?text=...&type=image")`로 navigate
- `AnalysisProgress` → `AnalysisResult` 흐름은 1번(Analyzer)과 동일하게 처리 (AnalysisResult의 `api.analyze()` 교체에 의존)

### 영향도

- **파일 변경**: `ImageAnalyzer.tsx` 1개 (handleOcr만)
- **타입 변경**: 없음
- **UI 변경**: 없음 (단계 표시, 에러 표시 그대로)
- **Mock 영향**: `api.ocr()`는 Mock에서 하드코딩된 텍스트 (`http://cj-delivery-check.com/...`) 반환. 이 텍스트가 5% 랜덤 픽을 대체
- **리스크**: 중간. file → base64 변환이 메모리/CPU 부하 (큰 이미지의 경우). 큰 이미지는 resize 후 보내는 옵션 가능 (보류)

### 제거 가능 (옵션, 자동 수정 금지)

- `MOCK_OCR_RESULTS` 배열 — 더 이상 안 쓰면
- 5% 랜덤 실패 (`Math.random() < 0.05`) — 제거 가능
- 단, **자동 제거 안 함**

---

## 4. SeniorAnalyzer.tsx (시니어용 SMS 분석)

### 현재

```ts
// line 8
import { analyzeSms, toLegacyRiskLevel, toSeniorReasons, toSeniorActions } from "@/lib/smsAnalysis";

// line 35
const [result, setResult] = useState<AnalysisResult | null>(null);

// line 45~50 (handleAnalyze)
const sms = analyzeSms(textInput);
setResult({
  risk_level: toLegacyRiskLevel(sms.risk_level),
  risk_score: sms.risk_score,
  smishing_type: sms.smishing_type,
  reasons: toSeniorReasons(sms.reasons),
  action_guide: toSeniorActions(sms.action_guide),
  similar_cases: sms.similar_cases,
  has_url: sms.has_url,
  has_impersonation: sms.has_impersonation,
  has_payment_request: sms.has_payment_request,
  has_personal_info_request: sms.has_personal_info_request,
});

// line 67~70 (재실행 시뮬레이션)
setTimeout(() => {
  const sms = analyzeSms(textInput);
  setResult({ ... });
}, ...);
```

- `smsAnalysis.ts` 사용
- 시니어 어투 변환 (`toSeniorReasons`, `toSeniorActions`)이 로컬 함수에 의존
- 결과는 snake_case

### 변경

```ts
// 추가 import
import { api, ApiException } from "@/lib/api";
import type { SmsAnalysisResult } from "@/types/api";

const handleAnalyze = async () => {
  if (!textInput.trim()) { setResult(null); return; }
  setLoading(true);
  setError("");
  try {
    const resp = await api.analyze({
      type: "sms",
      content: textInput,
      sender: senderInput || undefined,
    });
    // resp는 SmsAnalysisResult — 시니어 어투로 변환
    setResult(adaptToSenior(resp));
  } catch (e) {
    if (e instanceof ApiException) {
      setError(e.message);
    } else {
      setError("분석 중 오류가 발생했어요");
    }
  } finally {
    setLoading(false);
  }
};

// 어댑터 — toSeniorReasons/toSeniorActions의 역할을 흡수
const adaptToSenior = (r: SmsAnalysisResult) => ({
  risk_level: r.riskLevel,  // 'high' | 'medium' | 'low' 그대로 (한국어 매핑은 UI에서)
  risk_score: r.riskScore,
  smishing_type: r.smishingType,
  reasons: r.reasons.map(reason => ({
    ...reason,
    label: toSeniorLabel(reason.label),  // 시니어 어투
  })),
  action_guide: r.actionGuide.map(item => ({
    ...item,
    action: toSeniorAction(item.action),  // 시니어 어투
  })),
  similar_cases: r.similarCases,
  has_url: !!r.extractedUrl,
  has_impersonation: r.reasons.some(r => r.code === 'impersonation'),
  has_payment_request: r.reasons.some(r => r.code === 'payment_request'),
  has_personal_info_request: r.reasons.some(r => r.code === 'personal_info_request'),
});
```

- `toSeniorLabel`, `toSeniorAction`은 `smsAnalysis.ts`에서 가져와 재사용 (또는 같은 로직 복사)
- `setTimeout` 시뮬레이션 제거
- 에러 핸들링 추가

### 영향도

- **파일 변경**: `SeniorAnalyzer.tsx` 1개
- **타입 변경**: 없음
- **UI 변경**: 없음
- **다른 페이지 영향**: 없음
- **Mock 영향**: Mock의 `buildSmsResult` 결과가 `smsAnalysis.analyzeSms`와 비슷한 도메인 규칙 사용. 결과 비슷할 가능성
- **리스크**: 낮음~중간. 시니어 어투 변환 로직이 백엔드 응답 shape에 따라 다를 수 있어 어댑터 튜닝 필요할 수 있음

### 제거 가능 (옵션, 자동 수정 금지)

- `smsAnalysis.ts`의 `analyzeSms` 호출 (SeniorAnalyzer에서)
- 단, **자동 제거 안 함** — `toSeniorLabel`/`toSeniorAction`은 재사용 가능성 있음

---

## 마이그레이션 요약표

| 파일 | 현재 상태 | 변경 | 리스크 |
|------|-----------|------|--------|
| Analyzer.tsx | `smsAnalysis.analyzeSms()` | → `api.analyze({ type: 'sms' })` | 낮음 |
| URLAnalyzer.tsx | `api.analyze({ type: 'url' })` | **변경 없음** | — |
| ImageAnalyzer.tsx | `MOCK_OCR_RESULTS` + setInterval | → `api.ocr(base64)` | 중간 |
| SeniorAnalyzer.tsx | `smsAnalysis.analyzeSms()` | → `api.analyze({ type: 'sms' })` | 낮음~중간 |
| AnalysisResult.tsx (별도) | `smsAnalysis.analyzeSms()` | → `api.analyze({ type })` | 낮음 |

---

## 진행 순서 (권장)

1. **URLAnalyzer** — 이미 완료, 검증만
2. **Analyzer** — 핵심 SMS 흐름, Mock 모드에서 회귀 테스트
3. **SeniorAnalyzer** — Analyzer와 동일 패턴
4. **AnalysisResult** — URL에 텍스트 실어 나르는 흐름 → `api.getHistoryItem(id)` 또는 `api.analyze()` 재호출
5. **ImageAnalyzer** (Phase 1 OCR, Phase 2 분석) — 가장 복잡, 가장 마지막

각 단계마다:
- 변경 전: Mock 모드에서 동작 확인
- 변경 후: Mock 모드에서 동일 결과 확인
- VITE_USE_MOCK=false로 토글해서 실 백엔드 연결 테스트

---

## 작업 승인 요청

**자동 수정 안 함**. 위 계획을 그대로 적용하려면 **명시적 승인** 필요. 한 파일씩, 너의 확인 받고 진행할게.

---
