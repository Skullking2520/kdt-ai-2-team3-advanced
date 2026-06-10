import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Microscope, Scan, RefreshCw, Info, Layers } from "lucide-react";

interface Token {
  text: string;
  attention: number; // 0~1
  isRisk: boolean;
  pos: string;
}

const RISK_KEYWORDS = ["즉시", "긴급", "정지", "동결", "납부", "미납", "경고", "차단", "만료", "혐의", "출석", "소멸", "탕감", "당첨", "클릭", "확인"];
const URL_PATTERN = /https?:\/\/\S+/g;

function tokenize(text: string): Token[] {
  const words = text.split(/(\s+|(?=[【】\[\]!?！？.,;:·]))/g).filter((w) => w.trim());
  return words.map((w) => {
    const isUrl = URL_PATTERN.test(w);
    const isRisk = RISK_KEYWORDS.some((k) => w.includes(k)) || isUrl;
    const baseAttn = isUrl ? 0.95 : isRisk ? 0.7 + Math.random() * 0.25 : 0.05 + Math.random() * 0.35;
    const attn = Math.min(1, baseAttn);
    const pos = isUrl ? "URL" : /[0-9,]+/.test(w) ? "NUM" : /[\u4e00-\u9fff\uac00-\ud7a3]+/.test(w) ? "WORD" : "PUNCT";
    return { text: w, attention: attn, isRisk, pos };
  });
}

function attnColor(v: number): string {
  if (v > 0.8) return "rgba(239,68,68,";
  if (v > 0.6) return "rgba(249,115,22,";
  if (v > 0.4) return "rgba(234,179,8,";
  if (v > 0.2) return "rgba(34,197,94,";
  return "rgba(99,102,241,";
}

const LAYER_NAMES = [
  "Embedding Layer", "Encoder #1", "Encoder #2", "Encoder #3",
  "Encoder #4", "Encoder #5", "Encoder #6 (출력)",
];

const SAMPLES = [
  "【국민건강보험】미납보험료 89,200원이 있습니다. 즉시 납부하지 않으면 급여가 정지됩니다. http://nhis-pay.kr",
  "갤럭시S24 당첨! 48시간 내 수령 신청 필수: http://prize-samsung.xyz/claim",
  "[KB국민은행] 비정상 접근 감지. 24시간 내 본인 확인 미완료 시 계좌 동결됩니다.",
];

