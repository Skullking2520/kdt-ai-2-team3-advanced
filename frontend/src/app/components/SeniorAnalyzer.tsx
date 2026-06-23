import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, Home,
  Phone, CheckCircle2, ThumbsUp, ThumbsDown, RotateCcw,
} from "lucide-react";
import { toLegacyRiskLevel, toSeniorReasons, toSeniorActions } from "@/lib/smsAnalysis";
import { api, ApiException } from "@/lib/api";
import { useSenior } from "@/app/context/SeniorContext";

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
  danger:  { label: "위험", desc: "이 문자는 위험합니다!", color: "text-red-200", bg: "bg-red-500/15", border: "border-red-500/40", trafficLight: "bg-red-500" },
  warning: { label: "주의", desc: "조심하셔야 합니다!", color: "text-amber-200", bg: "bg-amber-500/15", border: "border-amber-500/40", trafficLight: "bg-amber-400" },
  normal:  { label: "안전", desc: "안전한 문자입니다.", color: "text-emerald-200", bg: "bg-emerald-500/15", border: "border-emerald-500/40", trafficLight: "bg-emerald-400" },
};

const MAX_LEN = 500;

export function SeniorAnalyzer() {
  const nav = useNavigate();
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { senior: seniorMode } = useSenior();

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleAnalyze = async () => {
    setError("");
    if (!textInput.trim()) { setError("문자 내용을 입력해주세요."); return; }
    if (textInput.trim().length < 5) { setError("문자를 조금 더 입력해주세요."); return; }

    setLoading(true);
    setResult(null);
    setFeedback(null);

    try {
      // 백엔드 분석 API 호출 (인코더/디코더). 응답을 시니어 화면 구조로 변환.
      const resp = await api.analyze({ type: "sms", content: textInput });
      setResult({
        risk_level: toLegacyRiskLevel(resp.riskLevel),
        risk_score: resp.riskScore,
        smishing_type: resp.smishingType,
        reasons: toSeniorReasons(resp.reasons.map((r) => r.label)),
        action_guide: toSeniorActions(resp.actionGuide.map((a) => a.action)),
      });
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      const msg = e instanceof ApiException ? e.message : "분석 중 오류가 발생했습니다. 다시 시도해주세요.";
      setError(msg);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTextInput("");
    setResult(null);
    setError("");
    setFeedback(null);
    textareaRef.current?.focus();
  };

  const cfg = result ? riskConfig[result.risk_level] : null;

  return (
    <div className="min-h-full">
      {/* 상단 툴바 — 시니어 모드에서는 숨김 (Layout GNB + SeniorBottomBar가 제공) */}
      {!seniorMode && (
      <div className="sticky top-0 z-20 bg-white dark:bg-[#0b1120]/95 backdrop-blur border-b-2 border-slate-200 dark:border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : nav("/")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-200 dark:bg-white/8 border-2 border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:bg-slate-300 dark:bg-white/15 active:scale-95 transition-all"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
          >
            <ArrowLeft size={22} /> 뒤로
          </button>
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-200 dark:bg-white/8 border-2 border-slate-300 dark:border-white/15 text-slate-900 dark:text-white hover:bg-slate-300 dark:bg-white/15 active:scale-95 transition-all"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
          >
            <Home size={22} /> 처음
          </button>

          <div className="ml-auto" />
        </div>
      </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-8 pb-32">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center shadow-lg mb-4">
            <ShieldAlert size={32} className="text-slate-900 dark:text-white" />
          </div>
          <h1 className="text-slate-900 dark:text-white mb-2 text-4xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
            문자 검사하기
          </h1>
          <p className="text-slate-600 dark:text-white/75 text-lg" style={{ lineHeight: 1.5 }}>
            받은 문자를 아래 칸에 붙여넣으세요
          </p>
        </div>

        {/* 예시 버튼 */}
        <div className="mb-5">
          <p className="text-slate-500 dark:text-white/60 mb-3 text-base" style={{ fontWeight: 600 }}>
            예시 문자로 테스트해보기
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_TEXTS.map((s) => (
              <button
                key={s.label}
                onClick={() => { setTextInput(s.text); setError(""); }}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/10 border-2 border-slate-200 dark:border-white/15 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/15 transition-all text-base" style={{ fontWeight: 600 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="rounded-3xl bg-slate-50 dark:bg-[#111c30] border-2 border-slate-300 dark:border-white/15 p-6 mb-5">
          <p className="text-slate-500 dark:text-white/60 mb-3 text-base" style={{ fontWeight: 600 }}>
            문자 내용을 여기에 붙여넣으세요
          </p>
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => { setTextInput(e.target.value.slice(0, MAX_LEN)); setError(""); }}
            placeholder="받은 문자를 길게 눌러 복사한 뒤 여기에 붙여넣으세요..."
            rows={10}
            maxLength={MAX_LEN}
            className="w-full bg-slate-100 dark:bg-black/30 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 outline-none resize-none border-2 border-slate-200 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-base"
            style={{ lineHeight: 1.6 }}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-slate-500 dark:text-white/40 text-sm">
              {textInput.length} / {MAX_LEN}자
            </span>
            {textInput && (
              <button
                onClick={() => { setTextInput(""); setError(""); }}
                className="px-4 py-2 rounded-lg bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/60 hover:bg-slate-300 dark:bg-white/15 hover:text-slate-900 dark:hover:text-white transition-all"
                style={{ fontSize: "1rem", fontWeight: 600 }}
              >
                지우기
              </button>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-red-500/15 border-2 border-red-500/40 p-5 mb-5"
          >
            <p className="text-red-600 dark:text-red-200 flex items-center gap-3 text-base" style={{ fontWeight: 600 }}>
              <AlertTriangle size={22} />
              {error}
            </p>
          </motion.div>
        )}

        {/* 검사 버튼 */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleAnalyze}
            disabled={!textInput.trim() || loading}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-white disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] transition-all text-2xl"
            style={!textInput.trim() || loading ? undefined : { backgroundColor: "#3B82F6", fontWeight: 700, lineHeight: 1.2, boxShadow: "0 8px 24px rgba(59,130,246,0.4)" }}
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <ShieldAlert size={26} />
                검사하기
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-5 rounded-2xl border-2 border-slate-300 dark:border-white/15 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:bg-white/10 active:scale-95 transition-all"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="rounded-2xl bg-blue-500/10 border-2 border-blue-500/25 p-5 mb-8">
          <p className="text-blue-600 dark:text-blue-200 text-base" style={{ lineHeight: 1.5 }}>
            <strong>개인정보 보호:</strong> 입력한 문자는 분석 후 바로 삭제되며 저장하지 않습니다.
          </p>
        </div>

        {/* 분석 중 화면 */}
        <div ref={resultRef}>
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-3xl bg-slate-50 dark:bg-[#111c30] border-2 border-blue-500/30 p-10 flex flex-col items-center justify-center gap-6 min-h-[350px]">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-3 border-blue-500/20 animate-ping" />
                    <div className="absolute inset-3 rounded-full border-3 border-blue-500/40 animate-ping" style={{ animationDelay: "0.3s" }} />
                    <div className="absolute inset-6 rounded-full bg-blue-500/25 flex items-center justify-center">
                      <ShieldAlert size={24} className="text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-900 dark:text-white mb-2 text-2xl" style={{ fontWeight: 700, lineHeight: 1.3 }}>
                      분석 중입니다...
                    </p>
                    <p className="text-slate-500 dark:text-white/60" style={{ fontSize: "1.15rem" }}>
                      잠시만 기다려주세요
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 결과 화면 */}
            {!loading && result && cfg && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* 신호등 + 판정 */}
                <div className={`rounded-3xl border-3 ${cfg.bg} ${cfg.border} p-8`}>
                  <div className="flex items-center gap-6 mb-6">
                    {/* 신호등 */}
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-200 dark:bg-black/40 shrink-0">
                      {(["danger", "warning", "normal"] as const).map((lv) => {
                        const active = result.risk_level === lv;
                        const colors = { danger: "bg-red-500", warning: "bg-amber-400", normal: "bg-emerald-400" };
                        const shadows = { danger: "#ef4444", warning: "#fbbf24", normal: "#34d399" };
                        return (
                          <div
                            key={lv}
                            className={`w-12 h-12 rounded-full transition-all ${active ? `${colors[lv]} shadow-2xl` : "bg-slate-300 dark:bg-white/10"}`}
                            style={active ? { boxShadow: `0 0 30px ${shadows[lv]}` } : {}}
                          />
                        );
                      })}
                    </div>

                    {/* 판정 결과 */}
                    <div className="flex-1">
                      <p className={`mb-2 ${cfg.color}`} style={{ fontWeight: 800, fontSize: "2.2rem", letterSpacing: "-0.015em" }}>
                        {cfg.label}
                      </p>
                      <p className="text-slate-700 dark:text-white/85" style={{ fontSize: "1.3rem", lineHeight: 1.5, fontWeight: 600 }}>
                        {cfg.desc}
                      </p>
                    </div>
                  </div>

                  {/* 위험도 점수 */}
                  <div className="pt-6 border-t-2 border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-500 dark:text-white/60" style={{ fontSize: "1.15rem" }}>위험도 점수</span>
                      <span className={`${cfg.color} text-4xl`} style={{ fontWeight: 800, lineHeight: 1 }}>
                        {result.risk_score}
                        <span className="text-slate-500 dark:text-white/50 ml-2 text-lg" style={{ fontWeight: 500, lineHeight: 1 }}>/ 100점</span>
                      </span>
                    </div>
                    <div className="h-4 bg-slate-300 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.risk_score}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full ${cfg.trafficLight}`}
                      />
                    </div>
                  </div>
                </div>

                {/* 판단 이유 */}
                <div className="rounded-3xl bg-slate-50 dark:bg-[#111c30] border-2 border-slate-300 dark:border-white/15 p-6">
                  <p className="text-slate-700 dark:text-white/70 mb-4 text-lg font-semibold">
                    왜 이렇게 판단했나요?
                  </p>
                  <ol className="space-y-4">
                    {result.reasons.map((reason, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4"
                      >
                        <span
                          className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center border-2 border-blue-500/30 text-lg"
                          style={{ fontWeight: 700, lineHeight: 1 }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 text-lg" style={{ lineHeight: 1.5 }}>
                          {reason}
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                </div>

                {/* 행동 가이드 */}
                {result.risk_level === "danger" && (
                  <div className="rounded-3xl bg-red-500/15 border-3 border-red-500/40 p-7">
                    <p className="text-red-600 dark:text-red-200 mb-5 flex items-center gap-3 text-2xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                      <AlertTriangle size={26} />
                      절대 하지 마세요!
                    </p>
                    <ul className="space-y-4 text-slate-800 dark:text-white/95 mb-6 text-lg" style={{ lineHeight: 1.5 }}>
                      {result.action_guide.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-red-400 text-2xl shrink-0">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-5 border-t-2 border-red-500/30">
                      <p className="text-red-600 dark:text-red-200/90 mb-4 text-base" style={{ fontWeight: 600 }}>
                        이미 링크를 눌렀거나 정보를 입력했다면 <strong>즉시 신고</strong>하세요
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <a
                          href="tel:112"
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-red-600/20 border-2 border-red-500/60 text-red-700 dark:text-red-100 hover:bg-red-600/30 active:scale-95 transition-all text-base"
                          style={{ fontWeight: 700, lineHeight: 1.2 }}
                        >
                          <Phone size={24} />
                          112 경찰
                        </a>
                        <a
                          href="tel:1332"
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-amber-600/20 border-2 border-amber-500/60 text-amber-700 dark:text-amber-100 hover:bg-amber-600/30 active:scale-95 transition-all text-base"
                          style={{ fontWeight: 700, lineHeight: 1.2 }}
                        >
                          <Phone size={24} />
                          1332 금감원
                        </a>
                        <a
                          href="tel:118"
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-blue-600/20 border-2 border-blue-500/60 text-blue-700 dark:text-blue-100 hover:bg-blue-600/30 active:scale-95 transition-all text-base"
                          style={{ fontWeight: 700, lineHeight: 1.2 }}
                        >
                          <Phone size={24} />
                          118 사이버
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {result.risk_level === "warning" && (
                  <div className="rounded-3xl bg-amber-500/15 border-3 border-amber-500/40 p-7">
                    <p className="text-amber-600 dark:text-amber-200 mb-4 flex items-center gap-3 text-2xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                      <AlertTriangle size={26} />
                      이렇게 하세요
                    </p>
                    <ul className="space-y-4 text-slate-800 dark:text-white/90 text-lg" style={{ lineHeight: 1.5 }}>
                      {result.action_guide.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-amber-400 text-2xl shrink-0">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.risk_level === "normal" && (
                  <div className="rounded-3xl bg-emerald-500/15 border-3 border-emerald-500/40 p-7">
                    <p className="text-emerald-600 dark:text-emerald-200 mb-4 flex items-center gap-3 text-2xl" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                      <ShieldCheck size={26} />
                      안심하셔도 좋습니다
                    </p>
                    <p className="text-slate-700 dark:text-slate-200 mb-4 text-lg" style={{ lineHeight: 1.5 }}>
                      이 문자는 안전한 것으로 보입니다.
                    </p>
                    <ul className="space-y-3 text-slate-700 dark:text-white/75" style={{ lineHeight: 1.6 }}>
                      {result.action_guide.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-emerald-400 shrink-0">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 피드백 */}
                <div className="rounded-3xl bg-slate-50 dark:bg-[#111c30] border-2 border-slate-300 dark:border-white/15 p-6">
                  <p className="text-slate-700 dark:text-white/70 mb-4 text-base">
                    이 결과가 정확했나요?
                  </p>
                  {feedback ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-blue-500/15 border-2 border-blue-500/30"
                    >
                      <p className="text-blue-600 dark:text-blue-200 flex items-center gap-3 text-base" style={{ fontWeight: 600 }}>
                        <CheckCircle2 size={22} />
                        감사합니다! 더 정확한 분석을 위해 활용하겠습니다.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setFeedback("up")}
                        className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/35 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/25 active:scale-95 transition-all text-lg"
                        style={{ fontWeight: 600, lineHeight: 1.2 }}
                      >
                        <ThumbsUp size={22} />
                        정확해요
                      </button>
                      <button
                        onClick={() => setFeedback("down")}
                        className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-red-500/15 border-2 border-red-500/35 text-red-700 dark:text-red-200 hover:bg-red-500/25 active:scale-95 transition-all text-lg"
                        style={{ fontWeight: 600, lineHeight: 1.2 }}
                      >
                        <ThumbsDown size={22} />
                        틀렸어요
                      </button>
                    </div>
                  )}
                </div>

                {/* 3버튼 — 신고 / 가족 / 다시검사 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => nav("/report")}
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-red-500/20 border-2 border-red-500/50 text-red-700 dark:text-red-100 hover:bg-red-500/30 active:scale-95 transition-all text-lg"
                    style={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    🚨 이 사이트에 신고
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: "의심 문자 검사 결과", text: "내가 검사한 문자 — 위험" }).catch(() => {});
                      } else {
                        alert("공유 기능은 모바일에서 사용 가능합니다.");
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-700 dark:text-emerald-100 hover:bg-emerald-500/30 active:scale-95 transition-all text-lg"
                    style={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    👨‍👩‍👧 가족에게 보여주기
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-blue-500/20 border-2 border-blue-500/50 text-blue-700 dark:text-blue-100 hover:bg-blue-500/30 active:scale-95 transition-all text-lg"
                    style={{ fontWeight: 600, lineHeight: 1.2 }}
                  >
                    <RotateCcw size={20} />
                    다시 검사
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
