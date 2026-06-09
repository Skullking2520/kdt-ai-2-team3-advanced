import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, ArrowLeft, Home,
  Phone, CheckCircle2, ThumbsUp, ThumbsDown, RotateCcw,
  ZoomIn, ZoomOut,
} from "lucide-react";
import type { AnalysisResult as ApiAnalysisResult } from "@/types/api";
import { analyzeSms, toLegacyRiskLevel, toSeniorReasons, toSeniorActions } from "@/lib/smsAnalysis";
import { api } from "@/lib/api";

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

// 백엔드 응답(camelCase)을 시니어 UI용 로컬 인터페이스(snake_case)로 변환
// toSeniorReasons/Actions로 어투 변환 적용 (사전 미등록 문자열은 원문 그대로)
function adaptApiResult(apiRes: ApiAnalysisResult): AnalysisResult {
  const riskMap: Record<string, "danger" | "warning" | "normal"> = {
    high: "danger",
    medium: "warning",
    low: "normal",
  };
  return {
    risk_level: riskMap[apiRes.riskLevel] ?? "normal",
    risk_score: apiRes.riskScore,
    smishing_type: apiRes.smishingType,
    reasons: toSeniorReasons(apiRes.reasons.map((r) => r.label)),
    action_guide: toSeniorActions(apiRes.actionGuide.map((a) => a.action)),
  };
}

const MAX_LEN = 500;

