/**
 * 환경변수 타입화
 * - Vite는 import.meta.env.VITE_* 로 접근
 * - .env 파일에 정의 → import.meta.env 자동 주입
 */

const envRaw = import.meta.env;

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === 'string') return v === 'true' || v === '1';
  if (typeof v === 'boolean') return v;
  return fallback;
}

function str(v: unknown, fallback: string): string {
  if (typeof v === 'string' && v.length > 0) return v;
  return fallback;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  /** true면 Mock 응답, false면 실제 백엔드 호출 */
  USE_MOCK: bool(envRaw.VITE_USE_MOCK, true),

  /** 백엔드 base URL (VITE_USE_MOCK=false일 때만 사용) */
  API_BASE_URL: str(envRaw.VITE_API_BASE_URL, 'http://localhost:8000'),

  /** HTTP 요청 타임아웃 (ms) */
  API_TIMEOUT: num(envRaw.VITE_API_TIMEOUT, 10_000),

  /** Mock 응답 지연 (ms) — UX 테스트용 */
  MOCK_DELAY_MS: num(envRaw.VITE_MOCK_DELAY_MS, 400),

  /** 디버그 로그 출력 */
  DEBUG: bool(envRaw.VITE_DEBUG, false),
} as const;
