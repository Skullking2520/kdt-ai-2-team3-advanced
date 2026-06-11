import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Search, X, ShieldAlert, AlertTriangle, ShieldCheck, ChevronRight, Tag, Eye } from "lucide-react";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface GalleryCase {
  id: string;
  title: string;
  category: string;
  sender: string;
  message: string;
  riskLevel: RiskLevel;
  score: number;
  dangerTokens: string[];
  annotations: { type: string; text: string }[];
  technique: string;
  year: string;
}

const CATEGORIES = ["전체", "공공기관 사칭", "금융 피싱", "택배 사기", "이벤트 사기", "대출 사기"];

const CASES: GalleryCase[] = [
  {
    id: "c1",
    title: "건강보험 미납 통지 위장",
    category: "공공기관 사칭",
    sender: "국민건강보험",
    message: "【국민건강보험】미납보험료 89,200원이 있습니다. 즉시 납부하지 않으면 급여가 정지됩니다.\n납부: http://nhis-pay.kr-notice.com/pay?id=2847",
    riskLevel: "HIGH",
    score: 9,
    dangerTokens: ["즉시", "정지", "nhis-pay.kr-notice.com"],
    annotations: [
      { type: "도메인 위장", text: "공식 도메인 nhis.or.kr 대신 nhis-pay.kr-notice.com 사용 — 하이픈으로 분리해 신뢰도 위장" },
      { type: "긴급성 유발", text: "'즉시', '정지' 조합으로 심리적 압박. 24시간 내 행동 유도" },
      { type: "기관명 사칭", text: "국민건강보험 명칭을 그대로 사용. 공식 번호가 아닌 일반 번호 발신" },
    ],
    technique: "도메인 하이픈 위장 + 공공기관 사칭",
    year: "2024",
  },
  {
    id: "c2",
    title: "KB국민은행 계좌 동결 경고",
    category: "금융 피싱",
    sender: "010-8821-3947",
    message: "【KB국민은행】고객님 계좌에서 비정상 접근이 감지되었습니다. 24시간 이내 본인 확인 미완료 시 계좌가 동결됩니다.\n확인: http://kbbank-secure.auth-login.net",
    riskLevel: "HIGH",
    score: 10,
    dangerTokens: ["비정상", "24시간", "동결", "kbbank-secure.auth-login.net"],
    annotations: [
      { type: "이중 도메인 위장", text: "kbbank-secure.auth-login.net — 공식 kbstar.com이 아닌 auth-login.net 도메인 사용" },
      { type: "시간 압박", text: "'24시간 이내' 조건으로 피해자가 신중하게 검토할 시간 차단" },
      { type: "발신 번호 불일치", text: "KB국민은행 공식 번호(1588-9999)가 아닌 010 개인 번호 발신" },
    ],
    technique: "금융기관 사칭 + 계좌 동결 위협",
    year: "2024",
  },
  {
    id: "c3",
    title: "CJ대한통운 주소 불명 반송",
    category: "택배 사기",
    sender: "CJ대한통운",
    message: "[CJ대한통운] 고객님의 택배(운송장번호: 584729182)가 주소 불명으로 반송 예정입니다.\n주소 확인: http://cjlogistics.re-delivery-check.net/confirm",
    riskLevel: "HIGH",
    score: 8,
    dangerTokens: ["반송", "cjlogistics.re-delivery-check.net"],
    annotations: [
      { type: "가짜 운송장 번호", text: "실제처럼 보이는 운송장 번호로 신뢰성 위조" },
      { type: "도메인 위장", text: "cjlogistics.com 대신 re-delivery-check.net 서브도메인 패턴 사용" },
      { type: "행동 유도", text: "주소 확인이라는 자연스러운 액션으로 클릭 유도" },
    ],
    technique: "택배 운송장 번호 위조 + 도메인 위장",
    year: "2024",
  },
  {
    id: "c4",
    title: "삼성 갤럭시 이벤트 당첨",
    category: "이벤트 사기",
    sender: "이벤트알림",
    message: "[이벤트당첨] 축하드립니다! 고객님이 갤럭시 S24 Ultra 특별 추첨에 당첨되셨습니다. 48시간 내 수령 신청 필수.\n신청: http://prize-samsung.xyz/claim?code=GS24WIN",
    riskLevel: "HIGH",
    score: 9,
    dangerTokens: ["당첨", "48시간", "prize-samsung.xyz"],
    annotations: [
      { type: ".xyz 도메인", text: "신뢰도 낮은 .xyz TLD 사용. 공식 samsung.com 아님" },
      { type: "희소성 + 긴급성", text: "'48시간 내 수령 필수'로 즉각적 행동 유도" },
      { type: "과도한 보상", text: "고가 스마트폰 제공으로 판단력 약화 유도" },
    ],
    technique: "경품 사기 + .xyz 도메인 + 시간 압박",
    year: "2023",
  },
  {
    id: "c5",
    title: "정부지원 저금리 대출 안내",
    category: "대출 사기",
    sender: "정부대출지원센터",
    message: "[정부지원] 코로나 피해 소상공인 대상 연 1.2% 저금리 대출 지원합니다. 신용불량자도 가능. 선착순 100명.\n신청: http://gov-loan.support-kr.com",
    riskLevel: "HIGH",
    score: 8,
    dangerTokens: ["신용불량자", "선착순", "gov-loan.support-kr.com"],
    annotations: [
      { type: "존재하지 않는 기관", text: "'정부대출지원센터'는 공식 기관명이 아님" },
      { type: "희소성 조작", text: "'선착순 100명'으로 경쟁 심리 자극" },
      { type: "취약계층 타겟", text: "신용불량자도 가능 — 금융 취약 계층 집중 타겟팅" },
    ],
    technique: "존재하지 않는 기관 사칭 + 취약계층 타겟",
    year: "2023",
  },
  {
    id: "c6",
    title: "경찰청 사이버수사대 출석 요구",
    category: "공공기관 사칭",
    sender: "경찰청사이버수사대",
    message: "【경찰청 사이버수사대】 귀하는 불법 금융거래 연루 혐의로 조사 대상입니다. 48시간 내 아래 링크에서 출석 확인 바랍니다.\nhttp://police-cyber.inquiry-kr.com",
    riskLevel: "HIGH",
    score: 10,
    dangerTokens: ["혐의", "48시간", "출석", "police-cyber.inquiry-kr.com"],
    annotations: [
      { type: "공포 유발", text: "수사 혐의 언급으로 극도의 불안감 조성. 냉철한 판단 불가 상태 유도" },
      { type: "고위기관 사칭", text: "경찰청 사칭은 신뢰도가 매우 높아 피해율이 높은 유형" },
      { type: "가짜 링크", text: "police.go.kr이 아닌 inquiry-kr.com 서브도메인 사용" },
    ],
    technique: "수사기관 사칭 + 공포 심리 자극",
    year: "2024",
  },
  {
    id: "c7",
    title: "건강보험료 환급 안내",
    category: "공공기관 사칭",
    sender: "국민건강보험공단",
    message: "【건강보험】 고객님의 과납 보험료 127,400원 환급이 확정되었습니다. 7일 이내 신청하지 않으면 자동 소멸됩니다.\n환급 신청: http://nhis-refund.kr.cash-back.net",
    riskLevel: "HIGH",
    score: 9,
    dangerTokens: ["소멸", "7일", "nhis-refund.kr.cash-back.net"],
    annotations: [
      { type: "이중 손실 회피", text: "환급금 소멸이라는 손실 회피 심리 자극 (Prospect Theory 적용)" },
      { type: "복잡한 도메인 구조", text: "nhis-refund.kr.cash-back.net — 도메인 중첩으로 정상처럼 보이게 위장" },
      { type: "구체적 금액", text: "127,400원이라는 구체적 금액으로 실재감 높임" },
    ],
    technique: "환급 사기 + 손실 회피 심리 이용",
    year: "2024",
  },
  {
    id: "c8",
    title: "대출 원금 탕감 특별 프로그램",
    category: "대출 사기",
    sender: "금융채무조정센터",
    message: "[금융채무조정] 정부 위탁 대출 원금 최대 80% 탕감 프로그램 대상자로 선정되었습니다. 오늘 신청 시 추가 혜택 제공.\n상담 신청: http://debt-free.gov-support.kr.com",
    riskLevel: "MEDIUM",
    score: 7,
    dangerTokens: ["탕감", "오늘", "debt-free.gov-support.kr.com"],
    annotations: [
      { type: "정부 위탁 허위 표기", text: "정부 위탁이라 표기했으나 실제 정부 프로그램 아님" },
      { type: "비현실적 혜택", text: "원금 80% 탕감은 현실에서 불가능한 수준의 혜택" },
      { type: "당일 압박", text: "'오늘 신청 시'로 숙고 없이 즉각 행동 유도" },
    ],
    technique: "정부기관 사칭 + 비현실적 혜택 제시",
    year: "2023",
  },
];

