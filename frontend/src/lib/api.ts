/**
 * NewBiz Shield API Client
 * ─────────────────────────────────
 * 모든 백엔드 호출의 단일 진입점.
 * - VITE_USE_MOCK=true  → src/lib/mock/responses.ts 응답 반환
 * - VITE_USE_MOCK=false → VITE_API_BASE_URL 로 fetch
 *
 * 사용 예:
 *   import { api } from '@/lib/api';
 *   const result = await api.analyze({ type: 'sms', content: '...' });
 */

import { env } from './env';
import { mockHandle } from './mock/responses';
import type {
  AnalysisRequest,
  AnalysisResult,
  OcrResponse,
  SenderLookupResult,
  HistoryItem,
  Paginated,
  ReportRequest,
  ReportResponse,
  ReportStats,
  FeedbackRequest,
  ShareRequest,
  ShareResponse,
  CaseStudy,
  AsyncJob,
} from '@/types/api';

// ───────────────────────────────────────────
// 커스텀 에러
// ───────────────────────────────────────────

export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// ───────────────────────────────────────────
// Mock 가드
// ───────────────────────────────────────────

// 라운드6+ 정직성 cleanup: 단순화.
// - VITE_USE_MOCK=true (dev/발표 시연): 무조건 mock fallback (mockHandle 사용)
// - VITE_USE_MOCK=false + VITE_API_BASE_URL 설정: real fetch (모든 path)
// - VITE_USE_MOCK=false + API_BASE_URL 없음: mock fallback
//
// 발표 환경에서 backend 못 띄우면 VITE_USE_MOCK=true 유지.
// backend 띄울 수 있으면 VITE_USE_MOCK=false + API_BASE_URL 설정으로 진짜 실연결.
function isMockPath(_path: string, _method: string): boolean {
  return env.USE_MOCK || !env.API_BASE_URL;
}

// ───────────────────────────────────────────
// HTTP 클라이언트 (fetch 래퍼)
// ───────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** 인증 토큰 (필요 시) */
  token?: string;
  /** 진행률 콜백 (OCR·분석 등) */
  onProgress?: (pct: number) => void;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, onProgress: _onProgress, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();

  // 1. Mock 우선 처리
  if (isMockPath(path, method)) {
    if (env.DEBUG) console.warn(`[api:MOCK] ${method} ${path}`, body);
    await new Promise((r) => setTimeout(r, env.MOCK_DELAY_MS));
    return mockHandle.invoke<T>(path, method, body);
  }

  // 2. 실제 fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.API_TIMEOUT);

  try {
    const res = await fetch(`${env.API_BASE_URL}${path}`, {
      ...rest,
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...rest.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ code: 'NETWORK', message: res.statusText }));
      throw new ApiException(err.code ?? 'INTERNAL', err.message ?? 'Request failed', err.details);
    }

    // ApiResponse<T> 래퍼가 있으면 unwrap, 없으면 그대로
    const data = await res.json();
    if (data && typeof data === 'object' && 'ok' in data) {
      if (!data.ok) {
        throw new ApiException(
          data.error?.code ?? 'INTERNAL',
          data.error?.message ?? 'API error',
          data.error?.details,
        );
      }
      // BUG-6: ApiResponse<T>의 data 필드가 null/undefined면 명시적 에러
      if (data.data === null || data.data === undefined) {
        throw new ApiException('INTERNAL', 'API returned empty data', { status: res.status });
      }
      return data.data as T;
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiException) throw e;
    if ((e as Error).name === 'AbortError') {
      throw new ApiException('MODEL_TIMEOUT', 'AI 서버가 준비중입니다. 잠시 후 다시 시도해주세요.');
    }
    throw new ApiException('NETWORK', (e as Error).message ?? 'Network error');
  } finally {
    clearTimeout(timeoutId);
  }
}

// ───────────────────────────────────────────
// 도메인별 엔드포인트
// ───────────────────────────────────────────

export const api = {
  // ── 분석 (핵심) ──────────────────────────
  analyze: (req: AnalysisRequest) =>
    request<AnalysisResult>('/api/predict', { method: 'POST', body: req }),

  // ── OCR ─────────────────────────────────
  ocr: (image: string) =>
    request<OcrResponse>('/api/ocr', { method: 'POST', body: { image } }),

  // ── 발신번호 조회 ────────────────────────
  lookupSender: (number: string) =>
    request<SenderLookupResult>(`/api/sender/${encodeURIComponent(number)}`),

  // ── 검사 이력 ────────────────────────────
  getHistory: (page = 1, size = 20) =>
    request<Paginated<HistoryItem>>(`/api/history?page=${page}&size=${size}`),

  getHistoryItem: (id: string) =>
    request<AnalysisResult>(`/api/history/${encodeURIComponent(id)}`),

  // ── 신고 ─────────────────────────────────
  submitReport: (req: ReportRequest) =>
    request<ReportResponse>('/api/reports', { method: 'POST', body: req }),

  getReport: (receiptId: string) =>
    request<ReportResponse>(`/api/reports/${encodeURIComponent(receiptId)}`),

  getReportStats: () =>
    request<ReportStats>('/api/reports/stats'),

  // ── 피드백 ──────────────────────────────
  submitFeedback: (req: FeedbackRequest) =>
    request<{ ok: true }>('/api/feedback', { method: 'POST', body: req }),

  // ── 공유 ─────────────────────────────────
  share: (req: ShareRequest) =>
    request<ShareResponse>('/api/share', { method: 'POST', body: req }),

  // ── 사례 / 교육 ─────────────────────────
  getCases: (category?: string, page = 1) => {
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    qs.set('page', String(page));
    return request<Paginated<CaseStudy>>(`/api/cases?${qs}`);
  },

  getCase: (id: string) =>
    request<CaseStudy>(`/api/cases/${encodeURIComponent(id)}`),

  // ── 비동기 작업 폴링 ───────────────────
  getJob: (jobId: string) =>
    request<AsyncJob>(`/api/jobs/${encodeURIComponent(jobId)}`),
} as const;
