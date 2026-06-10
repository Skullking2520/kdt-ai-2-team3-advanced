import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, ChevronRight, ChevronDown, Zap, Info } from "lucide-react";

interface LayerInfo {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  border: string;
  bg: string;
  detail: {
    desc: string;
    params: { key: string; value: string }[];
  };
}

const LAYERS: LayerInfo[] = [
  {
    id: "input", label: "Input Text", sublabel: "원본 SMS 문자",
    color: "text-white/70", border: "border-white/15", bg: "bg-white/5",
    detail: {
      desc: "분석 대상 SMS 문자 원문. 최대 512 토큰까지 처리 가능합니다.",
      params: [{ key: "최대 길이", value: "512 tokens" }, { key: "인코딩", value: "UTF-8" }],
    },
  },
  {
    id: "tokenizer", label: "KcBERT Tokenizer", sublabel: "WordPiece 토크나이저",
    color: "text-blue-300", border: "border-blue-500/30", bg: "bg-blue-500/8",
    detail: {
      desc: "한국어에 최적화된 WordPiece 토크나이저. [CLS], [SEP] 특수 토큰을 추가하고 서브워드로 분리합니다.",
      params: [
        { key: "어휘 크기", value: "32,000 vocab" },
        { key: "알고리즘", value: "WordPiece" },
        { key: "특수 토큰", value: "[CLS], [SEP], [PAD], [UNK]" },
      ],
    },
  },
  {
    id: "embedding", label: "Embedding Layer", sublabel: "Token + Position + Segment",
    color: "text-violet-300", border: "border-violet-500/30", bg: "bg-violet-500/8",
    detail: {
      desc: "토큰 임베딩, 위치 임베딩, 세그먼트 임베딩의 합산. 각 토큰을 고차원 벡터 공간으로 매핑합니다.",
      params: [
        { key: "Hidden size", value: "768" },
        { key: "Max position", value: "512" },
        { key: "Dropout", value: "0.1" },
      ],
    },
  },
  {
    id: "encoder", label: "Transformer Encoder ×12", sublabel: "Multi-Head Self-Attention + FFN",
    color: "text-cyan-300", border: "border-cyan-500/30", bg: "bg-cyan-500/8",
    detail: {
      desc: "12개의 Transformer 인코더 레이어. 각 레이어는 Multi-Head Self-Attention과 Feed-Forward Network로 구성됩니다.",
      params: [
        { key: "Attention heads", value: "12" },
        { key: "Hidden size", value: "768" },
        { key: "FFN size", value: "3,072" },
        { key: "총 파라미터", value: "110M" },
      ],
    },
  },
  {
    id: "cls", label: "[CLS] Token Pooling", sublabel: "문장 수준 표현 추출",
    color: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/8",
    detail: {
      desc: "[CLS] 토큰의 마지막 히든 스테이트를 추출하여 전체 문장의 의미 벡터로 사용합니다.",
      params: [
        { key: "출력 차원", value: "768" },
        { key: "Activation", value: "Tanh" },
      ],
    },
  },
  {
    id: "classifier", label: "Classification Head", sublabel: "Dropout + Linear + Softmax",
    color: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/8",
    detail: {
      desc: "Dropout 정규화 후 선형 레이어를 통해 피싱/정상 이진 분류. Softmax로 확률값 출력.",
      params: [
        { key: "Dropout", value: "0.1" },
        { key: "출력 클래스", value: "2 (phishing / normal)" },
        { key: "Loss", value: "Cross-Entropy" },
      ],
    },
  },
  {
    id: "output", label: "Risk Score Output", sublabel: "위험도 1~10 + HIGH/MEDIUM/LOW",
    color: "text-rose-300", border: "border-rose-500/30", bg: "bg-rose-500/8",
    detail: {
      desc: "피싱 확률을 1~10 위험도 점수로 스케일링하고 임계값(0.5)에 따라 등급을 산출합니다.",
      params: [
        { key: "HIGH 임계값", value: "≥ 0.7" },
        { key: "MEDIUM 임계값", value: "0.4 ~ 0.7" },
        { key: "LOW 임계값", value: "< 0.4" },
        { key: "스케일", value: "확률 × 10 → 점수" },
      ],
    },
  },
];

