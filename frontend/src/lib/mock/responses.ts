/**
 * Mock 응답 데이터
 * ─────────────────────────────────
 * VITE_USE_MOCK=true 일 때 src/lib/api.ts 가 이 파일을 호출.
 * 실제 백엔드 응답과 동일한 모양으로 유지.
 *
 * 백엔드 준비되면 VITE_USE_MOCK=false 로 한 줄만 바꾸면 끝.
 */

import type {
  AnalysisRequest,
  SmsAnalysisResult,
  UrlAnalysisResult,
  ImageAnalysisResult,
  OcrResponse,
  SenderLookupResult,
  HistoryItem,
  Paginated,
  ReportResponse,
  ShareResponse,
  CaseStudy,
  DamageStep,
  DetectionReason,
  SimilarCase,
  ActionGuideItem,
} from '@/types/api';

// ───────────────────────────────────────────
// 공통 헬퍼
// ───────────────────────────────────────────

const nowIso = () => new Date().toISOString();

const receiptId = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  return `NB${ymd}-${seq}`;
};

const urlDetails = (url: string): UrlAnalysisResult['urlDetails'] => {
  const isSuspicious = /(pay|secure|login|verify|kr-|-refund|nhis|hometax|loan)/i.test(url);
  const domain = (() => {
    try { return new URL(url.startsWith('http') ? url : `http://${url}`).hostname; }
    catch { return url; }
  })();
  return {
    domain,
    ssl: {
      valid: !isSuspicious,
      issuer: isSuspicious ? 'Unknown / Self-signed' : "Let's Encrypt Authority X3",
      expiry: isSuspicious ? '만료됨' : '2026.12.31',
    },
    domainAge: isSuspicious ? 12 : 1820,
    redirects: isSuspicious
      ? [{ url, status: 301 }, { url: `http://redir.${domain}`, status: 200 }]
      : [],
    ipCountry: isSuspicious ? 'CN' : 'KR',
    similarDomains: isSuspicious ? [`${domain.split('.')[0]}.or.kr`, `${domain.split('.')[0]}.go.kr`] : [],
    flags: isSuspicious
      ? [
          { type: '유사 도메인', desc: '한국 공공기관/기업명을 포함하지만 공식 도메인이 아닙니다', severity: 'high' },
          { type: '의심 TLD', desc: '피싱에 자주 사용되는 패턴', severity: 'medium' },
        ]
      : [{ type: '이상 없음', desc: '명시적인 위험 징후가 발견되지 않았습니다', severity: 'low' }],
  };
};

const damageSteps: DamageStep[] = [
  { step: 1, icon: 'message', title: '문자 수신', description: '의심 문자가 휴대폰에 도착합니다' },
  { step: 2, icon: 'click', title: '링크 클릭', description: '문자 안의 URL을 클릭합니다' },
  { step: 3, icon: 'site', title: '가짜 사이트 이동', description: '공식과 유사한 피싱 사이트로 이동합니다' },
  { step: 4, icon: 'info', title: '개인정보 입력', description: '주민번호, 계좌번호, 인증번호 등을 입력합니다' },
  { step: 5, icon: 'damage', title: '금전 피해', description: '계좌 이체, 카드 부정사용 등 금전 피해 발생' },
];



// ───────────────────────────────────────────
// SMS 분석 응답 생성
// ───────────────────────────────────────────

