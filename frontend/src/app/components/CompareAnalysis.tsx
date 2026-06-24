import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SplitSquareHorizontal, BarChart2, RefreshCw, Lightbulb } from "lucide-react";
import { api } from "@/lib/api";
import type { AnalysisResult } from "@/types/api";

const RISK_KW = ["즉시", "긴급", "정지", "동결", "납부", "미납", "경고", "당첨", "소멸", "혐의", "체포", "대출", "클릭", "확인"];
function analyze(text: string) {
  const kws = RISK_KW.filter((k) => text.includes(k));
  const hasUrl = /http/i.test(text);
  const raw = kws.length * 1.6 + (hasUrl ? 2 : 0) + Math.random() * 0.8;
  const score = Math.max(1, Math.min(10, Math.round(raw)));
  const level = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
  const reasons: string[] = [];
  if (kws.length > 0) reasons.push(`위험 키워드 ${kws.length}개 감지: "${kws.slice(0, 3).join('", "')}"`);
  if (hasUrl) reasons.push("의심 URL 포함");
  if (text.includes("【") || text.includes("】")) reasons.push("공공기관 사칭 형식 감지");
  if (text.length < 30) reasons.push("지나치게 짧은 메시지");
  if (reasons.length === 0) reasons.push("위험 패턴 미감지");
  return { score, level, reasons, keywords: kws };
}

// 백엔드 분석 응답(/api/predict)을 비교 화면 구조로 변환
function adapt(resp: AnalysisResult): ReturnType<typeof analyze> {
  return {
    score: Math.max(1, Math.min(10, Math.round(resp.riskScore / 10))),
    level: resp.riskLevel.toUpperCase() as "HIGH" | "MEDIUM" | "LOW",
    reasons: resp.reasons.map((r) => r.label),
    keywords: [],
  };
}

const LEVEL_COLOR: { [k: string]: { text: string; bg: string; border: string; bar: string } } = {
  HIGH: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", bar: "#ef4444" },
  MEDIUM: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", bar: "#f97316" },
  LOW: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", bar: "#22c55e" },
};

const SAMPLE_PAIRS = [
  {
    a: "【국민건강보험】미납보험료 즉시 납부 http://nhis-pay.kr",
    b: "[국민건강보험공단] 5월 보험료 안내. 자세한 내용은 nhis.or.kr에서 확인하세요.",
  },
  {
    a: "갤럭시S25 당첨! 즉시 수령 → http://prize.xyz",
    b: "[삼성전자] 갤럭시S25 사전예약 안내. 공식 홈페이지 samsung.com/kr을 방문해주세요.",
  },
];

export function CompareAnalysis() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [results, setResults] = useState<{ a: ReturnType<typeof analyze>; b: ReturnType<typeof analyze> } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!textA.trim() || !textB.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      // 두 문자를 백엔드(/api/predict)로 동시 분석
      const [a, b] = await Promise.all([
        api.analyze({ type: "sms", content: textA }),
        api.analyze({ type: "sms", content: textB }),
      ]);
      setResults({ a: adapt(a), b: adapt(b) });
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (pair: typeof SAMPLE_PAIRS[0]) => {
    setTextA(pair.a);
    setTextB(pair.b);
    setResults(null);
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <SplitSquareHorizontal size={14} className="text-orange-400" />
          <span className="text-xs text-orange-400 tracking-widest uppercase">비교 분석</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>문자 나란히 비교 분석</h1>
        <p className="text-sm text-white/40">두 문자의 위험도를 동시에 분석하여 비교합니다.</p>
      </div>

      {/* Sample pairs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <p className="text-[11px] text-white/25 self-center">샘플:</p>
        {SAMPLE_PAIRS.map((p, i) => (
          <button key={i} onClick={() => loadSample(p)}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-white/35 hover:text-orange-400 hover:border-orange-500/25 transition-all">
            샘플 쌍 {i + 1}
          </button>
        ))}
      </div>

      {/* Input grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {([{ val: textA, set: setTextA, label: "문자 A" }, { val: textB, set: setTextB, label: "문자 B" }] as const).map((f, _fi) => (
          <div key={f.label} className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/35 mb-2">{f.label}</p>
            <textarea value={f.val} onChange={(e) => f.set(e.target.value)} rows={4}
              placeholder="분석할 문자 내용 입력..."
              className="w-full bg-transparent text-sm text-white/75 placeholder:text-white/20 outline-none resize-none" />
          </div>
        ))}
      </div>

      <button onClick={handleAnalyze} disabled={!textA.trim() || !textB.trim() || loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm disabled:opacity-40 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/15 mb-6">
        {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 비교 분석 중...</>
          : <><BarChart2 size={14} /> 동시 비교 분석</>}
      </button>

      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Score comparison bar */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-xs text-white/40 mb-4">위험도 점수 비교</p>
              <div className="space-y-4">
                {[
                  { label: "문자 A", r: results.a },
                  { label: "문자 B", r: results.b },
                ].map(({ label, r }) => {
                  const lc = LEVEL_COLOR[r.level];
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/50">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${lc.bg} ${lc.border} ${lc.text}`}>{r.level}</span>
                          <span className={`text-sm ${lc.text}`} style={{ fontWeight: 700 }}>{r.score}/10</span>
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${r.score * 10}%` }} transition={{ duration: 0.7 }}
                          className="h-full rounded-full" style={{ backgroundColor: lc.bar, opacity: 0.8 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delta */}
              <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-center gap-2">
                <span className="text-xs text-white/30">점수 차이:</span>
                <span className="text-sm text-white/70" style={{ fontWeight: 600 }}>
                  {Math.abs(results.a.score - results.b.score)}점
                  ({results.a.score > results.b.score ? "A가 더 위험" : results.b.score > results.a.score ? "B가 더 위험" : "동일"})
                </span>
              </div>
            </div>

            {/* Detail side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[{ label: "문자 A", r: results.a }, { label: "문자 B", r: results.b }].map(({ label, r }) => {
                const lc = LEVEL_COLOR[r.level];
                return (
                  <div key={label} className={`rounded-xl border p-4 ${lc.bg} ${lc.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-sm ${lc.text}`} style={{ fontWeight: 600 }}>{label} — {r.level}</p>
                      <p className={`text-lg ${lc.text}`} style={{ fontWeight: 700 }}>{r.score}/10</p>
                    </div>
                    {r.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {r.keywords.map((kw) => (
                          <span key={kw} className={`text-[10px] px-1.5 py-0.5 rounded border ${lc.border} ${lc.text}`}>{kw}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {r.reasons.map((reason, i) => (
                        <p key={i} className="text-[11px] text-white/55 flex items-start gap-1.5">
                          <span className="text-white/20 shrink-0 mt-0.5">•</span>{reason}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insight */}
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 flex gap-3">
              <Lightbulb size={13} className="text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-white/50 leading-relaxed">
                {results.a.score > results.b.score
                  ? `문자 A가 ${results.a.score - results.b.score}점 더 위험합니다. 두 문자의 주요 차이는 URL 포함 여부와 위험 키워드 수입니다.`
                  : results.b.score > results.a.score
                  ? `문자 B가 ${results.b.score - results.a.score}점 더 위험합니다. 공식 도메인 사용 여부가 핵심 차이입니다.`
                  : "두 문자의 위험도가 동일하게 평가되었습니다."}
              </p>
            </div>

            <button onClick={() => { setResults(null); setTextA(""); setTextB(""); }}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-all">
              <RefreshCw size={11} /> 다시 비교
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
