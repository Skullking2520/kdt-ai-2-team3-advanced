import {useState} from "react";
import {motion} from "motion/react";
import {Target, Info} from "lucide-react"

const MODELS = [
  {
    name: "모델 미정",
    accuracy: 0, precision: 0, recall: 95.8, f1: 0,
    tp: 1842, fp: 54, fn: 81, tn: 2023,
    roc: [0,0.01,0.02,0.04,0.07,0.12,0.19,0.28,0.4,0.55,0.7,0.82,0.91,0.97,1.0],
    color: "#22d3ee",
  },
  {
    name: "KoBERT-base",
    accuracy: 93.1, precision: 94.2, recall: 91.7, f1: 92.9,
    tp: 1761, fp: 108, fn: 162, tn: 1969,
    roc: [0,0.02,0.05,0.09,0.15,0.24,0.35,0.47,0.6,0.73,0.83,0.90,0.95,0.98,1.0],
    color: "#a78bfa",
  },
  {
    name: "모델 미정(소형)",
    accuracy: 0, precision: 92.0, recall: 90.3, f1: 91.1,
    tp: 1733, fp: 150, fn: 188, tn: 1929,
    roc: [0,0.03,0.07,0.13,0.21,0.32,0.44,0.57,0.68,0.78,0.86,0.92,0.96,0.99,1.0],
    color: "#fb923c",
  },
];

const CATEGORIES = [
  { name: "공공기관 사칭", precision: 98.2, recall: 97.4, f1: 97.8, count: 412 },
  { name: "금융 피싱", precision: 97.5, recall: 96.9, f1: 97.2, count: 389 },
  { name: "택배 사기", precision: 95.8, recall: 94.2, f1: 95.0, count: 267 },
  { name: "이벤트 사기", precision: 94.3, recall: 92.8, f1: 93.5, count: 198 },
  { name: "대출 사기", precision: 96.1, recall: 95.3, f1: 0, count: 176 },
  { name: "제로데이", precision: 87.4, recall: 83.2, f1: 85.2, count: 43 },
];

