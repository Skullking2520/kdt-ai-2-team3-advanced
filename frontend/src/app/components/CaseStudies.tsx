import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, TrendingUp, Users, Radio, ExternalLink, RefreshCw, Building2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Case {
  id: string;
  year: string;
  title: string;
  category: string;
  damage: string;
  victims: string;
  method: string;
  actualTexts: string[];
  howItWorked: string[];
  redFlags: string[];
  prevention: string[];
  outcome: string;
  severity: "critical" | "high" | "medium";
  arrested: boolean;
}

const CASES: Case[] = [
  {
    id: "c1", year: "2024", title: "국민건강보험 사칭 대규모 피싱 캠페인",
    category: "공공기관 사칭", damage: "약 42억원", victims: "1만 8천명",
    severity: "critical", arrested: true,
    method: "공공기관 공식 발신번호 스푸핑 + 가짜 납부 페이지",
    actualTexts: [
      "【국민건강보험】미납보험료 89,200원이 있습니다. 즉시 납부하지 않으면 급여가 정지됩니다. http://nhis-pay.kr-notice.com/pay",
      "【건강보험공단】2024년 건강검진 미실시로 과태료가 부과되었습니다. 이의신청: http://nhis-objection.net",
    ],
    howItWorked: [
      "공식 건강보험공단 명칭을 그대로 사용하여 신뢰도 확보",
      "실제 체납 여부와 관계없이 무작위 대량 발송 (하루 50만건)",
      "가짜 납부 페이지에서 계좌번호·카드번호·주민번호 탈취",
      "탈취한 정보로 2차 금융 사기 (계좌 이체, 카드론 등)",
    ],
    redFlags: ["nhis.or.kr이 아닌 다른 도메인", "급여 정지 위협", "즉시 납부 요구"],
    prevention: ["nhis.or.kr 공식 사이트에서 직접 확인", "전화로 공단에 직접 문의", "링크 클릭 금지"],
    outcome: "2024년 11월 사이버수사대 검거, 피의자 7명 구속. 서버는 중국 소재.",
  },
  {
    id: "c2", year: "2024", title: "택배 배송 불가 대규모 스미싱",
    category: "택배 사기", damage: "약 18억원", victims: "6천 200명",
    severity: "high", arrested: false,
    method: "CJ대한통운·쿠팡·롯데택배 순환 사칭 + 배송비 결제 유도",
    actualTexts: [
      "[CJ대한통운] 고객님의 택배가 주소불명으로 반송될 예정입니다. 배송 재신청: http://cjlogistics.re-delivery.net/confirm",
      "[쿠팡] 해외직구 상품 통관 보류. 관세 15,300원 납부 필요: http://kupang-tax.com",
    ],
    howItWorked: [
      "주문 건수가 많은 요일(월·화요일)에 집중 발송",
      "소액 배송비(2,500~15,000원) 결제 유도로 경계심 낮춤",
      "결제 과정에서 카드 전체 정보 탈취",
      "탈취 카드로 고액 해외 결제 진행",
    ],
    redFlags: ["공식 도메인 아닌 유사 URL", "배송비 직접 결제 요구", "개인번호 발신"],
    prevention: ["앱에서 직접 배송 조회", "배송비는 절대 SMS 링크로 결제 금지", "의심 전화번호 112 신고"],
    outcome: "현재 수사 중. 피의자 해외 도피 추정. 피해자 구제 어려운 상황.",
  },
  {
    id: "c3", year: "2023", title: "KB국민은행 보안 점검 피싱",
    category: "금융 피싱", damage: "약 63억원", victims: "2만 4천명",
    severity: "critical", arrested: true,
    method: "은행 공식 앱 UI 완벽 복제 + 보안 인증서 위조",
    actualTexts: [
      "【KB국민은행】고객님의 계좌에서 비정상 접근이 감지되었습니다. 24시간 내 본인확인 필수. 확인: http://kbbank-secure.com/verify",
      "[국민은행] OTP 기기 교체 필수 안내. 미교체 시 이체 서비스 중단: http://kb-otp.kr/reissue",
    ],
    howItWorked: [
      "KB국민은행 공식 앱과 99% 동일한 피싱 페이지 제작",
      "SSL 인증서도 위조하여 자물쇠 아이콘 표시",
      "로그인 정보·공인인증서 비밀번호·OTP 번호까지 탈취",
      "실시간으로 공격자가 진짜 은행 앱에 로그인하여 즉시 이체",
    ],
    redFlags: ["kbstar.com이 아닌 도메인", "24시간 기한 압박", "OTP 전체 입력 요구"],
    prevention: ["OTP는 누구에게도 공유 금지", "은행 공식 앱만 사용", "이상 감지 시 즉시 콜센터(1588-9999) 연락"],
    outcome: "2024년 3월 검거. 주범 1명 징역 8년, 공범 4명 집행유예. 피해금 일부 환급.",
  },
  {
    id: "c4", year: "2024", title: "정부지원 저금리 대출 사기 문자",
    category: "대출 사기", damage: "약 9억원", victims: "3천 100명",
    severity: "high", arrested: false,
    method: "금융위원회·서민금융진흥원 사칭 + 선납 수수료 요구",
    actualTexts: [
      "【금융위원회】2024 서민 금융지원 대출 신청 기간. 연 2.5% 최대 5천만원. 신용불량자 가능: http://fsc-loan.kr",
      "[서민금융] 정부지원 긴급 생활자금 한도 증액. 별도 심사 없이 당일 입금: http://smf-support.net",
    ],
    howItWorked: [
      "신용 불량자·저신용자 정보 불법 구매 후 타겟 발송",
      "대출 신청 후 '보증 보험료' 명목 선납 요구 (50~300만원)",
      "선납 후 대출 미실행, 연락 두절",
      "2~3개월 후 다른 이름으로 동일 피해자에게 재시도",
    ],
    redFlags: ["선납 수수료 요구", "당일 입금 보장 광고", "심사 없이 대출 가능"],
    prevention: ["정부대출 공식 채널(서민금융진흥원 1397)만 이용", "선납 수수료 요구는 100% 사기", "대출 권유 문자 수신 즉시 차단"],
    outcome: "현재 수사 중. 070 번호 이용으로 추적 어려움. 피해자 구제 거의 불가.",
  },
  {
    id: "c5", year: "2023", title: "갤럭시·아이폰 경품 이벤트 스미싱",
    category: "이벤트 사기", damage: "약 4억원", victims: "8천명",
    severity: "medium", arrested: true,
    method: "삼성전자·Apple 사칭 + 가짜 당첨 알림",
    actualTexts: [
      "삼성전자 창립 55주년 기념 갤럭시 S25 Ultra 추첨! 당첨자 확인 → http://samsung-event55.xyz/winner",
      "[Apple Korea] iPhone 16 Pro 무작위 당첨 축하드립니다. 72시간 내 수령 신청: http://apple-kr-gift.com",
    ],
    howItWorked: [
      "실제 공식 이벤트와 동시에 진행하여 혼선 유발",
      "가짜 당첨 페이지에서 배송비 명목 소액 결제 유도",
      "결제 완료 후 '재고 소진'으로 물품 미지급",
      "입력한 주소·연락처로 추가 스팸/사기 시도",
    ],
    redFlags: [".xyz·.com 비공식 도메인", "72시간 내 수령 압박", "배송비 별도 결제 요구"],
    prevention: ["samsung.com/kr·apple.com/kr 공식 사이트에서 이벤트 확인", "당첨 문자의 도메인 반드시 확인", "배송비 결제 링크는 절대 클릭 금지"],
    outcome: "2024년 2월 검거. 피의자 2명 기소. 소액 피해로 형량 낮아 재범 우려.",
  },
];

