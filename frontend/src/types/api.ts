/**
 * NewBiz Shield API Contract v1.0
 * ─────────────────────────────────
 * Frontend ↔ Backend ↔ AI Model 합의 명세
 *
 * 작성일: 2026-06-05
 * 프론트엔드: NewBiz Shield (Figma Make export 기반)
 * 백엔드:    TBD (초안 도착 후 합의)
 * AI 모델:   TBD (kc-electra / KoBERT 등)
 *
 * 합스 원칙:
 * 1. riskLevel = "high" | "medium" | "low" (소문자, 통일)
 * 2. riskScore = 0~100 (정수, 통일)
 * 3. 날짜 = ISO 8601 문자열
 * 4. 에러 = { code, message, details? } 구조
 * 5. 사용자 노출 한국어 (smishingType) / 로직 영문 (enum) 분리
 */

// ───────────────────────────────────────────
// 1. 공통 Enum / 상수
// ───────────────────────────────────────────

export type RiskLevel = 'high' | 'medium' | 'low';

export type AnalysisType = 'sms' | 'url' | 'image';

export type SenderStatus = 'safe' | 'caution' | 'danger' | 'unknown';

export type ReportStatus = 'received' | 'reviewing' | 'completed';

export type ActionPriority = 'critical' | 'high' | 'normal';

export type DamageIcon = 'message' | 'click' | 'site' | 'info' | 'damage';

/** 한국어 사용자 노출 (UI 매핑용) */
export const RISK_LEVEL_KO: Record<RiskLevel, string> = {
  high: '위험',
  medium: '주의',
  low: '안전',
};

export const SENDER_STATUS_KO: Record<SenderStatus, string> = {
  safe: '안전',
  caution: '주의',
  danger: '위험',
  unknown: '알 수 없음',
};

export const ACTION_PRIORITY_KO: Record<ActionPriority, string> = {
  critical: '즉시',
  high: '우선',
  normal: '권장',
};

// ───────────────────────────────────────────
// 2. 분석 입력 (프론트 → 백엔드)
// ───────────────────────────────────────────

export interface AnalysisRequest {
  type: AnalysisType;
  content: string;            // SMS 텍스트, URL, 또는 image일 때 base64/data URI
  sender?: string;            // SMS에서 발신번호 (선택)
  receivedAt?: string;        // ISO 8601 (선택)
  imageId?: string;           // image에서 OCR 선행 시 발급된 ID
  allowTrainingUse?: boolean; // 모델 개선용 학습 데이터 활용 동의
}

// ───────────────────────────────────────────
// 3. 분석 응답 (공통 Base)
// ───────────────────────────────────────────

export interface AnalysisResultBase {
  id: string;                       // 분석 고유 ID (이력 저장·공유용)
  type: AnalysisType;
  content: string;                  // 원문 (image는 ocrText가 들어감)
  riskLevel: RiskLevel;
  riskScore: number;                // 0~100 정수
  smishingType: SmishingType;
  reasons: DetectionReason[];
  actionGuide: ActionGuideItem[];
  similarCases: SimilarCase[];
  governmentCriteria: GovernmentCriterion[];
  damageScenario?: DamageStep[];    // high/medium일 때만
  modelVersion: string;             // 백엔드 모델 ID (정직: dev 측정 불가, 실제 모델 ID는 백엔드 응답으로만)
  processingTime?: number;          // ms (정직: dev 측정 불가, 백엔드 응답 시 채워짐)
  cacheHit?: boolean;               // 캐시 적중 (정직: 백엔드 응답 시 채워짐)
  createdAt: string;                // ISO 8601
}

// SMS
export interface SmsAnalysisResult extends AnalysisResultBase {
  type: 'sms';
  senderNumber?: string;
  extractedUrl?: string;
  urlAnalysis?: UrlDetails;
}

// URL
export interface UrlAnalysisResult extends AnalysisResultBase {
  type: 'url';
  urlDetails: UrlDetails;
}

// Image
export interface ImageAnalysisResult extends AnalysisResultBase {
  type: 'image';
  ocrText: string;
  imageId: string;
  imageUrl?: string;                // 썸네일
}

// Union
export type AnalysisResult =
  | SmsAnalysisResult
  | UrlAnalysisResult
  | ImageAnalysisResult;

// ───────────────────────────────────────────
// 4. URL 상세 분석
// ───────────────────────────────────────────

export interface UrlDetails {
  domain: string;
  ssl: { valid: boolean; issuer: string; expiry: string };
  domainAge: number;                // days
  redirects: { url: string; status: number }[];
  ipCountry: string;
  similarDomains: string[];
  flags: { type: string; desc: string; severity: RiskLevel }[];
  // 정직 처리: VirusTotal 정보는 우리 백엔드가 VT API를 직접 호출해서 받은 결과만 표시.
  // mock에서 88/88 vendor 풀-리스트를 만들면 거짓. 백엔드 VT API 연동 시 자동 채워짐.
  vtVerdict?: VtVerdict;
}

// VirusTotal verdict (백엔드 VT API 연동 시 채워짐 — 정직 처리)
export interface VtVerdict {
  malicious: number;                // 악성 판정 vendor 수 (예: 1)
  suspicious: number;               // 의심 vendor 수 (예: 0)
  harmless: number;                 // 안전 vendor 수 (예: 79)
  undetected: number;               // 미검출 vendor 수 (예: 8)
  total: number;                    // 총 vendor 수 (예: 88)
  lastCheckedAt?: string;           // ISO 8601, 마지막 검증 시각
  status: 'pending' | 'completed' | 'failed' | 'not_checked';
  // 정직: 우리 4-위험 지표(도메인 나이/SSL/서버 국가/리디렉션)는 우리 자체 분석이므로 vtVerdict와 별개로 유지.
  // 한국형 사칭 패턴은 VT가 못 잡는 영역이라 별도 표시.
}

