/**
 * NewBiz Shield — SMS 분석 (클라이언트 사이드)
 * ─────────────────────────────────
 * 3개 컴포넌트(Analyzer / SeniorAnalyzer / AnalysisResult)에 중복되어 있던
 * analyzeText를 단일 함수로 통합. 백엔드 미연동 시 UI 즉시 피드백용으로 사용.
 *
 * 백엔드 연동 후에는 src/lib/api.ts 의 api.analyze() 가 같은 도메인 규칙을
 * 적용하되, 본 함수는 "오프라인 미리보기 / 데모" 용도로 유지.
 *
 * 반환 타입은 컴포넌트들이 기대하던 snake_case + reasons/action_guide(string[])
 * shape 를 유지해서, 기존 JSX / Card 컴포넌트 시그니처를 깨지 않도록 함.
 *
 * riskLevel 은 types/api.ts 의 'high' | 'medium' | 'low' (소문자) 로 통일.
 */

import type { RiskLevel } from '@/types/api';

// ───────────────────────────────────────────
// 패턴 정의 (한 곳에 모음)
// ───────────────────────────────────────────

/** 의심스러운 URL 패턴 (소문자 비교) */
const SUSPICIOUS_URL_PATTERNS = [
  '.kr-',
  '-pay.',
  're-delivery',
  '-secure.',
  'verify',
  'confirm',
  'nhis-',
  'kb-',
  '-refund',
];

/** 가족/지인 사칭 패턴 */
const FAMILY_WORDS = ['엄마', '아빠', '아들', '딸', '폰 고장', '번호 바뀌', '급하'];

/** 사칭 의심 기관/기업 */
const IMPERSONATION_INSTITUTIONS = [
  { keyword: '국민건강보험', officialDomain: 'nhis.or.kr' },
  { keyword: 'KB국민은행', officialDomain: 'kbstar.com' },
  { keyword: 'CJ대한통운', officialDomain: 'cjlogistics.com' },
] as const;

/** 긴급성 강조 키워드 (SeniorAnalyzer에 있던 '긁' 오타 제거) */
export const URGENCY_KEYWORDS = [
  '즉시', '정지', '동결', '납부', '긴급', '비정상',
  '환급', '상품권', '급하', '빨리', '혐의', '차단',
] as const;

/** 금전 요구 키워드 */
const PAYMENT_KEYWORDS = ['상품권', '송금', '결제'];

/** 개인정보 요구 키워드 */
const PERSONAL_INFO_KEYWORDS = ['주민번호', '카드번호', '비밀번호', '인증번호'];

// ───────────────────────────────────────────
// 유사 사례 (RAG 결과 자리 — 실제 백엔드에서는 API 응답으로 대체)
// ───────────────────────────────────────────

const SIMILAR_CASES_HIGH = [
  { title: '택배 회사 사칭 배송 주소 확인 유도형', similarity: 87, year: '2026' },
  { title: '공공기관 환급금 명목 피싱', similarity: 74, year: '2025' },
  { title: '가족 사칭 상품권 요구형', similarity: 69, year: '2026' },
];

const SIMILAR_CASES_MEDIUM = [
  { title: '단축 URL 포함 확인 유도 문자', similarity: 71, year: '2025' },
  { title: '이벤트 당첨 가장 링크 연결형', similarity: 58, year: '2025' },
];

// ───────────────────────────────────────────
// 결과 타입
// ───────────────────────────────────────────

export interface SmsAnalysis {
  /** 'high' | 'medium' | 'low' — types/api.ts RiskLevel 통일 */
  risk_level: RiskLevel;
  /** 0~100 정수 */
  risk_score: number;
  /** 사용자 노출 한국어 라벨 (예: "지인 사칭형") */
  smishing_type: string;
  /** 사용자에게 보여줄 탐지 근거 (한국어) */
  reasons: string[];
  /** 사용자에게 보여줄 대응 가이드 (한국어) */
  action_guide: string[];
  /** 시그널 플래그 (GovernmentCriteriaCard 등에서 사용) */
  has_url: boolean;
  has_impersonation: boolean;
  has_payment_request: boolean;
  has_personal_info_request: boolean;
  /** RAG 결과 (high/medium 일 때만 채워짐) */
  similar_cases: { title: string; similarity: number; year: string }[];
  /** 추출된 URL (있으면) */
  url: string | null;
}

// ───────────────────────────────────────────
// 메인 분석 함수
// ───────────────────────────────────────────

