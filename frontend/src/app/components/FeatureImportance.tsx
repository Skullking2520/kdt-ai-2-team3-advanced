import { useState } from "react";
import { motion } from "motion/react";
import { Microscope, Info } from "lucide-react"

/* ─── SHAP 데이터 ────────────────────────────────── */
const EXAMPLES = [
  {
    label: "HIGH 피싱",
    text: "【국민건강보험】미납보험료 89,200원 즉시 납부. 정지됩니다 → http://nhis-pay.kr",
    prediction: 9.2,
    level: "HIGH",
    tokens: [
      { token: "【국민건강보험】", shap: 1.42, type: "impersonation" },
      { token: "미납", shap: 0.98, type: "threat" },
      { token: "보험료", shap: 0.31, type: "neutral" },
      { token: "89,200원", shap: 0.22, type: "neutral" },
      { token: "즉시", shap: 1.15, type: "urgency" },
      { token: "납부", shap: 0.87, type: "threat" },
      { token: "정지됩니다", shap: 1.33, type: "threat" },
      { token: "→", shap: 0.12, type: "neutral" },
      { token: "http://nhis-pay.kr", shap: 1.68, type: "url" },
    ],
  },
  {
    label: "MEDIUM 의심",
    text: "이번 달 특별 이벤트 당첨! 선물을 받으시려면 링크를 클릭하세요 http://event.xyz",
    prediction: 5.8,
    level: "MEDIUM",
    tokens: [
      { token: "이번 달", shap: 0.08, type: "neutral" },
      { token: "특별", shap: 0.44, type: "urgency" },
      { token: "이벤트", shap: 0.38, type: "neutral" },
      { token: "당첨!", shap: 0.92, type: "threat" },
      { token: "선물", shap: 0.27, type: "neutral" },
      { token: "받으시려면", shap: 0.14, type: "neutral" },
      { token: "링크를", shap: 0.61, type: "threat" },
      { token: "클릭하세요", shap: 0.73, type: "urgency" },
      { token: "http://event.xyz", shap: 1.22, type: "url" },
    ],
  },
  {
    label: "LOW 정상",
    text: "[카카오뱅크] 홍길동님, 5월 이자 납입 안내. 자세한 내용은 앱에서 확인해주세요.",
    prediction: 1.4,
    level: "LOW",
    tokens: [
      { token: "[카카오뱅크]", shap: -0.32, type: "safe" },
      { token: "홍길동님", shap: -0.41, type: "safe" },
      { token: "5월 이자", shap: -0.08, type: "neutral" },
      { token: "납입", shap: 0.11, type: "neutral" },
      { token: "안내", shap: -0.22, type: "safe" },
      { token: "자세한 내용", shap: -0.09, type: "neutral" },
      { token: "앱에서", shap: -0.44, type: "safe" },
      { token: "확인해주세요", shap: -0.18, type: "safe" },
    ],
  },
];

const GLOBAL_FEATURES = [
  { name: "의심 URL 포함", importance: 0.312, color: "#ef4444" },
  { name: "위협 동사 (정지/동결/차단)", importance: 0.248, color: "#f97316" },
  { name: "공공기관명 사칭", importance: 0.201, color: "#f59e0b" },
  { name: "긴급성 표현 (즉시/빨리)", importance: 0.187, color: "#eab308" },
  { name: "금전 관련 명사", importance: 0.142, color: "#84cc16" },
  { name: "개인번호 발신", importance: 0.118, color: "#22c55e" },
  { name: "이벤트/당첨 키워드", importance: 0.094, color: "#10b981" },
  { name: "외국 TLD 도메인", importance: 0.087, color: "#06b6d4" },
  { name: "괄호형 발신자 표기", importance: 0.071, color: "#3b82f6" },
  { name: "비공식 도메인 패턴", importance: 0.065, color: "#8b5cf6" },
];