// ───────────────────────────────────────────
// 5. OCR 응답
// ───────────────────────────────────────────

export interface OcrResponse {
  imageId: string;                  // 후속 analyze 호출 시 사용
  text: string;
  confidence: number;               // 0~1
  blocks: { text: string; bbox: number[] }[];
}

// ───────────────────────────────────────────
// 6. 스미싱 유형 (한국어 — UI 노출)
// ───────────────────────────────────────────

export type SmishingType =
  | '택배 사칭'
  | '금융 피싱'
  | '공공기관 사칭'
  | '가족/지인 사칭'
  | '이벤트 사기'
  | '대출 사기'
  | '기타 사기'
  | '정상 문자';

// ───────────────────────────────────────────
// 7. 탐지 근거
// ───────────────────────────────────────────

export interface DetectionReason {
  code: string;                     // 'suspicious_url', 'family_phrase' 등
  label: string;                    // 사용자에게 표시
  severity: RiskLevel;
  matched: boolean;
}

// ───────────────────────────────────────────
// 8. 유사 사례 (RAG 결과)
// ───────────────────────────────────────────

export interface SimilarCase {
  id: string;
  title: string;
  similarity: number;               // 0~100
  year: string;
  category: SmishingType;
  preview?: string;                 // 사례 미리보기 (선택)
}

// ───────────────────────────────────────────
// 9. 정부기관 기준
// ───────────────────────────────────────────

export interface GovernmentCriterion {
  id: string;                       // 'url_included', 'impersonation' 등
  label: string;
  matched: boolean;
}

// ───────────────────────────────────────────
// 10. 피해 시나리오
// ───────────────────────────────────────────

export interface DamageStep {
  step: number;
  icon: DamageIcon;
  title: string;
  description: string;
}

// ───────────────────────────────────────────
// 11. 대응 가이드
// ───────────────────────────────────────────

export interface ActionGuideItem {
  priority: ActionPriority;
  action: string;
  detail?: string;
  contact?: { name: string; number: string };
}

// ───────────────────────────────────────────
// 12. 발신번호 조회
// ───────────────────────────────────────────

export interface SenderLookupResult {
  number: string;
  trustScore: number;               // 0~100
  status: SenderStatus;
  reportCount: number;
  lastReportedAt: string | null;    // ISO 8601
  categories: string[];
  history: { date: string; type: string; count: number }[];
  // 정직성: 통신사(isp)와 추정 지역(region)은 우리 백엔드가 정직하게 알 수 있는 정보가 아님.
  // 실제 통신사/지역 조회는 외부 API (KISA 번호 정보 조회, 통신사 DB 등) 연동이 필요하며
  // mock에서 추측해 채우면 거짓 데이터가 됨. 정직하게 필드 자체를 제거.
}

// ───────────────────────────────────────────
// 13. 검사 이력
// ───────────────────────────────────────────

export interface HistoryItem {
  id: string;
  type: AnalysisType;
  content: string;                  // 미리보기 (잘린)
  riskLevel: RiskLevel;
  riskScore: number;
  smishingType: SmishingType;
  sender?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;                     // 1-based
  pageSize: number;
  hasMore: boolean;
}

// ───────────────────────────────────────────
// 14. 신고
// ───────────────────────────────────────────

export interface ReportRequest {
  type: AnalysisType;
  content: string;
  category: SmishingType;
  sender?: string;
  url?: string;
  notes?: string;
  agreeShare: boolean;
}

export interface ReportResponse {
  receiptId: string;                // 'NB20260605-001234'
  status: ReportStatus;
  createdAt: string;
}

// ───────────────────────────────────────────
// 15. 피드백
// ───────────────────────────────────────────

export interface FeedbackRequest {
  analysisId: string;
  isCorrect: boolean;
  userComment?: string;
  correctLabel?: RiskLevel;          // 사용자가 생각하는 정답
}

// ───────────────────────────────────────────
// 16. 공유
// ───────────────────────────────────────────

export type ShareChannel = 'link' | 'kakao' | 'clipboard';

export interface ShareRequest {
  analysisId: string;
  channel: ShareChannel;
}

export interface ShareResponse {
  shareId: string;
  shortUrl: string;                 // 공유용 단축 URL
  expiresAt: string;
}

// ───────────────────────────────────────────
// 17. 비동기 작업 (OCR·샌드박스·VirusTotal)
// ───────────────────────────────────────────

export interface AsyncJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;                 // 0~100
  currentStep?: string;             // 'ocr' | 'vt_lookup' | 'sandbox' 등
  result?: unknown;                 // 완료 시 결과
  error?: ApiError;
}

// ───────────────────────────────────────────
// 18. 사례 / 교육 콘텐츠
// ───────────────────────────────────────────

export interface CaseStudy {
  id: string;
  year: string;
  title: string;
  category: SmishingType;
  damage: string;
  victims: string;
  method: string;
  actualTexts: string[];
  redFlags: string[];
  prevention: string[];
  outcome: string;
  severity: 'critical' | 'high' | 'medium';
  arrested: boolean;
}

export interface QuizQuestion {
  id: number;
  sender: string;
  message: string;
  isPhishing: boolean;
  explanation: string;
  category: SmishingType;
}

// ───────────────────────────────────────────
// 19. 표준 에러
// ───────────────────────────────────────────

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'MODEL_TIMEOUT'
  | 'OCR_FAILED'
  | 'SANDBOX_FAILED'
  | 'VIRUSTOTAL_FAILED'
  | 'INTERNAL';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ───────────────────────────────────────────
// 20. 공통 응답 래퍼 (선택)
// ───────────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}