const riskCfg = {
  HIGH: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  MEDIUM: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  LOW: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
};

const catColors: Record<string, string> = {
  "공공기관 사칭": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "금융 피싱": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "택배 사기": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "이벤트 사기": "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "대출 사기": "bg-red-500/15 text-red-400 border-red-500/20",
};

export function PhishingGallery() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedCase, setSelectedCase] = useState<GalleryCase | null>(null);

  const filtered = CASES.filter((c) => {
    const matchCat = activeCategory === "전체" || c.category === activeCategory;
    const matchSearch = !search || c.title.includes(search) || c.message.includes(search) || c.category.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-violet-400" />
          <span className="text-xs text-violet-400 tracking-widest uppercase">사례 아카이브</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 문자 갤러리</h1>
        <p className="text-sm text-white/40">실제 수집된 스미싱 사례를 분석과 함께 확인하세요.</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 px-3 py-2.5 bg-[#111c30] border border-white/10 rounded-xl focus-within:border-violet-500/30 transition-all">
          <Search size={13} className="text-white/30 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 내용, 유형 검색..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none"
          />
          {search && <button onClick={() => setSearch("")}><X size={12} className="text-white/30 hover:text-white/60" /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs transition-all border ${
                activeCategory === cat
                  ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                  : "text-white/40 border-white/10 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "총 사례 수", value: CASES.length, color: "text-white/70" },
          { label: "HIGH 위험", value: CASES.filter((c) => c.riskLevel === "HIGH").length, color: "text-red-400" },
          { label: "카테고리", value: CATEGORIES.length - 1, color: "text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
            <p className={`${s.color} text-lg`} style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-[11px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const cfg = riskCfg[c.riskLevel];
          return (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111c30] border border-white/10 rounded-xl p-4 cursor-pointer hover:border-white/20 hover:bg-[#131f35] transition-all group"
              onClick={() => setSelectedCase(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded border ${catColors[c.category] || "bg-white/10 text-white/40 border-white/10"}`}>
                  {c.category}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${cfg.badge}`}>{c.riskLevel} {c.score}/10</span>
              </div>
              <h3 className="text-sm text-white/80 mb-2" style={{ fontWeight: 500 }}>{c.title}</h3>
              <p className="text-xs text-white/40 line-clamp-3 leading-relaxed">{c.message}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex flex-wrap gap-1">
                  {c.dangerTokens.slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/70 border border-red-500/15">{t}</span>
                  ))}
                </div>
                <span className="text-[10px] text-white/30 flex items-center gap-1 group-hover:text-violet-400 transition-all">
                  <Eye size={10} /> 상세 보기
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/30">검색 결과가 없습니다.</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCase(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#0d1526] border border-white/15 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between p-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${catColors[selectedCase.category] || ""}`}>{selectedCase.category}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${riskCfg[selectedCase.riskLevel].badge}`}>{selectedCase.riskLevel} {selectedCase.score}/10</span>
                    <span className="text-[10px] text-white/25">{selectedCase.year}</span>
                  </div>
                  <h2 className="text-white" style={{ fontWeight: 700 }}>{selectedCase.title}</h2>
                </div>
                <button onClick={() => setSelectedCase(null)} className="text-white/30 hover:text-white/70 transition-all ml-4">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Message */}
                <div>
                  <p className="text-[11px] text-white/30 mb-2 flex items-center gap-1"><Tag size={10} /> 원문 메시지</p>
                  <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-white/30 mb-1">발신: {selectedCase.sender}</p>
                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{selectedCase.message}</p>
                  </div>
                </div>

                {/* Danger tokens */}
                <div>
                  <p className="text-[11px] text-white/30 mb-2">위험 키워드</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCase.dangerTokens.map((t) => (
                      <span key={t} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Annotations */}
                <div>
                  <p className="text-[11px] text-white/30 mb-2 flex items-center gap-1"><ChevronRight size={10} /> 분석 어노테이션</p>
                  <div className="space-y-2">
                    {selectedCase.annotations.map((a, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 h-fit">{a.type}</span>
                        <p className="text-xs text-white/55 leading-relaxed">{a.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technique */}
                <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
                  <p className="text-[10px] text-violet-400/60 mb-1">탐지 기법</p>
                  <p className="text-xs text-violet-300/70">{selectedCase.technique}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