const FLOW_ARROW = (
  <div className="flex justify-center my-1">
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-px h-3 bg-white/15" />
      <ChevronDown size={12} className="text-white/20" />
    </div>
  </div>
);

export function ModelArchitecture() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-cyan-400" />
          <span className="text-xs text-cyan-400 tracking-widest uppercase">모델 아키텍처</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>모델 미정</h1>
        <p className="text-sm text-white/40">각 레이어를 클릭하면 상세 구조를 확인할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Architecture flow */}
        <div>
          <p className="text-xs text-white/30 mb-4 flex items-center gap-1"><Zap size={10} /> 처리 파이프라인</p>
          <div>
            {LAYERS.map((layer, i) => (
              <div key={layer.id}>
                <motion.button
                  onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    activeLayer === layer.id
                      ? `${layer.bg} ${layer.border}`
                      : "bg-[#111c30] border-white/8 hover:border-white/15"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${layer.color}`} style={{ fontWeight: 500 }}>{layer.label}</p>
                    <p className="text-[11px] text-white/30">{layer.sublabel}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className={`text-white/20 transition-transform shrink-0 ${activeLayer === layer.id ? "rotate-90 text-white/50" : ""}`}
                  />
                </motion.button>
                {i < LAYERS.length - 1 && FLOW_ARROW}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-6 h-fit">
          <AnimatePresence mode="wait">
            {activeLayer ? (
              (() => {
                const layer = LAYERS.find((l) => l.id === activeLayer)!;
                return (
                  <motion.div key={activeLayer} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className={`rounded-2xl border p-5 ${layer.bg} ${layer.border}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div>
                        <p className={`text-sm ${layer.color}`} style={{ fontWeight: 700 }}>{layer.label}</p>
                        <p className="text-[11px] text-white/35">{layer.sublabel}</p>
                      </div>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed mb-4">{layer.detail.desc}</p>
                    <div className="space-y-2">
                      {layer.detail.params.map((p) => (
                        <div key={p.key} className="flex items-center justify-between py-1.5 border-b border-white/5">
                          <span className="text-[11px] text-white/40">{p.key}</span>
                          <span className={`text-[11px] ${layer.color} font-mono`}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()
            ) : (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/8 bg-[#111c30] p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                  <Cpu size={20} className="text-cyan-400" />
                </div>
                <p className="text-sm text-white/40">레이어를 클릭하면</p>
                <p className="text-sm text-white/40">상세 정보가 표시됩니다</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Architecture summary */}
          <div className="mt-4 bg-[#111c30] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-3 flex items-center gap-1"><Info size={10} /> 모델 요약</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "기반 모델", value: "ELECTRA" },
                { label: "파라미터", value: "110M" },
                { label: "어텐션 헤드", value: "12" },
                { label: "인코더 레이어", value: "12" },
                { label: "Hidden size", value: "768" },
                { label: "정확도", value: "--%" },
              ].map((s) => (
                <div key={s.label} className="bg-white/3 rounded-lg p-2">
                  <p className="text-[10px] text-white/30">{s.label}</p>
                  <p className="text-xs text-white/70 font-mono">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ELECTRA vs BERT comparison */}
      <div className="mt-6 bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>분석 모델 vs BERT 비교</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "사전 학습 방식", bert: "Masked LM (MLM)", electra: "Replaced Token Detection", winner: "electra" },
            { label: "학습 효율", bert: "15% 토큰만 활용", electra: "100% 토큰 활용 (4× 효율)", winner: "electra" },
            { label: "한국어 특화", bert: "KoBERT (범용)", electra: "분석 모델 (댓글·SMS)", winner: "electra" },
          ].map((c) => (
            <div key={c.label} className="bg-white/3 rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-2">{c.label}</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25 w-12">BERT</span>
                  <span className="text-[11px] text-white/50">{c.bert}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-400 w-12">ELECTRA</span>
                  <span className="text-[11px] text-cyan-300/80">{c.electra}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 ml-auto">✓</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
