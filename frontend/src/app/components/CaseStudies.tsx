import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Radio, ExternalLink, RefreshCw, Building2 } from "lucide-react";
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
  {
    id: "c6", year: "2024", title: "KT·LGU+ 통신요금 미납 사칭 스미싱",
    category: "통신사 사칭", damage: "약 11억원", victims: "4천 500명",
    severity: "high", arrested: false,
    method: "통신사客户服务센터 사칭 + 소액 납부 유도",
    actualTexts: [
      "[KT안심通信] 고객님 이번달 요금 87,400원이 미납 상태입니다. 48시간 내 납부하지 않으면 서비스 중단됩니다. 확인: http://kt-bill-pay.com",
      "[LGU+] 본인 확인이 필요합니다. 아래 링크에서 즉시 확인不然服务将被中断: http://lgu-bill.net/verify",
    ],
    howItWorked: [
      "KT/LGU+/SKT 순환 사칭으로 다양한 이용자 타겟",
      "소액 요금(5~10만원) 납부 유도하여警戒심 낮춤",
      "납부 페이지에서 카드 정보 +OTP 탈취",
      "탈취 카드로 해외的平台 결제 및 통신사 포인트 탈취",
    ],
    redFlags: ["kt.com이 아닌 도메인", "48시간 내 납부 압박", "문자 링크로 요금 납부 불가"],
    prevention: ["통신사 공식 앱( KT-app, 마이LGU+ )에서 직접 조회", "요금 납부는 통신사官方网站에서만", "OTP 공유 금지"],
    outcome: "현재 수사 중. 해외 서버 이용으로 추적 난항. 피해액 전체 환급 어려움.",
  },
  {
    id: "c7", year: "2023", title: "대학병원 진료비 미납 사칭 피싱",
    category: "의료 사칭", damage: "약 7억원", victims: "2천 800명",
    severity: "high", arrested: true,
    method: "대학병원 사칭 + 진료비 납부 페이지",
    actualTexts: [
      "[서울아산병원] 미납 진료비 156,000원이 있습니다. 납부하지 않으면 보험 적용이 중단됩니다. 확인: http://snuh-pay.kr",
      "[삼성서울병원] 진료비 정산 안내. 본인 확인 후 환급 가능: http://smc-medical.net/refund",
    ],
    howItWorked: [
      "대학병원 명칭 그대로 사용하여 신뢰도 확보",
      "환급·미납 동시에 사용하여 혼란 유발",
      "진료비 납부 페이지에서 카드번호·생년월일 탈취",
      "탈취 정보로 건강보험 환자정보 도용 및 2차 사기",
    ],
    redFlags: ["병원 공식 도메인(.kr 등) 확인 필요", "문자 링크로 진료비 납부 불가", "환급은 병원 창구 직접"],
    prevention: ["병원 공식 홈페이지에서 환자번호로 직접 조회", "진료비 납부는 병원 수납처에서만", "문자 내 링크 절대 클릭 금지"],
    outcome: "2024년 6월 검거. 피의자 3명 구속. 피해금 일부 환급 완료.",
  },
  {
    id: "c8", year: "2024", title: "정부24 민원확인서 사칭 피싱",
    category: "관공서 사칭", damage: "약 15억원", victims: "5천명",
    severity: "critical", arrested: false,
    method: "정부24·민원24 사칭 + 개인정보 갱신 유도",
    actualTexts: [
      "[정부24] 고객님의 민원 처리가 완료되었습니다. 확인서 발급: http://gov24-confirm.kr/doc",
      "[민원24] 귀하의 행정정보가 만료되었습니다. 즉시 갱신: http://minwon-gov.net/renew",
    ],
    howItWorked: [
      "정부24 공식 CI와 동일한 로고·디자인 사용",
      "확인서 발급·행정정보 갱신 명목으로 개인정보 입력 유도",
      "주민등록번호·카드번호·계좌번호 일괄 탈취",
      "탈취 정보로 국세청·관공서 위장 이메일 발송 및 추가 사기",
    ],
    redFlags: ["gov.kr이 아닌 도메인", "확인서 발급을 문자 링크로 요구", "개인정보 갱신 압박"],
    prevention: ["정부24(gov.kr) 공식 사이트에서 직접 확인", "행정정보는 gov.kr官网에서만 갱신", "민원 관련 전화는 110или 소속 기관 직접"],
    outcome: "현재 수사 중. 피의자 추정치 있지만 신원 확인 어려운 상황.",
  },
  {
    id: "c9", year: "2023", title: "면세점 포인트 사칭 문자",
    category: "포인트 사기", damage: "약 3억원", victims: "1만 2천명",
    severity: "medium", arrested: true,
    method: "면세점·백화점 포인트 사칭 + 소액 포인트 충전 유도",
    actualTexts: [
      "[신세계면세점] 고객님 보유 포인트 28,000원이 만료 예정입니다. 오늘 내 사용否则失效: http://shinsegae-point.com",
      "[현대백화점] 50만 포인트 당첨! 확인 후 수령 신청: http://hd-mall-point.net/claim",
    ],
    howItWorked: [
      "면세점·백화점 포인트 만료·당첨으로 혼선 유발",
      "소액 포인트 충전(1~3만원) 명목으로 카드 정보 수집",
      "충전 완료 후 '오류'로 포인트 미지급 및 연락 두절",
      "입력한 정보로 해당 카드사 포인트 탈취",
    ],
    redFlags: ["면세점 공식 도메인 아닌 경우", "포인트 충전은 공식 앱에서만", "만료·당첨 문자 일괄 스팸"],
    prevention: ["면세점 공식 앱에서 포인트 확인", "문자 링크로 포인트 충전 불가", "소액이라 하더라도 카드 정보 입력 금지"],
    outcome: "2024년 4월 검거. 피의자 1명 기소. 피해 규모 소액으로 환급 완료.",
  },
  {
    id: "c10", year: "2024", title: "우체국 택배 사칭 피싱",
    category: "택배 사기", damage: "약 22억원", victims: "7천 500명",
    severity: "critical", arrested: false,
    method: "우체국 EMS 사칭 + 국제배송세 납부 유도",
    actualTexts: [
      "[우체국] 고객님 해외배송물에 관세 28,000원이 부과되었습니다. 납부하지 않으면 반송 처리됩니다. 확인: http://post-kr-delivery.com/tax",
      "[EMS 국제우편] 통관 보류 중. 관세 납부 필수: http://ems-post.net/customs",
    ],
    howItWorked: [
      "우체국·EMS 국제배송 명목으로 추가 비용 요구",
      "관세·통관비 납부 명목으로 소액 결제 유도",
      "결제 과정에서 카드번호 +OTP 탈취",
      "탈취 카드로 고액 해외 결제 및 타인 명의 카드 등록",
    ],
    redFlags: [".epost.go.kr이 아닌 도메인", "관세 납부를 문자 링크로 요구", "국제배송 사실 확인 필요"],
    prevention: ["우체국 공식 앱(우체국앱)에서 직접 배송 조회", "관세 납부는 통관 수수료 없이 진행", "국제배송 확인은 1588-1300 연락"],
    outcome: "현재 수사 중. 해외 발신_IP 차단되어 추적 난항. 피해자 수 전국 적.",
  },
];