function buildSmsResult(req: AnalysisRequest & { content: string }): SmsAnalysisResult {
  const text = req.content;
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const url = urlMatch?.[0];

  const familyWords = ['엄마', '아빠', '아들', '딸', '폰 고장', '번호 바뀌', '급하'];
  const hasFamilyPattern = familyWords.filter((w) => text.includes(w)).length >= 2;

  const impersonation =
    (text.includes('국민건강보험') && !url?.includes('nhis.or.kr')) ||
    (text.includes('KB국민은행') && !url?.includes('kbstar.com')) ||
    (text.includes('CJ대한통운') && !url?.includes('cjlogistics.com'));

  const urgencyWords = ['즉시', '정지', '동결', '납부', '긴급', '비정상', '환급', '상품권', '급하', '빨리', '혐의', '차단'];
  const urgencyCount = urgencyWords.filter((k) => text.includes(k)).length;
  const hasPayment = text.includes('상품권') || text.includes('송금') || text.includes('결제');
  const hasPersonalInfo = text.includes('주민번호') || text.includes('카드번호') || text.includes('비밀번호') || text.includes('인증번호');

  const reasons: DetectionReason[] = [];
  const actionGuide: ActionGuideItem[] = [];
  let smishingType: SmsAnalysisResult['smishingType'];
  let riskLevel: SmsAnalysisResult['riskLevel'];
  let riskScore: number;

  if (hasFamilyPattern && hasPayment) {
    riskLevel = 'high';
    riskScore = 92;
    smishingType = '가족/지인 사칭';
    reasons.push({ code: 'family_pattern', label: '가족이나 지인을 사칭하는 표현이 포함되어 있습니다', severity: 'high', matched: true });
    reasons.push({ code: 'payment_request', label: '상품권 또는 금전 결제를 요구하고 있습니다', severity: 'high', matched: true });
    reasons.push({ code: 'urgency', label: '긴급성을 강조하는 심리적 압박 표현이 있습니다', severity: 'high', matched: true });
    actionGuide.push({ priority: 'critical', action: '상품권을 절대 구매하지 마세요', detail: '어떤 경우에도 상품권을 사서 번호를 알려주지 마세요' });
    actionGuide.push({ priority: 'high', action: '기존 번호로 직접 전화해 확인하세요', contact: { name: '경찰청 사이버범죄', number: '182' } });
    actionGuide.push({ priority: 'normal', action: '경찰청 182에 신고하세요' });
  } else if (impersonation && url) {
    riskLevel = 'high';
    riskScore = 88;
    smishingType = '공공기관 사칭';
    reasons.push({ code: 'impersonation', label: '공공기관 또는 기업을 사칭하고 있습니다', severity: 'high', matched: true });
    reasons.push({ code: 'suspicious_url', label: '공식 도메인이 아닌 의심스러운 URL이 포함되어 있습니다', severity: 'high', matched: true });
    reasons.push({ code: 'urgency', label: '긴급성을 강조하는 표현이 포함되어 있습니다', severity: 'medium', matched: urgencyCount > 0 });
    actionGuide.push({ priority: 'critical', action: '링크를 절대 클릭하지 마세요' });
    actionGuide.push({ priority: 'critical', action: '개인정보나 인증번호를 입력하지 마세요' });
    actionGuide.push({ priority: 'normal', action: '공식 앱이나 대표번호(1577-1000 등)로 직접 확인하세요' });
  } else if (url && hasPersonalInfo) {
    riskLevel = 'high';
    riskScore = 78;
    smishingType = '기타 사기';
    reasons.push({ code: 'suspicious_url', label: '의심스러운 URL과 개인정보 요구가 있습니다', severity: 'high', matched: true });
    reasons.push({ code: 'personal_info_request', label: '개인정보 입력을 요구하고 있습니다', severity: 'high', matched: true });
    actionGuide.push({ priority: 'critical', action: '절대 개인정보를 입력하지 마세요' });
    actionGuide.push({ priority: 'normal', action: '공식 경로로 확인하세요' });
  } else if (urgencyCount >= 2) {
    riskLevel = 'medium';
    riskScore = 48;
    smishingType = '기타 사기';
    reasons.push({ code: 'urgency', label: '긴급성을 강조하는 표현이 여러 개 포함되어 있습니다', severity: 'medium', matched: true });
    reasons.push({ code: 'pressure', label: '심리적 압박을 유발하는 패턴이 감지됩니다', severity: 'medium', matched: true });
    actionGuide.push({ priority: 'high', action: '서두르지 말고 공식 경로로 확인하세요' });
    actionGuide.push({ priority: 'normal', action: '개인정보 입력 요구 시 반드시 의심하세요' });
  } else {
    riskLevel = 'low';
    riskScore = 18;
    smishingType = '정상 문자';
    reasons.push({ code: 'no_url', label: '위험 URL이 발견되지 않았습니다', severity: 'low', matched: false });
    reasons.push({ code: 'no_payment', label: '금전 요구 표현이 발견되지 않았습니다', severity: 'low', matched: false });
    reasons.push({ code: 'no_impersonation', label: '사칭 의심 표현이 낮습니다', severity: 'low', matched: false });
    actionGuide.push({ priority: 'normal', action: '그래도 개인정보나 금융정보 입력을 요구한다면 반드시 의심하세요' });
  }

  const similarCases: SimilarCase[] =
    riskLevel === 'high'
      ? [
          { id: 'c1', title: '택배 회사 사칭 배송 주소 확인 유도형', similarity: 87, year: '2024', category: '공공기관 사칭' },
          { id: 'c2', title: '공공기관 환급금 명목 피싱', similarity: 74, year: '2024', category: '공공기관 사칭' },
          { id: 'c3', title: '가족 사칭 상품권 요구형', similarity: 69, year: '2026', category: '가족/지인 사칭' },
        ]
      : riskLevel === 'medium'
        ? [
            { id: 'c4', title: '단축 URL 포함 확인 유도 문자', similarity: 71, year: '2025', category: '기타 사기' },
            { id: 'c5', title: '이벤트 당첨 가장 링크 연결형', similarity: 58, year: '2025', category: '이벤트 사기' },
          ]
        : [];

  const reasonsWithMatched: DetectionReason[] = reasons.map((c) => {
    if (c.code === 'impersonation') return { ...c, matched: impersonation };
    if (c.code === 'payment_request') return { ...c, matched: hasPayment };
    if (c.code === 'personal_info_request') return { ...c, matched: hasPersonalInfo };
    return c;
  });

  return {
    id: `anl_${Date.now()}`,
    type: 'sms',
    content: text,
    riskLevel,
    riskScore,
    smishingType,
    reasons: reasonsWithMatched,
    actionGuide,
    similarCases,
    damageScenario: riskLevel !== 'low' ? damageSteps : undefined,
    modelVersion: 'kc-electra-v1.2.3',
    processingTime: 800 + Math.floor(Math.random() * 800),
    cacheHit: false,
    createdAt: nowIso(),
    senderNumber: req.sender,
    extractedUrl: url,
    urlAnalysis: url ? urlDetails(url) : undefined,
  };
}