/**
 * SMS 텍스트 한 건을 분석해서 SmsAnalysis 반환.
 * - rule-based 휴리스틱 (URL 패턴, 가족 어휘, 사칭 기관, 긴급성, 금전, 개인정보)
 * - 백엔드 연동 전 단계의 UI 미리보기 / 데모 / 폴백 용도
 */
export function analyzeSms(text: string): SmsAnalysis {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : null;
  const hasUrl = url !== null;

  const hasSuspiciousUrl =
    hasUrl && url !== null &&
    SUSPICIOUS_URL_PATTERNS.some((p) => url.toLowerCase().includes(p));

  const hasFamilyPattern = FAMILY_WORDS.filter((w) => text.includes(w)).length >= 2;

  const hasImpersonation = IMPERSONATION_INSTITUTIONS.some(
    ({ keyword, officialDomain }) =>
      text.includes(keyword) && !url?.includes(officialDomain),
  );

  const urgencyCount = URGENCY_KEYWORDS.filter((k) => text.includes(k)).length;
  const hasPaymentRequest = PAYMENT_KEYWORDS.some((k) => text.includes(k));
  const hasPersonalInfoRequest = PERSONAL_INFO_KEYWORDS.some((k) => text.includes(k));

  // ── 분기별 결과 (점수 / 사유 / 가이드) ──
  let risk_level: RiskLevel;
  let risk_score: number;
  let smishing_type: string;
  const reasons: string[] = [];
  const action_guide: string[] = [];

  if (hasFamilyPattern && hasPaymentRequest) {
    risk_level = 'high';
    risk_score = 92;
    smishing_type = '지인 사칭형';
    reasons.push('가족이나 지인을 사칭하는 표현이 포함되어 있습니다.');
    reasons.push('상품권 또는 금전 결제를 요구하고 있습니다.');
    reasons.push('긴급성을 강조하는 심리적 압박 표현이 있습니다.');
    action_guide.push('상품권을 절대 구매하지 마세요.');
    action_guide.push('기존 번호로 직접 전화해 확인하세요.');
    action_guide.push('경찰청 사이버범죄신고 182에 신고하세요.');
  } else if (hasImpersonation && hasSuspiciousUrl) {
    risk_level = 'high';
    risk_score = 88;
    smishing_type = '공공기관 사칭형';
    reasons.push('공공기관 또는 기업을 사칭하고 있습니다.');
    reasons.push('공식 도메인이 아닌 의심스러운 URL이 포함되어 있습니다.');
    reasons.push('긴급성을 강조하는 표현이 포함되어 있습니다.');
    action_guide.push('링크를 절대 클릭하지 마세요.');
    action_guide.push('개인정보나 인증번호를 입력하지 마세요.');
    action_guide.push('공식 앱이나 대표번호(1577-1000 등)로 직접 확인하세요.');
  } else if (hasSuspiciousUrl) {
    risk_level = 'medium';
    risk_score = 56;
    smishing_type = '의심 링크 포함';
    reasons.push('의심스러운 URL이 포함되어 있습니다.');
    reasons.push('클릭을 유도하는 표현이 있습니다.');
    if (text.includes('배송') || text.includes('택배')) {
      reasons.push('배송 관련 표현이 포함되어 있습니다.');
    }
    action_guide.push('링크를 바로 클릭하지 마세요.');
    action_guide.push('공식 앱이나 고객센터에서 먼저 확인하세요.');
  } else if (urgencyCount >= 2) {
    risk_level = 'medium';
    risk_score = 48;
    smishing_type = '긴급성 강조형';
    reasons.push('긴급성을 강조하는 표현이 여러 개 포함되어 있습니다.');
    reasons.push('심리적 압박을 유발하는 패턴이 감지됩니다.');
    action_guide.push('서두르지 말고 공식 경로로 확인하세요.');
    action_guide.push('개인정보 입력 요구 시 반드시 의심하세요.');
  } else {
    risk_level = 'low';
    risk_score = 18;
    smishing_type = '정상 문자';
    reasons.push('위험 URL이 발견되지 않았습니다.');
    reasons.push('금전 요구 표현이 발견되지 않았습니다.');
    reasons.push('사칭 의심 표현이 낮습니다.');
    action_guide.push('그래도 개인정보나 금융정보 입력을 요구한다면 반드시 의심하세요.');
  }

  return {
    risk_level,
    risk_score,
    smishing_type,
    reasons,
    action_guide,
    has_url: hasUrl,
    has_impersonation: hasImpersonation,
    has_payment_request: hasPaymentRequest,
    has_personal_info_request: hasPersonalInfoRequest,
    similar_cases:
      risk_level === 'high' ? SIMILAR_CASES_HIGH :
      risk_level === 'medium' ? SIMILAR_CASES_MEDIUM :
      [],
    url,
  };
}