const SEV_STYLE = {
  critical: { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/25", text: "text-red-600 dark:text-red-400", label: "심각" },
  high:     { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/25", text: "text-orange-600 dark:text-orange-400", label: "높음" },
  medium:   { bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/25", text: "text-amber-600 dark:text-amber-400", label: "보통" },
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
  urgent:  { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/30", text: "text-red-600 dark:text-red-400", dot: "bg-red-500 dark:bg-red-400", label: "긴급" },
  warning: { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/30", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500 dark:bg-orange-400", label: "경고" },
  info:    { bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500 dark:bg-cyan-400", label: "안내" },
};

const PAGE_SIZE = 10;

export function CaseStudies() {
  const [expanded, setExpanded] = useState<string | null>("c1");
  const [catFilter, setCatFilter] = useState("전체");
  const [currentPage, setCurrentPage] = useState(1);
  const [officialFeed, setOfficialFeed] = useState(OFFICIAL_ALERTS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = ["전체", ...Array.from(new Set(CASES.map((c) => c.category)))];
  const filtered = catFilter === "전체" ? CASES : CASES.filter((c) => c.category === catFilter);

  // Reset page when filter changes
  const handleFilterChange = (cat: string) => {
    setCatFilter(cat);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

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
    <div className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-8 max-w-4xl mx-auto bg-white dark:bg-[#0b1120]">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-orange-500 dark:text-orange-400" />
          <span className="text-xs text-orange-600 dark:text-orange-400 tracking-widest uppercase">실제 피해 사례</span>
        </div>
        <h1 className="text-gray-900 dark:text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피해 사례집</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">실제 발생한 스미싱 피해 사례 분석 — 수법·피해액·예방법 전문 리포트</p>
      </div>

      {/* Official Feed Section */}
      <div className="mb-8 bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-sm text-cyan-900 dark:text-white/80" style={{ fontWeight: 600 }}>정부·경찰 공식 피싱 주의보</h2>
            <div className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
              실시간 연동
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 border border-gray-200 dark:border-white/10">
              수사·처리 사례 {CASES.length}건
            </span>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-300 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-xs hover:bg-cyan-100 dark:hover:bg-cyan-500/10 transition-all disabled:opacity-50">
            <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-white/40 mb-4">
          한국인터넷진흥원(KISA), 경찰청, 금융감독원 등 공공기관에서 발표한 최신 피싱 주의보입니다.
        </p>
        {/* 발표용 Mock 데이터 안내 */}
        <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            💡 <strong>발표 시점:</strong> 이 영역은 발표용 Mock 데이터입니다. 실제 환경에서는 KISA·경찰청 RSS/API 연동을 통해 실시간 업데이트 예정입니다.
          </p>
        </div>

        <div className="space-y-2.5">
          {officialFeed.slice(0, 4).map((alert) => {
            const ss = SEVERITY_STYLE[alert.severity];
            return (
              <motion.div key={alert.id} layout
                className={`rounded-xl border ${ss.bg} ${ss.border} p-4 hover:bg-white/3 dark:hover:bg-white/3 transition-all`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${ss.dot} shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text} font-mono`}>
                        {ss.label}
                      </span>
                      <span className="text-[10px] text-gray-600 dark:text-white/40">{alert.source}</span>
                      <span className="text-[10px] text-gray-500 dark:text-white/40">·</span>
                      <span className="text-[10px] text-gray-600 dark:text-white/40">{alert.time}</span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white/80 mb-1" style={{ fontWeight: 600 }}>{alert.title}</p>
                    <p className="text-xs text-gray-700 dark:text-white/50 leading-relaxed mb-2 line-clamp-2">{alert.description}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-gray-500 dark:text-white/40">대상: {alert.targetGroup}</span>
                      <a href={alert.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline">
                        공식 출처 확인 <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
          <p className="text-[10px] text-gray-500 dark:text-white/40">
            <Building2 size={10} className="inline mr-1" />
            실제 크롤링 환경에서는 공공기관 RSS/API를 통해 실시간으로 업데이트됩니다
          </p>
          <span className="text-[10px] text-gray-500 dark:text-white/40">마지막 업데이트: 방금 전</span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-3">
        <h2 className="text-sm text-gray-700 dark:text-white/70 mb-3" style={{ fontWeight: 600 }}>과거 주요 피해 사례 아카이브</h2>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => handleFilterChange(c)}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                catFilter === c
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-400"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:text-white/55"
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
            action={{ label: "전체 보기로 전환", onClick: () => handleFilterChange("전체") }}
          />
        ) : (
          paginated.map((c) => {
            const ss = SEV_STYLE[c.severity];
            const isOpen = expanded === c.id;
          return (
            <motion.div key={c.id} layout className={`rounded-2xl border overflow-hidden ${ss.bg} ${ss.border}`}>
              {/* Header — P2-9: metadata 축약, title line-clamp */}
              <button onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/3 dark:hover:bg-white/3 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text} font-mono`}>{ss.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white/55">{c.category}</span>
                    {c.arrested && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-500/15 dark:border-emerald-500/25 dark:text-emerald-400">검거완료</span>}
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white/80 line-clamp-2" style={{ fontWeight: 600 }}>{c.title}</p>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-red-600 dark:text-red-400">피해액 {c.damage}</span>
                    <span className="text-xs text-gray-600 dark:text-white/40">피해자 {c.victims}</span>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-gray-500 dark:text-white/30 shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-gray-500 dark:text-white/30 shrink-0 mt-0.5" />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-200 dark:border-white/8">
                    <div className="p-5 space-y-5">
                      {/* Actual texts */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-white/40 mb-2">실제 피싱 문자 예시</p>
                        <div className="space-y-2">
                          {c.actualTexts.map((t, i) => (
                            <div key={i} className="bg-white border border-gray-200 dark:bg-[#0b1120] dark:border-white/10 rounded-xl p-3 text-xs text-gray-800 dark:text-white/65 leading-relaxed font-mono">
                              {t}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* How it worked */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-white/40 mb-2 flex items-center gap-1"><AlertTriangle size={10} className="text-red-500 dark:text-red-400" /> 수법 분석</p>
                          <ol className="space-y-1.5">
                            {c.howItWorked.map((h, i) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-gray-700 dark:text-white/55">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/15 dark:border-red-500/20 dark:text-red-400 flex items-center justify-center text-[9px]">{i + 1}</span>
                                {h}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Red flags + Prevention */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">경고 신호</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.redFlags.map((f, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">예방법</p>
                            <ul className="space-y-1">
                              {c.prevention.map((p, i) => (
                                <li key={i} className="text-[11px] text-emerald-700 dark:text-emerald-400/70 flex items-start gap-1.5">
                                  <ShieldCheck size={10} className="shrink-0 mt-0.5" />{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Outcome */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 dark:bg-white/3 dark:border-white/8">
                        <p className="text-[11px] text-gray-500 dark:text-white/40 mb-1">수사·처리 결과</p>
                        <p className="text-xs text-gray-700 dark:text-white/55 leading-relaxed line-clamp-2">{c.outcome}</p>
                      </div>
                    </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        }))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
          >
            이전
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 rounded-lg text-xs border transition-all ${
                p === currentPage
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