/* Confusion Matrix */
function ConfusionMatrix({ model }: { model: typeof MODELS[0] }) {
  const cells = [
    { label: "TP", value: model.tp, color: "bg-emerald-500/25", text: "text-emerald-400", desc: "정확히 탐지한 피싱" },
    { label: "FP", value: model.fp, color: "bg-red-500/15", text: "text-red-400", desc: "정상을 피싱으로 오탐" },
    { label: "FN", value: model.fn, color: "bg-orange-500/15", text: "text-orange-400", desc: "피싱을 정상으로 미탐" },
    { label: "TN", value: model.tn, color: "bg-blue-500/15", text: "text-blue-400", desc: "정확히 통과한 정상" },
  ];
  return (
    <div>
      <p className="text-[11px] text-white/30 mb-2 text-center">혼동 행렬 (Confusion Matrix)</p>
      <div className="grid grid-cols-2 gap-1.5">
        {cells.map((c) => (
          <div key={c.label} className={`${c.color} rounded-xl p-3 text-center`}>
            <p className="text-[10px] text-white/30">{c.label}</p>
            <p className={`text-xl ${c.text} my-0.5`} style={{ fontWeight: 700 }}>{c.value.toLocaleString()}</p>
            <p className="text-[10px] text-white/30">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ROC Curve */
function ROCCurve({ models }: { models: typeof MODELS }) {
  const W = 300, H = 200, P = 28;
  const iW = W - P * 2, iH = H - P * 2;
  const pts = (arr: number[]) =>
    arr.map((y, i) => `${P + (i / (arr.length - 1)) * iW},${P + (1 - y) * iH}`).join(" ");
  return (
    <div>
      <p className="text-[11px] text-white/30 mb-2">ROC Curve</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
        <line x1={P} y1={P} x2={P} y2={P + iH} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        <line x1={P} y1={P + iH} x2={P + iW} y2={P + iH} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        <line x1={P} y1={P + iH} x2={P + iW} y2={P} stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="4,3" />
        {models.map((m) => (
          <polyline key={m.name} points={pts(m.roc)} fill="none" stroke={m.color} strokeWidth={1.8} strokeLinejoin="round" opacity={0.85} />
        ))}
        {["0", "0.5", "1.0"].map((v, i) => (
          <g key={v}>
            <text x={P + (i * iW) / 2} y={P + iH + 14} fontSize={9} fill="rgba(255,255,255,0.25)" textAnchor="middle">{v}</text>
            <text x={P - 6} y={P + iH - (i * iH) / 2 + 4} fontSize={9} fill="rgba(255,255,255,0.25)" textAnchor="end">{v}</text>
          </g>
        ))}
        <text x={P + iW / 2} y={H - 2} fontSize={9} fill="rgba(255,255,255,0.2)" textAnchor="middle">FPR</text>
        <text x={10} y={P + iH / 2} fontSize={9} fill="rgba(255,255,255,0.2)" textAnchor="middle" transform={`rotate(-90,10,${P + iH / 2})`}>TPR</text>
      </svg>
      <div className="flex justify-center gap-4 mt-1">
        {models.map((m) => (
          <span key={m.name} className="flex items-center gap-1 text-[10px] text-white/40">
            <span className="w-4 h-0.5 rounded" style={{ backgroundColor: m.color }} />
            {m.name.split("-")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Benchmark() {
  const [activeModel, setActiveModel] = useState(0);
  const m = MODELS[activeModel];

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target size={14} className="text-violet-400" />
          <span className="text-xs text-violet-400 tracking-widest uppercase">모델 평가</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>모델 벤치마크</h1>
        <p className="text-sm text-white/40">분석 모델 정밀도·재현율·F1·혼동 행렬·ROC Curve 분석</p>
      </div>

      {/* Model tabs */}
      <div className="flex gap-2 flex-wrap">
        {MODELS.map((mod, i) => (
          <button key={mod.name} onClick={() => setActiveModel(i)}
            className={`px-3 py-2 rounded-xl text-xs border transition-all ${
              activeModel === i ? "border-violet-500/40 text-violet-400" : "border-white/10 text-white/35 hover:text-white/55"
            }`}
            style={activeModel === i ? { backgroundColor: `${mod.color}18` } : {}}>
            {mod.name}
          </button>
        ))}
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Accuracy", value: m.accuracy, color: "text-cyan-400" },
          { label: "Precision", value: m.precision, color: "text-emerald-400" },
          { label: "Recall", value: m.recall, color: "text-violet-400" },
          { label: "F1 Score", value: m.f1, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-4 text-center">
            <p className="text-[11px] text-white/30 mb-1">{s.label}</p>
            <p className={`text-2xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}<span className="text-sm text-white/30">%</span></p>
            <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${s.value}%` }} transition={{ duration: 0.8 }}
                className="h-full rounded-full" style={{ backgroundColor: s.color.replace("text-", "").includes("cyan") ? "#22d3ee" : s.color.includes("emerald") ? "#10b981" : s.color.includes("violet") ? "#8b5cf6" : "#f59e0b" }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <ConfusionMatrix model={m} />
        </div>
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <ROCCurve models={MODELS} />
          <div className="mt-4 space-y-1">
            {MODELS.map((mod) => (
              <div key={mod.name} className="flex items-center justify-between text-xs">
                <span className="text-white/40">{mod.name}</span>
                <span style={{ color: mod.color }} className="font-mono">AUC: {(0.97 - MODELS.indexOf(mod) * 0.025).toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-category metrics */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>유형별 성능 지표</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 border-b border-white/8">
                {["유형", "정밀도", "재현율", "F1", "샘플 수"].map((h) => (
                  <th key={h} className="text-left pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {CATEGORIES.map((c) => (
                <tr key={c.name} className="text-white/60">
                  <td className="py-2 pr-4">{c.name}</td>
                  {[c.precision, c.recall, c.f1].map((v, vi) => (
                    <td key={vi} className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={v >= 96 ? "text-emerald-400" : v >= 90 ? "text-amber-400" : "text-red-400"}>{v}%</span>
                      </div>
                    </td>
                  ))}
                  <td className="py-2 text-white/35">{c.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 flex gap-2">
          <Info size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/45">제로데이 패턴은 학습 데이터 부족으로 상대적으로 낮은 성능을 보입니다. 지속적인 데이터 수집이 필요합니다.</p>
        </div>
      </div>

      {/* Model comparison bar */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>모델 F1 Score 비교</p>
        <div className="space-y-3">
          {MODELS.map((mod) => (
            <div key={mod.name} className="flex items-center gap-3">
              <span className="text-xs text-white/50 w-40 shrink-0">{mod.name}</span>
              <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${mod.f1}%` }} transition={{ duration: 0.8 }}
                  className="h-full rounded-full" style={{ backgroundColor: mod.color, opacity: 0.8 }} />
              </div>
              <span className="text-xs w-12 text-right" style={{ color: mod.color }}>{mod.f1}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