// ───────────────────────────────────────────
// 시니어 모드 어투 변환
// ───────────────────────────────────────────

/**
 * Analyzer가 생성한 정식 한국어 reasons/action_guide 를
 * SeniorAnalyzer가 보여줄 쉬운 어투로 매핑.
 * 매핑에 없는 텍스트는 그대로 반환 (안전).
 */
const SENIOR_REASON_MAP: Record<string, string> = {
  '가족이나 지인을 사칭하는 표현이 포함되어 있습니다.': '가족을 사칭하는 표현이 있습니다.',
  '상품권 또는 금전 결제를 요구하고 있습니다.': '상품권이나 돈을 요구하고 있습니다.',
  '긴급성을 강조하는 심리적 압박 표현이 있습니다.': '긴급하다며 서두르게 만듭니다.',
  '공공기관 또는 기업을 사칭하고 있습니다.': '국민건강보험이나 은행을 사칭하고 있습니다.',
  '공식 도메인이 아닌 의심스러운 URL이 포함되어 있습니다.': '가짜 인터넷 주소(링크)가 포함되어 있습니다.',
  '긴급성을 강조하는 표현이 포함되어 있습니다.': '긴급하다며 불안하게 만듭니다.',
  '의심스러운 URL이 포함되어 있습니다.': '의심스러운 인터넷 주소(링크)가 있습니다.',
  '클릭을 유도하는 표현이 있습니다.': '확인을 유도하는 표현이 있습니다.',
  '위험 URL이 발견되지 않았습니다.': '위험한 링크가 발견되지 않았습니다.',
  '금전 요구 표현이 발견되지 않았습니다.': '돈을 요구하는 표현이 없습니다.',
  '사칭 의심 표현이 낮습니다.': '사칭하는 표현이 없습니다.',
};

const SENIOR_ACTION_MAP: Record<string, string> = {
  '상품권을 절대 구매하지 마세요.': '상품권을 절대 구매하지 마세요.',
  '기존 번호로 직접 전화해 확인하세요.': '가족에게 기존 번호로 직접 전화해서 확인하세요.',
  '경찰청 사이버범죄신고 182에 신고하세요.': '경찰청 182에 신고하세요.',
  '링크를 절대 클릭하지 마세요.': '링크를 절대 누르지 마세요.',
  '개인정보나 인증번호를 입력하지 마세요.': '개인정보나 비밀번호를 절대 입력하지 마세요.',
  '공식 앱이나 대표번호(1577-1000 등)로 직접 확인하세요.': '공식 앱이나 대표번호로 직접 확인하세요.',
  '링크를 바로 클릭하지 마세요.': '링크를 바로 누르지 마세요.',
  '공식 앱이나 고객센터에서 먼저 확인하세요.': '공식 앱이나 고객센터로 확인하세요.',
};

const toSenior = (items: string[], map: Record<string, string>): string[] =>
  items.map((t) => map[t] ?? t);

export function toSeniorReasons(reasons: string[]): string[] {
  return toSenior(reasons, SENIOR_REASON_MAP);
}

export function toSeniorActions(actionGuide: string[]): string[] {
  return toSenior(actionGuide, SENIOR_ACTION_MAP);
}

// ───────────────────────────────────────────
// 컴포넌트 호환 어댑터
// ───────────────────────────────────────────

/**
 * 기존 컴포넌트(result/* 카드, Analyzer, SeniorAnalyzer)가 기대하던 키.
 * 새 API Contract enum (high/medium/low) ↔ 레거시 키 (danger/warning/normal) 변환.
 * 추후 result/* 카드 prop 타입을 새 enum으로 마이그레이션하면 이 어댑터는 제거 가능.
 */
export type LegacyRiskLevel = 'danger' | 'warning' | 'normal';

export function toLegacyRiskLevel(level: RiskLevel): LegacyRiskLevel {
  switch (level) {
    case 'high':   return 'danger';
    case 'medium': return 'warning';
    case 'low':    return 'normal';
  }
}