export function SeniorAnalyzer() {
  const nav = useNavigate();
  const [textInput, setTextInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return parseFloat(localStorage.getItem("nb_senior_zoom") || "1");
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("nb_senior_zoom", String(zoom));
    document.documentElement.style.setProperty("--senior-zoom", String(zoom));
  }, [zoom]);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // 입력 중 오프라인 즉시 미리보기 — "검사하기" 클릭 시 백엔드 응답으로 덮어씀
  useEffect(() => {
    if (!textInput.trim()) { setResult(null); return; }
    const sms = analyzeSms(textInput);
    setResult({
      risk_level: toLegacyRiskLevel(sms.risk_level),
      risk_score: sms.risk_score,
      smishing_type: sms.smishing_type,
      reasons: toSeniorReasons(sms.reasons),
      action_guide: toSeniorActions(sms.action_guide),
    });
  }, [textInput]);

  // "검사하기" 클릭 → 백엔드 POST /predict 호출 → adaptApiResult로 시니어 어투 변환 → setResult
  const handleAnalyze = async () => {
    setError("");
    if (!textInput.trim()) { setError("문자 내용을 입력해주세요."); return; }
    if (textInput.trim().length < 5) { setError("문자를 조금 더 입력해주세요."); return; }

    setLoading(true);
    setResult(null);
    setFeedback(null);

    try {
      const apiResult = await api.analyze({ type: "sms", content: textInput });
      setResult(adaptApiResult(apiResult));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
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
    <div className="min-h-full" style={{ fontSize: `${zoom}rem` }}>
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-20 bg-[#0b1120]/95 backdrop-blur border-b-2 border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : nav("/")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 transition-all"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
          >
            <ArrowLeft size={22} /> 뒤로
          </button>
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 transition-all"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
          >
            <Home size={22} /> 처음
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.85, +(z - 0.1).toFixed(2)))}
              className="w-12 h-12 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 flex items-center justify-center"
            >
              <ZoomOut size={22} />
            </button>
            <span className="text-white/70 px-2" style={{ fontSize: "1rem", fontWeight: 600, minWidth: 50, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
              className="w-12 h-12 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 flex items-center justify-center"
            >
              <ZoomIn size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center shadow-xl shadow-cyan-500/30 mb-4">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h1 className="text-white mb-2" style={{ fontWeight: 800, fontSize: "2rem", letterSpacing: "-0.02em" }}>
            문자 검사하기
          </h1>
          <p className="text-white/75" style={{ fontSize: "1.2rem", lineHeight: 1.6 }}>
            받은 문자를 아래 칸에 붙여넣으세요
          </p>
        </div>

        {/* 예시 버튼 */}
        <div className="mb-5">
          <p className="text-white/60 mb-3" style={{ fontSize: "1.05rem", fontWeight: 600 }}>
            예시 문자로 테스트해보기
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_TEXTS.map((s) => (
              <button
                key={s.label}
                onClick={() => { setTextInput(s.text); setError(""); }}
                className="px-4 py-3 rounded-xl bg-white/8 border-2 border-white/15 text-white/80 hover:bg-white/15 hover:text-white transition-all"
                style={{ fontSize: "1.05rem", fontWeight: 600 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="rounded-3xl bg-[#111c30] border-2 border-white/15 p-6 mb-5">
          <p className="text-white/60 mb-3" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            문자 내용을 여기에 붙여넣으세요
          </p>
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value.slice(0, MAX_LEN))}
            placeholder="받은 문자를 길게 눌러 복사한 뒤 여기에 붙여넣으세요..."
            rows={10}
            maxLength={MAX_LEN}
            className="w-full bg-black/30 rounded-xl p-4 text-white/90 placeholder:text-white/25 outline-none resize-none border-2 border-white/10 focus:border-cyan-500/50 transition-all"
            style={{ fontSize: "1.15rem", lineHeight: 1.7 }}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-white/40" style={{ fontSize: "1rem" }}>
              {textInput.length} / {MAX_LEN}자
            </span>
            {textInput && (
              <button
                onClick={() => { setTextInput(""); setError(""); }}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
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
            <p className="text-red-200 flex items-center gap-3" style={{ fontSize: "1.15rem", fontWeight: 600 }}>
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
            className="flex-1 flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-cyan-500/30"
            style={{ fontWeight: 800, fontSize: "1.4rem" }}
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
            className="px-5 py-5 rounded-2xl border-2 border-white/15 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="rounded-2xl bg-blue-500/10 border-2 border-blue-500/25 p-5 mb-8">
          <p className="text-blue-200" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
            <strong>개인정보 보호:</strong> 입력한 문자는 분석 후 바로 삭제되며 저장하지 않습니다.
          </p>
        </div>

        {/* 분석 중 화면 */}
        <div ref={resultRef}>
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-3xl bg-[#111c30] border-2 border-cyan-500/30 p-10 flex flex-col items-center justify-center gap-6 min-h-[350px]">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-3 border-cyan-500/20 animate-ping" />
                    <div className="absolute inset-3 rounded-full border-3 border-cyan-500/40 animate-ping" style={{ animationDelay: "0.3s" }} />
                    <div className="absolute inset-6 rounded-full bg-cyan-500/25 flex items-center justify-center">
                      <ShieldAlert size={24} className="text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.6rem" }}>
                      분석 중입니다...
                    </p>
                    <p className="text-white/60" style={{ fontSize: "1.15rem" }}>
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
                    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/40 shrink-0">
                      {(["danger", "warning", "normal"] as const).map((lv) => {
                        const active = result.risk_level === lv;
                        const colors = { danger: "bg-red-500", warning: "bg-amber-400", normal: "bg-emerald-400" };
                        const shadows = { danger: "#ef4444", warning: "#fbbf24", normal: "#34d399" };
                        return (
                          <div
                            key={lv}
                            className={`w-12 h-12 rounded-full transition-all ${active ? `${colors[lv]} shadow-2xl` : "bg-white/10"}`}
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
                      <p className="text-white/85" style={{ fontSize: "1.3rem", lineHeight: 1.5, fontWeight: 600 }}>
                        {cfg.desc}
                      </p>
                    </div>
                  </div>

                  {/* 위험도 점수 */}
                  <div className="pt-6 border-t-2 border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60" style={{ fontSize: "1.15rem" }}>위험도 점수</span>
                      <span className={cfg.color} style={{ fontWeight: 800, fontSize: "2.5rem" }}>
                        {result.risk_score}
                        <span className="text-white/50 ml-2" style={{ fontSize: "1.3rem", fontWeight: 600 }}>/ 100점</span>
                      </span>
                    </div>
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden">
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
                <div className="rounded-3xl bg-[#111c30] border-2 border-white/15 p-6">
                  <p className="text-white/70 mb-4" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
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
                          className="shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center border-2 border-cyan-500/30"
                          style={{ fontWeight: 800, fontSize: "1.2rem" }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-white/85" style={{ fontSize: "1.2rem", lineHeight: 1.7 }}>
                          {reason}
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                </div>

                {/* 행동 가이드 */}
                {result.risk_level === "danger" && (
                  <div className="rounded-3xl bg-red-500/15 border-3 border-red-500/40 p-7">
                    <p className="text-red-200 mb-5 flex items-center gap-3" style={{ fontWeight: 800, fontSize: "1.5rem" }}>
                      <AlertTriangle size={26} />
                      절대 하지 마세요!
                    </p>
                    <ul className="space-y-4 text-white/95 mb-6" style={{ fontSize: "1.25rem", lineHeight: 1.8, fontWeight: 600 }}>
                      {result.action_guide.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-red-400 text-2xl shrink-0">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-5 border-t-2 border-red-500/30">
                      <p className="text-red-200/90 mb-4" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                        이미 링크를 눌렀거나 정보를 입력했다면 <strong>즉시 신고</strong>하세요
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <a
                          href="tel:112"
                          className="flex flex-col items-center justify-center gap-2 px-5 py-5 rounded-2xl bg-red-600/30 border-2 border-red-500/60 text-red-100 hover:bg-red-600/40 active:scale-95 transition-all"
                          style={{ fontWeight: 800, fontSize: "1.3rem" }}
                        >
                          <Phone size={28} />
                          112 경찰
                        </a>
                        <a
                          href="tel:1332"
                          className="flex flex-col items-center justify-center gap-2 px-5 py-5 rounded-2xl bg-amber-600/30 border-2 border-amber-500/60 text-amber-100 hover:bg-amber-600/40 active:scale-95 transition-all"
                          style={{ fontWeight: 800, fontSize: "1.3rem" }}
                        >
                          <Phone size={28} />
                          1332 금감원
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {result.risk_level === "warning" && (
                  <div className="rounded-3xl bg-amber-500/15 border-3 border-amber-500/40 p-7">
                    <p className="text-amber-200 mb-4 flex items-center gap-3" style={{ fontWeight: 800, fontSize: "1.5rem" }}>
                      <AlertTriangle size={26} />
                      이렇게 하세요
                    </p>
                    <ul className="space-y-4 text-white/90" style={{ fontSize: "1.25rem", lineHeight: 1.8, fontWeight: 600 }}>
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
                    <p className="text-emerald-200 mb-4 flex items-center gap-3" style={{ fontWeight: 800, fontSize: "1.5rem" }}>
                      <ShieldCheck size={26} />
                      안심하셔도 좋습니다
                    </p>
                    <p className="text-white/85 mb-4" style={{ fontSize: "1.2rem", lineHeight: 1.7 }}>
                      이 문자는 안전한 것으로 보입니다.
                    </p>
                    <ul className="space-y-3 text-white/75" style={{ fontSize: "1.15rem", lineHeight: 1.7 }}>
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
                <div className="rounded-3xl bg-[#111c30] border-2 border-white/15 p-6">
                  <p className="text-white/70 mb-4" style={{ fontSize: "1.15rem" }}>
                    이 결과가 정확했나요?
                  </p>
                  {feedback ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/30"
                    >
                      <p className="text-cyan-200 flex items-center gap-3" style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                        <CheckCircle2 size={22} />
                        감사합니다! 더 정확한 분석을 위해 활용하겠습니다.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setFeedback("up")}
                        className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/25 active:scale-95 transition-all"
                        style={{ fontWeight: 700, fontSize: "1.2rem" }}
                      >
                        <ThumbsUp size={22} />
                        정확해요
                      </button>
                      <button
                        onClick={() => setFeedback("down")}
                        className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-red-500/15 border-2 border-red-500/35 text-red-200 hover:bg-red-500/25 active:scale-95 transition-all"
                        style={{ fontWeight: 700, fontSize: "1.2rem" }}
                      >
                        <ThumbsDown size={22} />
                        틀렸어요
                      </button>
                    </div>
                  )}
                </div>

                {/* 다시 검사 버튼 */}
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-2 border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30 active:scale-[0.98] transition-all"
                  style={{ fontWeight: 700, fontSize: "1.3rem" }}
                >
                  <RotateCcw size={24} />
                  다른 문자 검사하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