type TokenType = "impersonation" | "threat" | "urgency" | "url" | "safe" | "neutral";

const TOKEN_STYLE: Record<TokenType, { bg: string; text: string; border: string }> = {
  impersonation: { bg: "bg-purple-500/25",  text: "text-purple-300", border: "border-purple-500/40" },
  threat:        { bg: "bg-red-500/25",     text: "text-red-300",    border: "border-red-500/40" },
  urgency:       { bg: "bg-orange-500/25",  text: "text-orange-300", border: "border-orange-500/40" },
  url:           { bg: "bg-yellow-500/25",  text: "text-yellow-300", border: "border-yellow-500/40" },
  safe:          { bg: "bg-emerald-500/15", text: "text-emerald-400",border: "border-emerald-500/30" },
  neutral:       { bg: "bg-white/5",        text: "text-white/50",   border: "border-white/10" },
};

function WaterfallBar({ value, maxAbs }: { value: number; maxAbs: number }) {
  const pct = Math.abs(value) / maxAbs * 100;
  const isPos = value >= 0;
  return (
    <div className="flex items-center gap-1 w-32">
      {isPos
        ? <><div className="w-16 flex justify-end"><div className="h-2.5 rounded-l-sm bg-white/5" style={{ width: "100%" }} /></div>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 0.64}px` }} transition={{ duration: 0.5 }}
              className="h-2.5 rounded-r-sm" style={{ backgroundColor: "#ef4444", opacity: 0.8 }} /></>
        : <><motion.div initial={{ width: 0 }} animate={{ width: `${pct * 0.64}px` }} transition={{ duration: 0.5 }}
              className="h-2.5 rounded-l-sm" style={{ backgroundColor: "#22c55e", opacity: 0.8 }} />
            <div className="w-16"><div className="h-2.5 rounded-r-sm bg-white/5" style={{ width: "100%" }} /></div></>}
    </div>
  );
}

export function FeatureImportance() {
  const [activeEx, setActiveEx] = useState(0);
  const ex = EXAMPLES[activeEx];
  const maxAbs = Math.max(...ex.tokens.map((t) => Math.abs(t.shap)));
  const maxGlobal = GLOBAL_FEATURES[0].importance;

  const levelColor = { HIGH: "text-red-400", MEDIUM: "text-amber-400", LOW: "text-emerald-400" }[ex.level];
  const levelBg = { HIGH: "bg-red-500/15 border-red-500/25", MEDIUM: "bg-amber-500/15 border-amber-500/25", LOW: "bg-emerald-500/15 border-emerald-500/25" }[ex.level];

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Microscope size={14} className="text-fuchsia-400" />
          <span className="text-xs text-fuchsia-400 tracking-widest uppercase">Explainable AI · SHAP</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피처 중요도 분석</h1>
        <p className="text-sm text-white/40">SHAP Value 기반 토큰별 기여도 시각화 — 모델 판단 근거를 설명합니다.</p>
      </div>

      {/* Example selector */}
      <div className="flex gap-2 flex-wrap">
        {EXAMPLES.map((e, i) => (
          <button key={i} onClick={() => setActiveEx(i)}
            className={`px-3 py-2 rounded-xl text-xs border transition-all ${
              activeEx === i ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400" : "border-white/10 text-white/35 hover:text-white/55"
            }`}>
            {e.label}
          </button>
        ))}
      </div>

      {/* Text with inline token highlights */}
      <div className={`rounded-xl border p-4 ${levelBg}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-white/35">입력 문장</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${levelColor}`} style={{ fontWeight: 600 }}>{ex.level}</span>
            <span className="text-xs text-white/50">예측 점수 {ex.prediction}/10</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-baseline">
          {ex.tokens.map((t, i) => {
            const ts = TOKEN_STYLE[t.type as TokenType];
            return (
              <span key={i} className={`px-1.5 py-0.5 rounded-md text-xs border ${ts.bg} ${ts.text} ${ts.border}`}
                title={`SHAP: ${t.shap > 0 ? "+" : ""}${t.shap.toFixed(3)}`}>
                {t.token}
              </span>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/8">
          {(["impersonation", "threat", "urgency", "url", "safe", "neutral"] as TokenType[]).map((type) => {
            const ts = TOKEN_STYLE[type];
            const labels = { impersonation: "기관 사칭", threat: "위협 표현", urgency: "긴급성", url: "URL", safe: "안전 요소", neutral: "중립" };
            return (
              <span key={type} className={`flex items-center gap-1 text-[10px] ${ts.text}`}>
                <span className={`w-2 h-2 rounded-sm border ${ts.bg} ${ts.border}`} />
                {labels[type]}
              </span>
            );
          })}
        </div>
      </div>

      {/* SHAP Waterfall */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>토큰별 SHAP 기여도 (Waterfall)</p>
          <div className="flex items-center gap-3 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/70" />위험 증가</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/70" />위험 감소</span>
          </div>
        </div>
        <div className="space-y-2">
          {[...ex.tokens].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)).map((t, i) => {
            const ts = TOKEN_STYLE[t.type as TokenType];
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3">
                <span className={`text-[11px] px-2 py-0.5 rounded border w-44 shrink-0 truncate ${ts.bg} ${ts.text} ${ts.border}`}>{t.token}</span>
                <WaterfallBar value={t.shap} maxAbs={maxAbs} />
                <span className={`text-[11px] w-12 text-right font-mono ${t.shap > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {t.shap > 0 ? "+" : ""}{t.shap.toFixed(3)}
                </span>
              </motion.div>
            );
          })}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 flex gap-2">
          <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/40 leading-relaxed">
            SHAP(SHapley Additive exPlanations) 값은 각 토큰이 최종 위험도 점수에 얼마나 기여하는지를 나타냅니다. 양수는 위험도 증가, 음수는 감소에 기여합니다.
          </p>
        </div>
      </div>

      {/* Global feature importance */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>전역 피처 중요도 (Global SHAP)</p>
          <p className="text-[11px] text-white/30">전체 테스트셋 3,370건 평균</p>
        </div>
        <div className="space-y-2.5">
          {GLOBAL_FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3">
              <span className="text-xs text-white/55 w-44 shrink-0 truncate">{f.name}</span>
              <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(f.importance / maxGlobal) * 100}%` }} transition={{ delay: i * 0.04, duration: 0.6 }}
                  className="h-full rounded-full" style={{ backgroundColor: f.color, opacity: 0.75 }} />
              </div>
              <span className="text-[11px] w-10 text-right font-mono" style={{ color: f.color }}>{f.importance.toFixed(3)}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SHAP Summary Dots */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>피처 분포 요약 (Beeswarm 스타일)</p>
        <div className="space-y-3">
          {GLOBAL_FEATURES.slice(0, 6).map((f, fi) => {
            const dots = Array.from({ length: 20 }, (_, _i) => ({
              x: Math.random() * 200 - 100,
              color: Math.random() > 0.5 ? f.color : "#22c55e",
              size: 2 + Math.random() * 3,
            }));
            return (
              <div key={fi} className="flex items-center gap-3">
                <span className="text-[11px] text-white/40 w-40 shrink-0 truncate">{f.name}</span>
                <div className="flex-1 relative h-5 bg-white/3 rounded overflow-hidden">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
                  {dots.map((d, di) => (
                    <div key={di} className="absolute rounded-full top-1/2 -translate-y-1/2"
                      style={{ left: `calc(50% + ${d.x * 0.9}px)`, width: d.size, height: d.size, backgroundColor: d.color, opacity: 0.7 }} />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-white/20 w-16">
                  <span>낮음</span><span>높음</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444", opacity: 0.7 }} />고위험 샘플</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/70" />저위험 샘플</span>
        </div>
      </div>
    </div>
  );
}
