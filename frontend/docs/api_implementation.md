# Frontend API Implementation Guide

이 문서는 `frontend/src/lib/api.ts` 에서 사용 중인 현재 mock API 경로와 payload/response 형태를 백엔드 구현 참고용으로 정리한 것입니다.

## 1. 개요

- 프론트엔드 API 진입점: `frontend/src/lib/api.ts`
- 타입 정의: `frontend/src/types/api.ts`
- mock 구현: `frontend/src/lib/mock/responses.ts`
- 실제 백엔드 호출은 `.env`에서 `VITE_USE_MOCK=false` 일 때 `VITE_API_BASE_URL`로 전송됩니다.
- `fetch` 응답 처리 로직은 `frontend/src/lib/api.ts`의 `request()` 함수에 있으며, 다음 형태를 지원합니다:
  - raw JSON 객체
  - `{ ok: true, data: T }` 형태의 래퍼

## 2. 요청 공통 규칙

- 기본 `Content-Type`: `application/json`
- HTTP 메서드별 경로는 mock 레이어와 동일하게 구현해야 합니다.
- 경로에 `encodeURIComponent()`가 사용되는 경우, 백엔드에서도 URL 세그먼트 인코딩을 고려합니다.
- 에러 처리:
  - HTTP 상태코드가 2xx가 아니면 프론트엔드는 응답 본문에서 `code`, `message`, `details`를 찾습니다.
  - `ApiResponse<T>` 래퍼 사용 시 `ok: false`인 경우 `error` 필드를 반환해야 합니다.

## 3. 엔드포인트 목록

### 3.1 POST /api/predict

- 요청 body: `AnalysisRequest`
- 응답: `AnalysisResult`

#### AnalysisRequest

- `type: 'sms' | 'url' | 'image'`
- `content: string` (SMS 텍스트, URL, 또는 OCR 텍스트)
- `sender?: string`
- `receivedAt?: string` (ISO 8601)
- `imageId?: string`
- `allowTrainingUse?: boolean`

#### AnalysisResult

`AnalysisResult`는 세 가지 union 타입 중 하나입니다.

##### SmsAnalysisResult

- `type: 'sms'`
- `senderNumber?: string`
- `extractedUrl?: string`
- `urlAnalysis?: UrlDetails`

##### UrlAnalysisResult

- `type: 'url'`
- `urlDetails: UrlDetails`

##### ImageAnalysisResult

- `type: 'image'`
- `ocrText: string`
- `imageId: string`
- `imageUrl?: string`

##### 공통 필드

- `id`, `type`, `content`, `riskLevel`, `riskScore`, `smishingType`
- `reasons: DetectionReason[]`
- `actionGuide: ActionGuideItem[]`
- `similarCases: SimilarCase[]`
- `damageScenario?: DamageStep[]`
- `modelVersion: string`
- `processingTime: number`
- `cacheHit: boolean`
- `createdAt: string`

##### UrlDetails

- `domain`, `ssl`, `domainAge`, `redirects`, `ipCountry`, `similarDomains`, `flags`

### 3.2 POST /api/ocr

- 요청 body: `{ image: string }`
- 응답: `OcrResponse`

#### OcrResponse

- `imageId: string`
- `text: string`
- `confidence: number`
- `blocks: { text: string; bbox: number[] }[]`

### 3.3 GET /api/sender/:number

- 요청 경로 예: `/api/sender/010-8821-3947`
- 프론트엔드 호출: `api.sender(number)`
- 응답: `SenderLookupResult`

#### SenderLookupResult

- `number: string`
- `trustScore: number`
- `status: 'safe' | 'caution' | 'danger' | 'unknown'`
- `reportCount: number`
- `lastReportedAt: string | null`
- `categories: string[]`
- `history: { date: string; type: string; count: number }[]`

### 3.4 POST /api/reports

- 요청 body: `ReportRequest`
- 응답: `ReportResponse`

#### ReportRequest

- `type: AnalysisType`
- `content: string`
- `category: SmishingType`
- `sender?: string`
- `url?: string`
- `notes?: string`
- `agreeShare: boolean`

#### ReportResponse

- `receiptId: string`
- `status: 'received' | 'reviewing' | 'completed'`
- `createdAt: string`

## 4. 백엔드 구현 시 참고 사항

- `api.ts`는 mock 경로를 그대로 사용하므로, 백엔드도 동일한 URL 구조를 지켜야 합니다.
- `GET /api/sender/:number`와 같이 path parameter를 사용하므로 백엔드는 번호 문자열을 인코딩/디코딩해야 합니다.
- `POST /api/predict`는 `type`에 따라 세 가지 결과 타입을 반환해야 합니다.
- `POST /api/ocr` → `imageId`를 발급하고 OCR 텍스트를 반환해야 합니다.

## 5. Mock 예시 구현 참고

`frontend/src/lib/mock/responses.ts`에 mock 서버 로직이 구현되어 있습니다.

- 경로 등록: `mockHandle.register(method, path, handler)`
- `POST /api/predict`는 `type`에 따라 `buildSmsResult`, `buildUrlResult`, `buildImageResult`를 호출합니다.
- `POST /api/reports`는 `receiptId`를 생성하고 `status: 'received'`를 반환합니다.

## 6. 빠른 구현 체크리스트

- [ ] `frontend/src/types/api.ts`로 타입 설계 확인
- [ ] `frontend/src/lib/api.ts` 경로와 메서드 일치
- [ ] `VITE_USE_MOCK=false` 환경에서 실제 백엔드 요청 테스트
- [ ] status code 2xx 이외의 경우 `ApiError` 형태로 에러 응답 제공
- [ ] `ok/data` 래퍼 형식도 지원 가능하나, raw JSON도 허용됨