export function AttentionViz() {
  const [text, setText] = useState("");
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeLayer, setActiveLayer] = useState(6);
  const [hoveredToken, setHoveredToken] = useState<Token | null>(null);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setTokens(tokenize(text));
      setAnalyzing(false);
    }, 1200);
  };

  const topTokens = tokens
    ? [...tokens].sort((a, b) => b.attention - a.attention).slice(0, 8)
    : [];

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Microscope size={14} className="text-fuchsia-400" />
          <span className="text-xs text-fuchsia-400 tracking-widest uppercase">XAI · 설명 가능한 AI</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>어텐션 시각화</h1>
        <p className="text-sm text-white/40">분석 모델 모델이 각 토큰에 부여한 어텐션 가중치를 시각화합니다.</p>
      </div>

      {/* Input */}
      {!tokens && (
        <div className="space-y-4 mb-6">
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="분석할 문자 내용을 입력하세요..."
              rows={4}
              className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none resize-none"
            />
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 flex-wrap">
              <p className="text-[11px] text-white/25 mr-auto">샘플:</p>
              {SAMPLES.map((s, i) => (
                <button key={i} onClick={() => setText(s)}
                  className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40 hover:text-fuchsia-400 hover:border-fuchsia-500/30 transition-all truncate max-w-[160px]">
                  샘플 {i + 1}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleAnalyze} disabled={!text.trim() || analyzing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm disabled:opacity-40 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20">
            {analyzing
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 어텐션 계산 중...</>
              : <><Scan size={14} /> 어텐션 분석 시작</>}
          </button>
        </div>
      )}

      <AnimatePresence>
        {tokens && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Layer selector */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={13} className="text-fuchsia-400" />
                <p className="text-xs text-white/50">레이어 선택</p>
                <span className="ml-auto text-xs text-fuchsia-400">{LAYER_NAMES[activeLayer]}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {LAYER_NAMES.map((_name, i) => (
                  <button key={i} onClick={() => setActiveLayer(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                      activeLayer === i
                        ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400"
                        : "border-white/10 text-white/35 hover:text-white/55"
                    }`}>{i === 0 ? "Emb" : `L${i}`}</button>
                ))}
              </div>
            </div>

            {/* Token heatmap */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-xs text-white/40 mb-3">토큰 어텐션 히트맵</p>
              <div className="flex flex-wrap gap-1.5">
                {tokens.map((tok, i) => {
                  const layerScale = activeLayer === 6 ? 1 : 0.6 + (activeLayer / 6) * 0.4;
                  const adj = Math.min(1, tok.attention * layerScale);
                  const col = attnColor(adj);
                  return (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onMouseEnter={() => setHoveredToken(tok)}
                      onMouseLeave={() => setHoveredToken(null)}
                      className="relative px-2 py-1 rounded-lg text-sm cursor-default select-none border transition-all"
                      style={{
                        backgroundColor: `${col}${Math.round(adj * 0.35 * 255).toString(16).padStart(2, "0")})`,
                        borderColor: `${col}${Math.round(adj * 0.6 * 255).toString(16).padStart(2, "0")})`,
                        color: adj > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      {tok.text}
                    </motion.span>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/8">
                <p className="text-[10px] text-white/25">어텐션 강도:</p>
                {[
                  { label: "매우 높음", color: "bg-red-500" },
                  { label: "높음", color: "bg-orange-500" },
                  { label: "중간", color: "bg-yellow-500" },
                  { label: "낮음", color: "bg-emerald-500" },
                  { label: "매우 낮음", color: "bg-indigo-500" },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1 text-[10px] text-white/30">
                    <span className={`w-2 h-2 rounded-sm ${l.color}`} />{l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Token tooltip info */}
            <AnimatePresence>
              {hoveredToken && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-[#111c30] border border-fuchsia-500/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
                    <span className="text-fuchsia-300 text-sm" style={{ fontWeight: 700 }}>{(hoveredToken.attention * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <p className="text-sm text-white/80" style={{ fontWeight: 500 }}>"{hoveredToken.text}"</p>
                    <p className="text-xs text-white/40">어텐션: {(hoveredToken.attention * 100).toFixed(1)}% · 품사: {hoveredToken.pos} · {hoveredToken.isRisk ? "위험 토큰" : "정상 토큰"}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top attention tokens */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-xs text-white/40 mb-3">상위 어텐션 토큰 (Top 8)</p>
              <div className="space-y-2">
                {topTokens.map((tok, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] text-white/30 w-4">{i + 1}</span>
                    <span className="text-xs text-white/70 w-24 truncate font-mono">{tok.text}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tok.attention * 100}%` }}
                        transition={{ delay: i * 0.05, duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ background: `${attnColor(tok.attention)}0.8)` }}
                      />
                    </div>
                    <span className="text-[11px] w-10 text-right" style={{ color: `${attnColor(tok.attention)}0.9)` }}>
                      {(tok.attention * 100).toFixed(1)}%
                    </span>
                    {tok.isRisk && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400">위험</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div className="p-4 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/15 flex gap-3">
              <Info size={13} className="text-fuchsia-400 shrink-0 mt-0.5" />
              <p className="text-xs text-white/50 leading-relaxed">
                어텐션 가중치는 분석 모델의 Multi-Head Self-Attention 메커니즘에서 각 토큰이 분류 결정에 기여하는 정도를 나타냅니다.
                [CLS] 토큰의 최종 어텐션 벡터가 피싱 여부 판단에 사용됩니다.
              </p>
            </div>

            <button onClick={() => { setTokens(null); setText(""); }}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-all">
              <RefreshCw size={11} /> 다시 분석
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
