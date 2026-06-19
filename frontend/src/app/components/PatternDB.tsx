import { useState } from "react";
import {
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Tag,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PatternCase {
  id: string;
  category: string;
  title: string;
  exampleText: string;
  sender: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  keywords: string[];
  urlPattern: string;
  reasons: string[];
  realCaseYear: string;
  source: string;
}

const PATTERNS: PatternCase[] = [
  {
    id: "p1",
    category: "공공기관 사칭",
    title: "건강보험공단 미납 사칭",
    exampleText: "【국민건강보험】미납보험료가 있습니다. 즉시 납부하지 않으면 급여가 정지될 수 있습니다. 납부하기: http://nhis-pay.kr-notice.com/pay",
    sender: "국민건강보험공단",
    riskLevel: "HIGH",
    score: 9,
    keywords: ["미납", "즉시", "정지", "납부"],
    urlPattern: "*.kr-notice.com / *nhis-pay*",
    reasons: [
      "공공기관 명칭을 공식 발신번호가 아닌 문자에 삽입",
      "즉각적 행동을 요구하는 위협 표현 사용",
      "공식 도메인(nhis.or.kr)이 아닌 유사 도메인 사용",
    ],
    realCaseYear: "2024년",
    source: "경찰청 사이버수사대",
  },
  {
    id: "p2",
    category: "택배 사기",
    title: "CJ대한통운 주소불명 사칭",
    exampleText: "[CJ대한통운] 고객님의 택배가 주소불명으로 반송될 예정입니다. 주소 확인 후 재배송 요청 바랍니다. http://cjlogistics.re-delivery.net/confirm",
    sender: "010-5839-2847",
    riskLevel: "HIGH",
    score: 8,
    keywords: ["주소불명", "반송", "재배송", "확인"],
    urlPattern: "*re-delivery* / *cjlogistics.re-*",
    reasons: [
      "택배사 공식 번호가 아닌 일반 번호에서 발신",
      "주소 불명, 반송 등 불안감을 유발하는 단어 사용",
      "공식 도메인(cjlogistics.com) 아닌 사칭 도메인",
    ],
    realCaseYear: "2024년",
    source: "KISA 인터넷침해대응센터",
  },
  {
    id: "p3",
    category: "금융 피싱",
    title: "KB국민은행 계좌 동결 협박",
    exampleText: "【KB국민은행】 고객님의 계좌에서 비정상 접근이 감지되었습니다. 24시간 이내에 본인 확인을 완료하지 않으면 계좌가 동결됩니다. 확인: http://kbbank-secure.com/verify",
    sender: "KB국민은행",
    riskLevel: "HIGH",
    score: 10,
    keywords: ["비정상", "24시간", "동결", "본인확인"],
    urlPattern: "*kbbank-secure* / *-secure.com*",
    reasons: [
      "은행 공식 도메인이 아닌 유사 도메인 사용",
      "시간 제한(24시간)으로 심리적 압박",
      "계좌 동결이라는 위협적 결과를 명시",
      "개인정보 입력 유도 링크 포함",
    ],
    realCaseYear: "2023-2024년",
    source: "금융감독원 보안경보",
  },
  {
    id: "p4",
    category: "대출 사기",
    title: "저금리 대출 유도",
    exampleText: "안녕하세요 고객님. 정부지원 저금리 대출 한도가 발생했습니다. 오늘까지만 신청 가능합니다. 상담: http://gov-loan.net/apply",
    sender: "대출상담센터",
    riskLevel: "HIGH",
    score: 8,
    keywords: ["정부지원", "저금리", "오늘까지", "한도발생"],
    urlPattern: "*gov-loan* / *-loan.net*",
    reasons: [
      "정부 지원을 사칭한 허위 대출 상품",
      "오늘까지라는 기간 한정 압박 사용",
      "개인정보 입력 및 금전 피해 유도",
    ],
    realCaseYear: "2024년",
    source: "금융감독원",
  },
  {
    id: "p5",
    category: "이벤트 사기",
    title: "경품 당첨 사칭",
    exampleText: "[이벤트당첨] 축하합니다! 고객님이 갤럭시S24 특별 추첨에 당첨되셨습니다. 48시간 내 수령신청: http://prize-claim.xyz/win",
    sender: "이벤트팀",
    riskLevel: "MEDIUM",
    score: 6,
    keywords: ["당첨", "축하", "48시간", "수령신청"],
    urlPattern: "*prize-claim* / *.xyz/*",
    reasons: [
      "응모한 적 없는 이벤트 당첨 주장",
      "48시간 시간 제한으로 신중한 판단 방해",
      "비공식 도메인(.xyz) 사용",
    ],
    realCaseYear: "2023년",
    source: "한국소비자원",
  },
  {
    id: "p6",
    category: "공공기관 사칭",
    title: "국세청 세금 환급 피싱",
    exampleText: "[국세청] 고객님의 환급세액이 발생했습니다. 환급계좌 등록 후 수령하세요. 등록: http://hometax-refund.kr.com/account",
    sender: "국세청",
    riskLevel: "HIGH",
    score: 9,
    keywords: ["환급", "환급계좌", "등록"],
    urlPattern: "*hometax-refund* / *.kr.com*",
    reasons: [
      "국세청 공식 홈택스(hometax.go.kr)가 아닌 유사 도메인",
      "환급금을 미끼로 계좌정보 탈취 시도",
      ".kr.com 혼합 도메인으로 신뢰도 위조",
    ],
    realCaseYear: "2024년",
    source: "국세청 공식 경보",
  },
];

const CATEGORIES = ["전체", "공공기관 사칭", "금융 피싱", "택배 사기", "대출 사기", "이벤트 사기"];
const RISK_FILTERS = ["전체", "HIGH", "MEDIUM", "LOW"];

const riskConfig = {
  HIGH: { label: "HIGH", cls: "bg-red-500/20 border-red-500/30 text-red-400" },
  MEDIUM: { label: "MEDIUM", cls: "bg-orange-500/20 border-orange-500/30 text-orange-400" },
  LOW: { label: "LOW", cls: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" },
};

function PatternCard({ pattern }: { pattern: PatternCase }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = riskConfig[pattern.riskLevel];

  return (
    <motion.div
      layout
      className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden"
    >
      {/* Card header */}
      <div
        className="p-4 cursor-pointer hover:bg-white/3 transition-all"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] border ${cfg.cls}`}>
                {cfg.label}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-white/40">
                {pattern.category}
              </span>
              <span className="text-[10px] text-white/25">{pattern.realCaseYear} 실제 사례</span>
            </div>
            <h3 className="text-sm text-white/80" style={{ fontWeight: 500 }}>{pattern.title}</h3>
            <p className="text-xs text-white/40 mt-0.5 truncate">{pattern.exampleText.slice(0, 60)}...</p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="flex items-baseline gap-0.5">
              <p className={`text-lg ${pattern.riskLevel === "HIGH" ? "text-red-400" : pattern.riskLevel === "MEDIUM" ? "text-orange-400" : "text-emerald-400"}`} style={{ fontWeight: 700 }}>
                {pattern.score}
              </p>
              <p className="text-[10px] text-white/30">/10</p>
            </div>
            {expanded ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 space-y-4 pt-4">
              {/* Example text */}
              <div>
                <p className="text-[11px] text-white/30 mb-2 flex items-center gap-1">
                  <Tag size={10} /> 실제 피싱 문자 예시
                </p>
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <p className="text-xs text-white/60 leading-relaxed">{pattern.exampleText}</p>
                </div>
              </div>

              {/* Sender & URL */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                  <p className="text-[10px] text-white/30 mb-1">발신자 패턴</p>
                  <p className="text-xs text-white/60">{pattern.sender}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/5">
                  <p className="text-[10px] text-white/30 mb-1">URL 패턴</p>
                  <p className="text-xs text-white/60 font-mono">{pattern.urlPattern}</p>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <p className="text-[11px] text-white/30 mb-2">탐지 핵심 키워드</p>
                <div className="flex flex-wrap gap-2">
                  {pattern.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-1 rounded-md text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reasons */}
              <div>
                <p className="text-[11px] text-white/30 mb-2 flex items-center gap-1">
                  <Shield size={10} /> 피싱 판단 근거
                </p>
                <ol className="space-y-1.5">
                  {pattern.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-[10px]" style={{ fontWeight: 600 }}>
                        {i + 1}
                      </span>
                      {r}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Source */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <p className="text-[11px] text-white/25">출처: {pattern.source}</p>
                <button className="flex items-center gap-1 text-[11px] text-cyan-400/60 hover:text-cyan-400 transition-all">
                  <ExternalLink size={10} /> 참고 자료
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PatternDB() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [riskFilter, setRiskFilter] = useState("전체");

  const filtered = PATTERNS.filter((p) => {
    const matchSearch =
      search === "" ||
      p.title.includes(search) ||
      p.exampleText.includes(search) ||
      p.keywords.some((k) => k.includes(search));
    const matchCat = category === "전체" || p.category === category;
    const matchRisk = riskFilter === "전체" || p.riskLevel === riskFilter;
    return matchSearch && matchCat && matchRisk;
  });

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Database size={14} className="text-cyan-400" />
          <span className="text-xs text-cyan-400 tracking-widest uppercase">패턴 라이브러리</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 패턴 데이터베이스</h1>
        <p className="text-sm text-white/40">실제 사례 기반의 피싱/스미싱 패턴 데이터를 제공합니다. 탐지 기준과 판단 근거를 확인하세요.</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
          <p className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{PATTERNS.length}</p>
          <p className="text-xs text-white/40">등록된 패턴</p>
        </div>
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
          <p className="text-red-400" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{PATTERNS.filter((p) => p.riskLevel === "HIGH").length}</p>
          <p className="text-xs text-white/40">HIGH 위험</p>
        </div>
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
          <p className="text-cyan-400" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{CATEGORIES.length - 1}</p>
          <p className="text-xs text-white/40">피싱 카테고리</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#111c30] border border-white/10 rounded-xl">
          <Search size={14} className="text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="키워드, 문자 내용 검색..."
            className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/25 outline-none"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={12} className="text-white/30 shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  category === cat
                    ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                    : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {RISK_FILTERS.map((rf) => (
              <button
                key={rf}
                onClick={() => setRiskFilter(rf)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  riskFilter === rf
                    ? rf === "HIGH"
                      ? "bg-red-500/20 border border-red-500/30 text-red-400"
                      : rf === "MEDIUM"
                      ? "bg-orange-500/20 border border-orange-500/30 text-orange-400"
                      : rf === "LOW"
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                      : "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400"
                    : "bg-white/5 border border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                {rf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">검색 결과가 없습니다.</p>
          </div>
        ) : (
          filtered.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))
        )}
      </div>
    </div>
  );
}
