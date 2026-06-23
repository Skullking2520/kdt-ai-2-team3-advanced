import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Send, RotateCcw,
  CheckCircle2, XCircle, ChevronRight, ThumbsUp,
  ThumbsDown, BookOpen, Phone, Flag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { URGENCY_KEYWORDS } from "@/lib/smsAnalysis";
// analyzeSms/toLegacyRiskLevel/URGENCY_KEYWORDS: 검사하기 버튼 → /analyze/progress 분석에 사용됨
// (미리보기 useEffect는 제거됨 — UX-04)

interface AnalysisResult {
  risk_level: "danger" | "warning" | "normal";
  risk_score: number;
  smishing_type: string;
  reasons: string[];
  action_guide: string[];
}

const SAMPLE_TEXTS = [
  { label: "택배 사칭", text: "【CJ대한통운】배송 주소 확인이 필요합니다. 아래 링크를 확인해주세요. http://cj-logistics-re.com/confirm" },
  { label: "가족 사칭", text: "엄마 나 폰 고장나서 번호 바뀌었어. 급하게 상품권 결제 좀 해줘. 010-9382-7461로 문자해줘." },
  { label: "기관 사칭", text: "【국민건강보험】환급금 확인이 필요합니다. 링크를 클릭하세요. http://nhis-refund.kr/check" },
];

const riskConfig = {
  danger: {
    label: "위험",
    sublabel: "스미싱 가능성 매우 높음",
    icon: ShieldAlert,
    badgeBg: "bg-red-50 dark:bg-red-900/20",
    badgeBorder: "border-red-200 dark:border-red-700/40",
    badgeText: "text-red-700 dark:text-red-400",
    cardBg: "bg-red-50 dark:bg-red-900/15",
    cardBorder: "border-red-200 dark:border-red-700/30",
    scoreBg: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
    ringColor: "#EF4444",
  },
  warning: {
    label: "주의",
    sublabel: "의심스러운 요소 있음",
    icon: AlertTriangle,
    badgeBg: "bg-amber-50 dark:bg-amber-900/20",
    badgeBorder: "border-amber-200 dark:border-amber-700/40",
    badgeText: "text-amber-700 dark:text-amber-400",
    cardBg: "bg-amber-50 dark:bg-amber-900/15",
    cardBorder: "border-amber-200 dark:border-amber-700/30",
    scoreBg: "bg-amber-500",
    textColor: "text-amber-700 dark:text-amber-400",
    ringColor: "#F59E0B",
  },
  normal: {
    label: "정상",
    sublabel: "위험 요소 없음",
    icon: ShieldCheck,
    badgeBg: "bg-emerald-50 dark:bg-emerald-900/20",
    badgeBorder: "border-emerald-200 dark:border-emerald-700/40",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    cardBg: "bg-emerald-50 dark:bg-emerald-900/15",
    cardBorder: "border-emerald-200 dark:border-emerald-700/30",
    scoreBg: "bg-emerald-500",
    textColor: "text-emerald-700 dark:text-emerald-400",
    ringColor: "#22C55E",
  },
};

const ANALYSIS_STEPS = ["입력 내용 확인 중", "패턴 분석 중", "유사 사례 검색 중", "결과 생성 중"];

const SIMILAR_CASES: Record<"danger" | "warning", { title: string; similarity: number; year: string }[]> = {
  danger: [
    { title: "택배 회사 사칭 배송 주소 확인 유도형", similarity: 87, year: "2026" },
    { title: "공공기관 환급금 명목 피싱", similarity: 74, year: "2025" },
    { title: "가족 사칭 상품권 요구형", similarity: 69, year: "2026" },
  ],
  warning: [
    { title: "단축 URL 포함 확인 유도 문자", similarity: 71, year: "2025" },
    { title: "이벤트 당첨 가장 링크 연결형", similarity: 58, year: "2025" },
    { title: "배송 재시도 안내 위장형", similarity: 53, year: "2024" },
  ],
};

const DAMAGE_STEPS = [
  "문자 수신",
  "링크 클릭",
  "가짜 사이트 이동",
  "개인정보 / 인증번호 입력",
  "계정 탈취 또는 금전 피해",
];