function buildUrlResult(req: AnalysisRequest & { content: string }): UrlAnalysisResult {
  const url = req.content;
  const details = urlDetails(url);
  const isDanger = details.flags.some((f) => f.severity === 'high');
  const isCaution = details.flags.some((f) => f.severity === 'medium');

  return {
    id: `anl_${Date.now()}`,
    type: 'url',
    content: url,
    riskLevel: isDanger ? 'high' : isCaution ? 'medium' : 'low',
    riskScore: isDanger ? 85 : isCaution ? 50 : 15,
    smishingType: '기타 사기',
    reasons: details.flags.map((f) => ({
      code: f.type,
      label: f.desc,
      severity: f.severity,
      matched: f.severity !== 'low',
    })),
    actionGuide: isDanger
      ? [
          { priority: 'critical', action: '이 URL은 절대 클릭하거나 방문하지 마세요' },
          { priority: 'high', action: '이미 클릭했다면 즉시 인터넷을 끄고 비밀번호를 변경하세요' },
          { priority: 'normal', action: '의심 URL을 신고해주세요', contact: { name: 'KISA 사이버신고센터', number: '118' } },
        ]
      : [{ priority: 'normal', action: '공식 도메인을 다시 한번 확인하세요' }],
    similarCases: isDanger
      ? [
          { id: 'c1', title: '피싱 도메인 사칭 사례', similarity: 82, year: '2025', category: '기타 사기' },
        ]
      : [],
    damageScenario: isDanger ? damageSteps : undefined,
    modelVersion: 'url-classifier-v1.0',
    processingTime: 600 + Math.floor(Math.random() * 500),
    cacheHit: false,
    createdAt: nowIso(),
    urlDetails: details,
  };
}