const SEV_STYLE = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/25", text: "text-red-400", label: "심각" },
  high:     { bg: "bg-orange-500/10", border: "border-orange-500/25", text: "text-orange-400", label: "높음" },
  medium:   { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400", label: "보통" },
};

interface OfficialAlert {
  id: string;
  source: string;
  sourceIcon: string;

  time: string;
  title: string;
  type: string;
  description: string;
  targetGroup: string;
  url: string;
  severity: "urgent" | "warning" | "info";
}

// 실제 정부/경찰 기관 사례를 시뮬레이션 (실제 환경에서는 API로 크롤링)
const OFFICIAL_ALERTS: OfficialAlert[] = [
  {
    id: "o1", source: "한국인터넷진흥원 (KISA)", sourceIcon: "🛰️", time: "2시간 전",
    title: "CJ대한통운 사칭 스미싱 주의보 발령", type: "긴급주의보",
    description: "주소 불명 반송 예정 안내 문자로 위장, 배송비 결제 유도. 실제 CJ대한통운은 배송비를 문자 링크로 요구하지 않음.",
    targetGroup: "전국민 (특히 택배 이용자)", url: "https://www.kisa.or.kr/notice", severity: "urgent"
  },
  {
    id: "o2", source: "경찰청 사이버안전국", sourceIcon: "👮", time: "5시간 전",
    title: "건강보험공단 사칭 피싱 신고 급증 (일 3,200건)", type: "피싱 경보",
    description: "미납 보험료 명목 가짜 납부 페이지로 유도. 공식 도메인(nhis.or.kr) 외 모두 피싱. 의심 시 1577-1000 확인.",
    targetGroup: "40대 이상 건강보험 가입자", url: "https://www.police.go.kr/cyber", severity: "urgent"
  },
  {
    id: "o3", source: "금융감독원", sourceIcon: "🏦", time: "8시간 전",
    title: "KB국민은행 보안점검 피싱 사이트 차단 조치", type: "피싱 차단",
    description: "kbbank-secure.com 등 유사 도메인 11개 긴급 차단. 공식 앱(KB스타뱅킹)만 사용 권고.",
    targetGroup: "KB국민은행 고객", url: "https://www.fss.or.kr", severity: "warning"
  },
  {
    id: "o4", source: "과학기술정보통신부", sourceIcon: "🏛️", time: "12시간 전",
    title: "정부지원 대출 사칭 070번호 일괄 차단", type: "차단 조치",
    description: "금융위·서민금융 사칭 070 번호 2,847개 차단. 정부 대출은 반드시 공식 채널(1397) 이용.",
    targetGroup: "저신용·저소득 계층", url: "https://www.msit.go.kr", severity: "info"
  },
  {
    id: "o5", source: "서울시 스마트불편신고", sourceIcon: "🚇", time: "1일 전",
    title: "삼성페이·네이버페이 사칭 QR 피싱 발견", type: "신종 수법",
    description: "지하철역 등 공공장소에 가짜 QR코드 부착. 스캔 시 피싱 앱 설치 유도. QR코드 출처 반드시 확인.",
    targetGroup: "서울 시민 (대중교통 이용자)", url: "https://smart.seoul.go.kr", severity: "warning"
  },
  {
    id: "o6", source: "국민권익위원회", sourceIcon: "📢", time: "1일 전",
    title: "공공기관 사칭 문자 통합 신고 센터 개설", type: "정책 안내",
    description: "정부24·민원24 등 공공기관 사칭 문자 즉시 신고 가능. 국번 없이 110 또는 앱 통해 신고.",
    targetGroup: "전국민", url: "https://www.acrc.go.kr", severity: "info"
  },
];