const GOV_CRITERIA: Record<"danger" | "warning" | "normal", { label: string; matched: boolean }[]> = {
  danger: [
    { label: "의심 URL 포함", matched: true },
    { label: "기관 또는 지인 사칭", matched: true },
    { label: "금전 또는 결제 요구", matched: true },
    { label: "개인정보 입력 유도", matched: true },
  ],
  warning: [
    { label: "의심 URL 포함", matched: true },
    { label: "기관 또는 지인 사칭", matched: false },
    { label: "금전 또는 결제 요구", matched: false },
    { label: "개인정보 입력 유도", matched: true },
  ],
  normal: [
    { label: "의심 URL 포함", matched: false },
    { label: "기관 또는 지인 사칭", matched: false },
    { label: "금전 또는 결제 요구", matched: false },
    { label: "개인정보 입력 유도", matched: false },
  ],
};

function HighlightedText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const highlights: { start: number; end: number; type: "url" | "keyword" }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(urlRegex);
  while ((m = re.exec(text)) !== null) highlights.push({ start: m.index, end: m.index + m[0].length, type: "url" });
  URGENCY_KEYWORDS.forEach((kw) => {
    let idx = text.indexOf(kw);
    while (idx !== -1) {
      if (!highlights.some((h) => h.type === "url" && idx >= h.start && idx < h.end))
        highlights.push({ start: idx, end: idx + kw.length, type: "keyword" });
      idx = text.indexOf(kw, idx + 1);
    }
  });
  highlights.sort((a, b) => a.start - b.start);
  const segments: { text: string; type?: "url" | "keyword" }[] = [];
  let cursor = 0;
  for (const h of highlights) {
    if (h.start < cursor) continue;
    if (h.start > cursor) segments.push({ text: text.slice(cursor, h.start) });
    segments.push({ text: text.slice(h.start, h.end), type: h.type });
    cursor = h.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return (
    <span className="text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === "url") return <mark key={i} className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded px-1 not-italic font-mono text-xs">{seg.text}</mark>;
        if (seg.type === "keyword") return <mark key={i} className="bg-red-100 text-red-700 border border-red-200 rounded px-0.5 not-italic font-medium">{seg.text}</mark>;
        return <span key={i} className="text-gray-700 dark:text-white/70">{seg.text}</span>;
      })}
    </span>
  );
}