function buildImageResult(req: AnalysisRequest & { content: string; imageId?: string }): ImageAnalysisResult {
  // image 분석은 content에 OCR 결과 텍스트가 들어옴
  // (실제로는 /api/ocr 먼저 호출 후 받은 ocrText로 analyze)
  const ocrText = req.content;
  const smsResult = buildSmsResult({ type: 'sms', content: ocrText });
  return {
    ...smsResult,
    id: `anl_${Date.now()}`,
    type: 'image',
    content: ocrText,
    ocrText,
    imageId: req.imageId ?? `img_${Date.now()}`,
    imageUrl: undefined,
  };
}

// ───────────────────────────────────────────
// Mock 데이터 — 발신번호
// ───────────────────────────────────────────

const senderDb: Record<string, SenderLookupResult> = {
  '010-8821-3947': {
    number: '010-8821-3947',
    trustScore: 12,
    status: 'danger',
    reportCount: 342,
    lastReportedAt: '2026-06-04T14:23:00+09:00',
    categories: ['공공기관 사칭', '보험 피싱'],
    history: [
      { date: '2026.06.04', type: '공공기관 사칭', count: 47 },
      { date: '2026.05.28', type: '보험 피싱', count: 31 },
      { date: '2026.05.21', type: '공공기관 사칭', count: 28 },
    ],
  },
  '010-3392-1847': {
    number: '010-3392-1847',
    trustScore: 18,
    status: 'danger',
    reportCount: 218,
    lastReportedAt: '2026-06-05T09:12:00+09:00',
    categories: ['보이스피싱', '기관 사칭'],
    history: [
      { date: '2026.06.05', type: '보이스피싱', count: 22 },
      { date: '2026.05.29', type: '기관 사칭', count: 18 },
    ],
  },
  '1588-1234': {
    number: '1588-1234',
    trustScore: 92,
    status: 'safe',
    reportCount: 0,
    lastReportedAt: null,
    categories: [],
    history: [],
  },
};

function mockSenderLookup(number: string): SenderLookupResult {
  return (
    senderDb[number] ?? {
      number,
      trustScore: 60 + Math.floor(Math.random() * 30),
      status: 'caution',
      reportCount: 0,
      lastReportedAt: null,
      categories: [],
      history: [],
    }
  );
}

// ───────────────────────────────────────────
// Mock 데이터 — 이력
// ───────────────────────────────────────────

const mockHistoryItems: HistoryItem[] = [
  { id: 'h1', type: 'sms', content: '【국민건강보험】미납보험료 89,200원이 있습니다. 즉시 납부...', riskLevel: 'high', riskScore: 88, smishingType: '공공기관 사칭', sender: '0212345678', createdAt: '2026-06-05T14:32:11+09:00' },
  { id: 'h2', type: 'sms', content: '카카오 인증번호는 [394821]입니다. 타인에게 절대 알려주지...', riskLevel: 'low', riskScore: 8, smishingType: '정상 문자', sender: '카카오', createdAt: '2026-06-05T13:18:44+09:00' },
  { id: 'h3', type: 'sms', content: '[CJ대한통운] 고객님의 택배가 주소불명으로 반송될 예정입니다...', riskLevel: 'high', riskScore: 82, smishingType: '택배 사칭', sender: '010-5839-2847', createdAt: '2026-06-04T19:45:02+09:00' },
  { id: 'h4', type: 'url', content: 'http://prize-samsung.xyz/claim', riskLevel: 'high', riskScore: 95, smishingType: '이벤트 사기', createdAt: '2026-06-04T11:22:31+09:00' },
  { id: 'h5', type: 'sms', content: '【KB국민은행】 고객님의 계좌에서 비정상 접근이 감지되었습니다...', riskLevel: 'high', riskScore: 90, smishingType: '금융 피싱', sender: '0215889999', createdAt: '2026-06-03T09:05:00+09:00' },
  { id: 'h6', type: 'sms', content: '엄마 나 폰 고장나서 번호 바뀌었어. 급하게 상품권 결제 좀...', riskLevel: 'high', riskScore: 93, smishingType: '가족/지인 사칭', sender: '010-9382-7461', createdAt: '2026-06-02T16:40:00+09:00' },
];