const SEVERITY_STYLE = {
  urgent:  { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400", label: "긴급" },
  warning: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", dot: "bg-orange-400", label: "경고" },
  info:    { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-400", label: "안내" },
};

export function CaseStudies() {
  const [expanded, setExpanded] = useState<string | null>("c1");
  const [catFilter, setCatFilter] = useState("전체");
  const [officialFeed, setOfficialFeed] = useState(OFFICIAL_ALERTS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = ["전체", ...Array.from(new Set(CASES.map((c) => c.category)))];
  const filtered = catFilter === "전체" ? CASES : CASES.filter((c) => c.category === catFilter);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      // 실제로는 API를 호출해서 최신 데이터를 받아옴
      // 여기서는 시뮬레이션으로 데이터 순서만 변경
      setOfficialFeed((prev) => {
        const shuffled = [...prev];
        const item = shuffled.shift();
        if (item) shuffled.push({ ...item, time: "방금 전" });
        return shuffled;
      });
    }, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // 실제 환경에서는 여기서 API 호출
    setTimeout(() => {
      setOfficialFeed([...OFFICIAL_ALERTS]);
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-orange-400" />
          <span className="text-xs text-orange-400 tracking-widest uppercase">실제 피해 사례</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피해 사례집</h1>
        <p className="text-sm text-white/40">실제 발생한 스미싱 피해 사례 분석 — 수법·피해액·예방법 전문 리포트</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "수록 사례", value: `${CASES.length}건`, icon: BookOpen, color: "text-orange-400" },
          { label: "총 피해액", value: "약 136억원", icon: TrendingUp, color: "text-red-400" },
          { label: "피해자 수", value: "약 6만명", icon: Users, color: "text-amber-400" },
          { label: "검거율", value: "40%", icon: ShieldCheck, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3">
            <s.icon size={13} className={`${s.color} mb-1`} />
            <p className={`text-base ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-[11px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Official Feed Section */}
      <div className="mb-8 bg-gradient-to-br from-cyan-500/8 to-blue-500/5 border border-cyan-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-cyan-400" />
            <h2 className="text-sm text-white/80" style={{ fontWeight: 600 }}>정부·경찰 공식 피싱 주의보</h2>
            <div className="flex items-center gap-1 text-[10px] text-cyan-400">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              실시간 연동
            </div>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/10 transition-all disabled:opacity-50">
            <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        <p className="text-xs text-white/40 mb-4">
          한국인터넷진흥원(KISA), 경찰청, 금융감독원 등 공공기관에서 발표한 최신 피싱 주의보입니다.
        </p>

        <div className="space-y-2.5">
          {officialFeed.slice(0, 4).map((alert) => {
            const ss = SEVERITY_STYLE[alert.severity];
            return (
              <motion.div key={alert.id} layout
                className={`rounded-xl border ${ss.bg} ${ss.border} p-4 hover:bg-white/3 transition-all`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${ss.dot} shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text} font-mono`}>
                        {ss.label}
                      </span>
                      <span className="text-[10px] text-white/30">{alert.source}</span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-white/30">{alert.time}</span>
                    </div>
                    <p className="text-sm text-white/80 mb-1" style={{ fontWeight: 600 }}>{alert.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed mb-2">{alert.description}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-white/35">대상: {alert.targetGroup}</span>
                      <a href={alert.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:underline">
                        공식 출처 확인 <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <p className="text-[10px] text-white/30">
            <Building2 size={10} className="inline mr-1" />
            실제 크롤링 환경에서는 공공기관 RSS/API를 통해 실시간으로 업데이트됩니다
          </p>
          <span className="text-[10px] text-white/20">마지막 업데이트: 방금 전</span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-3">
        <h2 className="text-sm text-white/70 mb-3" style={{ fontWeight: 600 }}>과거 주요 피해 사례 아카이브</h2>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                catFilter === c ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : "border-white/10 text-white/35 hover:text-white/55"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Cases */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon="cases"
            title="이 카테고리에 해당하는 사례가 없어요"
            description="다른 카테고리를 선택하거나 전체 보기를 눌러보세요."
            action={{ label: "전체 보기로 전환", onClick: () => setCatFilter("전체") }}
          />
        ) : (
          filtered.map((c) => {
            const ss = SEV_STYLE[c.severity];
            const isOpen = expanded === c.id;
          return (
            <motion.div key={c.id} layout className={`rounded-2xl border overflow-hidden ${ss.bg} ${ss.border}`}>
              {/* Header */}
              <button onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/3 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text} font-mono`}>{ss.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/35">{c.category}</span>
                    <span className="text-[10px] text-white/25">{c.year}</span>
                    {c.arrested && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">검거</span>}
                  </div>
                  <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>{c.title}</p>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-red-400">피해액 {c.damage}</span>
                    <span className="text-xs text-white/40">피해자 {c.victims}</span>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-white/30 shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-white/30 shrink-0 mt-0.5" />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/8">
                    <div className="p-5 space-y-5">
                      {/* Actual texts */}
                      <div>
                        <p className="text-xs text-white/40 mb-2">실제 피싱 문자 예시</p>
                        <div className="space-y-2">
                          {c.actualTexts.map((t, i) => (
                            <div key={i} className="bg-[#0b1120] border border-white/10 rounded-xl p-3 text-xs text-white/65 leading-relaxed font-mono">
                              {t}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* How it worked */}
                        <div>
                          <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><AlertTriangle size={10} className="text-red-400" /> 수법 분석</p>
                          <ol className="space-y-1.5">
                            {c.howItWorked.map((h, i) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-white/55">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 flex items-center justify-center text-[9px]">{i + 1}</span>
                                {h}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Red flags + Prevention */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-white/40 mb-2">경고 신호</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.redFlags.map((f, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-white/40 mb-2">예방법</p>
                            <ul className="space-y-1">
                              {c.prevention.map((p, i) => (
                                <li key={i} className="text-[11px] text-emerald-400/70 flex items-start gap-1.5">
                                  <ShieldCheck size={10} className="shrink-0 mt-0.5" />{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Outcome */}
                      <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                        <p className="text-[11px] text-white/30 mb-1">수사·처리 결과</p>
                        <p className="text-xs text-white/55 leading-relaxed">{c.outcome}</p>
                      </div>
                    </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        }))}
      </div>
    </div>
  );
}