export function Analyzer() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as { prefillText?: string } | null)?.prefillText ?? "";

  const [textInput, setTextInput] = useState(prefill);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // 입력 중 미리보기 분석 제거 — 사용자가 "검사하기"를 명시적으로 눌러야 분석이 시작되고
  // 결과는 /analyze/progress 페이지로 이동해 표시됨 (UX-04).
  // (이전에는 입력 변경 시 즉시 setResult가 호출되어 "검사하기" 버튼이 무의미하게 느껴졌음)

  const handleAnalyze = () => {
    setError("");
    if (!textInput.trim()) { setError("문자 내용을 입력해주세요."); return; }
    if (textInput.trim().length < 5) { setError("분석할 문자를 조금 더 입력해주세요."); return; }

    // 로딩 애니메이션 시작 — 검사하기 버튼 클릭 직후 결과 영역에 로딩 UI 표시
    setLoading(true);
    setLoadingStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setLoadingStep(step);
      if (step >= ANALYSIS_STEPS.length - 1) clearInterval(interval);
    }, 400);

    // 새로운 플로우: AnalysisProgress로 이동
    navigate(`/analyze/progress?text=${encodeURIComponent(textInput)}&type=sms`);
    // progress 페이지에서 분석이 실제로 진행되므로, Analyzer의 로딩은 애니메이션용으로만 사용
    setTimeout(() => { clearInterval(interval); setLoading(false); }, 1500);
  };

  const handleReset = () => {
    setTextInput("");
    setResult(null);
    setLoading(false);
    setError("");
    setFeedback(null);
    textareaRef.current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-widest">문자 분석</span>
        </div>
        <h1 className="text-2xl text-gray-900 dark:text-white mb-1" style={{ fontWeight: 700 }}>스미싱 문자 검사</h1>
        <p className="text-sm text-gray-500 dark:text-white/50">의심스러운 문자 내용을 붙여넣으면 AI가 스미싱 여부를 분석합니다.</p>
      </div>

      {/* Input card */}
      <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-4 shadow-sm dark:shadow-none">
        {/* Sample buttons */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-white/35">예시 문자:</span>
          {SAMPLE_TEXTS.map((s) => (
            <button
              key={s.label}
              onClick={() => { setTextInput(s.text); setError(""); setResult(null); }}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-white/60 hover:bg-blue-50 dark:hover:bg-blue-900/25 hover:text-blue-700 dark:hover:text-blue-400 transition-all border border-gray-200 dark:border-white/10"
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => { setTextInput(e.target.value.slice(0, 500)); setError(""); }}
            placeholder="의심스러운 문자 내용을 여기에 붙여넣으세요..."
            className="w-full resize-none bg-gray-50 dark:bg-[#0d1526] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#111c30] transition-all leading-relaxed"
            rows={5}
          />
          <span className="absolute bottom-3 right-3 text-[11px] text-gray-500 dark:text-white/30">{textInput.length}/500</span>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <XCircle size={12} /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleAnalyze}
            disabled={loading || !textInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-white/30 disabled:cursor-not-allowed disabled:shadow-none"
            style={loading || !textInput.trim() ? undefined : { backgroundColor: "#3B82F6", fontWeight: 600, color: "white" }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Send size={14} style={{ color: "white" }} />
                검사하기
              </>
            )}
          </button>
          {(textInput || result) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-gray-500 dark:text-white/50 bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/12 transition-all"
            >
              <RotateCcw size={13} />
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-4 shadow-sm dark:shadow-none"
          >
            <p className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-4">분석 진행 중...</p>
            <div className="space-y-3">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    i < loadingStep ? "bg-blue-600" : i === loadingStep ? "bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-600 dark:border-blue-500" : "bg-gray-100 dark:bg-white/8"
                  }`}>
                    {i < loadingStep && <CheckCircle2 size={12} style={{ color: "white" }} />}
                    {i === loadingStep && (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      />
                    )}
                  </div>
                  <span className={`text-sm ${i <= loadingStep ? "text-gray-800 dark:text-white/80" : "text-gray-500 dark:text-white/40"}`}>{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* ① 위험도 카드 */}
            {(() => {
              const cfg = riskConfig[result.risk_level];
              const RiskIcon = cfg.icon;
              return (
                <div className={`rounded-2xl border p-5 ${cfg.cardBg} ${cfg.cardBorder}`}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">위험도</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-white dark:bg-[#0d1526] shadow-sm dark:shadow-none`}>
                      <RiskIcon size={28} className={cfg.textColor} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-2xl font-bold ${cfg.textColor}`}>{cfg.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText}`}>{cfg.sublabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: cfg.ringColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${result.risk_score}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <span className={`text-sm font-bold ${cfg.textColor}`}>{result.risk_score}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ② 공격 유형 */}
            <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">공격 유형</p>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-gray-900 dark:text-white">{result.smishing_type}</span>
              </div>
              {/* 입력 텍스트 하이라이트 */}
              <div className="mt-3 p-3 bg-gray-50 dark:bg-[#0d1526] border border-gray-100 dark:border-white/8 rounded-xl">
                <p className="text-[10px] text-gray-500 dark:text-white/40 mb-2 uppercase tracking-wider">분석된 문자</p>
                <HighlightedText text={textInput} />
              </div>
              <div className="flex gap-3 mt-3 text-xs text-gray-500 dark:text-white/40">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block" /> URL</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> 위험 키워드</span>
              </div>
            </div>

            {/* ③ 왜 위험한지 */}
            <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">탐지 근거</p>
              <div className="space-y-2">
                {result.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      result.risk_level === "normal" ? "bg-emerald-100" : "bg-red-100"
                    }`}>
                      {result.risk_level === "normal"
                        ? <CheckCircle2 size={11} className="text-emerald-600" />
                        : <XCircle size={11} className="text-red-600" />
                      }
                    </div>
                    <span className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>

              {/* 정부기관 기준 체크리스트 */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/8">
                <p className="text-xs text-gray-500 dark:text-white/40 mb-2">정부기관 스미싱 판단 기준</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {GOV_CRITERIA[result.risk_level].map((c) => (
                    <div key={c.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      c.matched ? "bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-700/30" : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/40 border border-gray-100 dark:border-white/8"
                    }`}>
                      {c.matched
                        ? <XCircle size={11} className="text-red-500 shrink-0" />
                        : <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      }
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ④ 예상 피해 시나리오 (danger/warning only) */}
            {result.risk_level !== "normal" && (
              <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
                <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">예상 피해 시나리오</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {DAMAGE_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center gap-1">
                      <span className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium ${
                        i === 0 ? "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-white/60 border-gray-200 dark:border-white/10" :
                        i < 3 ? "bg-orange-50 dark:bg-orange-900/15 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-700/30" :
                        "bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-700/30"
                      }`}>
                        {step}
                      </span>
                      {i < DAMAGE_STEPS.length - 1 && <ChevronRight size={12} className="text-gray-300 dark:text-white/40 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ⑤ 지금 해야 할 행동 */}
            <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: result.risk_level === "normal" ? "#F0FDF4" : "#FEF2F2", borderColor: result.risk_level === "normal" ? "#BBF7D0" : "#FECACA" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: result.risk_level === "normal" ? "#166534" : "#991B1B" }}>
                지금 해야 할 행동
              </p>
              <div className="space-y-2">
                {result.action_guide.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: result.risk_level === "normal" ? "#22C55E" : "#EF4444", color: "white" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed" style={{ color: result.risk_level === "normal" ? "#166534" : "#7F1D1D" }}>{a}</span>
                  </div>
                ))}
              </div>
              {result.risk_level === "danger" && (
                <div className="mt-4 pt-4 border-t border-red-200 flex flex-wrap gap-2">
                  <a href="tel:182" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 transition-all">
                    <Phone size={12} /> 경찰청 사이버범죄 182
                  </a>
                  <a href="tel:118" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 transition-all">
                    <Phone size={12} /> KISA 신고 118
                  </a>
                  <a href="/report" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 transition-all">
                    <Flag size={12} /> 제보하기
                  </a>
                </div>
              )}
            </div>

            {/* 유사 사례 (danger/warning) */}
            {result.risk_level !== "normal" && SIMILAR_CASES[result.risk_level] && (
              <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
                <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">유사 피해 사례</p>
                <div className="space-y-2">
                  {SIMILAR_CASES[result.risk_level].map((c) => (
                    <div key={c.title} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#0d1526] border border-gray-100 dark:border-white/8">
                      <BookOpen size={13} className="text-gray-500 dark:text-white/35 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-white/80 truncate">{c.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-white/40">{c.year}년 사례</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-700/30 shrink-0">
                        유사도 {c.similarity}%
                      </span>
                    </div>
                  ))}
                </div>
                {/* /cases 라우트 부재로 dead link. 발표 중 404 방지를 위해 제거. */}
              </div>
            )}

            {/* Feedback */}
            <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm dark:shadow-none">
              <p className="text-xs text-gray-500 dark:text-white/40 mb-3">이 분석 결과가 도움이 되었나요?</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFeedback("up")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${
                    feedback === "up" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/30" : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8"
                  }`}
                >
                  <ThumbsUp size={12} /> 도움됨
                </button>
                <button
                  onClick={() => setFeedback("down")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${
                    feedback === "down" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700/30" : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8"
                  }`}
                >
                  <ThumbsDown size={12} /> 아님
                </button>
                {feedback && <span className="text-xs text-gray-500 dark:text-white/40 ml-1">피드백 감사합니다.</span>}
              </div>
            </div>
          </motion.div>
        )}

        {/* 정직한 데이터 처리 안내 — 검사 결과 박스 하단 */}
        <div className="mt-6 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <ShieldCheck size={13} className="text-gray-400 dark:text-white/40 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
            <strong className="text-gray-700 dark:text-white/70">개인정보(전화번호, 이름, 계좌번호 등)는 자동으로 마스킹 처리된 후에만 데이터 품질 개선 목적</strong>으로 활용됩니다.
            원본 문자는 저장되지 않으며, 해당 기능은 관리자 승인 후에만 활성화됩니다.
          </p>
        </div>
      </AnimatePresence>
    </div>
  );
}