// ───────────────────────────────────────────
// Mock 데이터 — 사례
// ───────────────────────────────────────────

const mockCases: CaseStudy[] = [
  {
    id: 'c1',
    year: '2024',
    title: '국민건강보험 사칭 대규모 피싱 캠페인',
    category: '공공기관 사칭',
    damage: '약 42억원',
    victims: '1만 8천명',
    method: '공공기관 공식 발신번호 스푸핑 + 가짜 납부 페이지',
    actualTexts: [
      '【국민건강보험】미납보험료 89,200원이 있습니다. 즉시 납부하지 않으면 급여가 정지됩니다. http://nhis-pay.kr-notice.com/pay',
    ],
    redFlags: ['nhis.or.kr이 아닌 다른 도메인', '급여 정지 위협', '즉시 납부 요구'],
    prevention: ['nhis.or.kr 공식 사이트에서 직접 확인', '전화로 공단에 직접 문의', '링크 클릭 금지'],
    outcome: '2024년 11월 사이버수사대 검거, 피의자 7명 구속. 서버는 중국 소재.',
    severity: 'critical',
    arrested: true,
  },
  {
    id: 'c2',
    year: '2024',
    title: '택배 배송 불가 대규모 스미싱',
    category: '택배 사칭',
    damage: '약 18억원',
    victims: '6천 200명',
    method: 'CJ대한통운·쿠팡·롯데택배 순환 사칭 + 배송비 결제 유도',
    actualTexts: [
      '[CJ대한통운] 고객님의 택배가 주소불명으로 반송될 예정입니다. 배송 재신청: http://cjlogistics.re-delivery.net/confirm',
    ],
    redFlags: ['공식 도메인 아닌 유사 URL', '배송비 직접 결제 요구', '개인번호 발신'],
    prevention: ['앱에서 직접 배송 조회', '배송비는 절대 SMS 링크로 결제 금지', '의심 전화번호 112 신고'],
    outcome: '현재 수사 중. 피의자 해외 도피 추정.',
    severity: 'high',
    arrested: false,
  },
  {
    id: 'c3',
    year: '2023',
    title: 'KB국민은행 보안 점검 피싱',
    category: '금융 피싱',
    damage: '약 63억원',
    victims: '2만 4천명',
    method: '은행 공식 앱 UI 완벽 복제 + 보안 인증서 위조',
    actualTexts: [
      '【KB국민은행】고객님의 계좌에서 비정상 접근이 감지되었습니다. 24시간 내 본인확인 필수. 확인: http://kbbank-secure.com/verify',
    ],
    redFlags: ['kbstar.com이 아닌 도메인', '24시간 기한 압박', 'OTP 전체 입력 요구'],
    prevention: ['OTP는 누구에게도 공유 금지', '은행 공식 앱만 사용'],
    outcome: '2024년 3월 검거. 주범 1명 징역 8년.',
    severity: 'critical',
    arrested: true,
  },
];

// ───────────────────────────────────────────
// Mock 핸들러 (라우터 역할)
// ───────────────────────────────────────────

type Handler = (body: unknown) => unknown;

class MockRouter {
  private routes: Map<string, Handler> = new Map();

  /** path + method 등록 (대소문자 무시) */
  register(method: string, path: string, handler: Handler) {
    this.routes.set(`${method.toUpperCase()} ${path.toUpperCase()}`, handler);
  }

  has(path: string, method: string): boolean {
    return this.routes.has(`${method.toUpperCase()} ${path.toUpperCase()}`);
  }

  invoke<T>(path: string, method: string, body: unknown): T {
    const key = `${method.toUpperCase()} ${path.toUpperCase()}`;
    const handler = this.routes.get(key);
    if (!handler) {
      throw {
        code: 'NOT_FOUND',
        message: `Mock route not found: ${method} ${path}`,
      };
    }
    return handler(body) as T;
  }
}

export const mockHandle = new MockRouter();

// ── 라우트 등록 ──

// 분석
mockHandle.register('POST', '/api/analyze', (body) => {
  const req = body as AnalysisRequest;
  if (req.type === 'sms') return buildSmsResult({ type: 'sms', content: req.content, sender: req.sender });
  if (req.type === 'url') return buildUrlResult({ type: 'url', content: req.content });
  if (req.type === 'image') return buildImageResult({ type: 'image', content: req.content, imageId: req.imageId });
  throw { code: 'INVALID_INPUT', message: `Unknown type: ${req.type}` };
});

// OCR
mockHandle.register('POST', '/api/ocr', (_body) => {
  return {
    imageId: `img_${Date.now()}`,
    text: '【CJ대한통운】배송 주소 확인이 필요합니다. 주소 오류로 반송 예정입니다. 확인: http://cj-delivery-check.com/re123',
    confidence: 0.92,
    blocks: [],
  } satisfies OcrResponse;
});

// 발신번호
mockHandle.register('GET', '/api/sender/010-8821-3947', () => mockSenderLookup('010-8821-3947'));
mockHandle.register('GET', '/api/sender/010-3392-1847', () => mockSenderLookup('010-3392-1847'));
mockHandle.register('GET', '/api/sender/1588-1234', () => mockSenderLookup('1588-1234'));

// 이력
mockHandle.register('GET', '/api/history', () => ({
  items: mockHistoryItems,
  total: mockHistoryItems.length,
  page: 1,
  pageSize: 20,
  hasMore: false,
} satisfies Paginated<HistoryItem>));

mockHandle.register('GET', '/api/history/h1', () => buildSmsResult({ type: 'sms', content: mockHistoryItems[0].content }));
mockHandle.register('GET', '/api/history/h3', () => buildSmsResult({ type: 'sms', content: mockHistoryItems[2].content }));
mockHandle.register('GET', '/api/history/h4', () => buildUrlResult({ type: 'url', content: mockHistoryItems[3].content }));

// 신고
mockHandle.register('POST', '/api/reports', (_body) => {
  const id = receiptId();
  // (실제로는 DB에 저장)
  return {
    receiptId: id,
    status: 'received',
    createdAt: nowIso(),
  } satisfies ReportResponse;
});

mockHandle.register('GET', '/api/reports/NB20260605-001234', () => ({
  receiptId: 'NB20260605-001234',
  status: 'received',
  createdAt: '2026-06-05T14:32:00+09:00',
} satisfies ReportResponse));

// 피드백
mockHandle.register('POST', '/api/feedback', () => ({ ok: true as const }));

// 공유
mockHandle.register('POST', '/api/share', (_body) => {
  return {
    shareId: `shr_${Date.now()}`,
    shortUrl: `https://nb.shield/r/${Date.now().toString(36)}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  } satisfies ShareResponse;
});

// 사례
mockHandle.register('GET', '/api/cases', () => ({
  items: mockCases,
  total: mockCases.length,
  page: 1,
  pageSize: 20,
  hasMore: false,
} satisfies Paginated<CaseStudy>));

mockHandle.register('GET', '/api/cases/c1', () => mockCases[0]);
mockHandle.register('GET', '/api/cases/c2', () => mockCases[1]);
mockHandle.register('GET', '/api/cases/c3', () => mockCases[2]);

// 비동기 작업 (예시)
mockHandle.register('GET', '/api/jobs/job_demo_001', () => ({
  jobId: 'job_demo_001',
  status: 'completed',
  progress: 100,
  currentStep: 'done',
  result: null,
}));
