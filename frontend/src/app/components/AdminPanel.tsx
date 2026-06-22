import {useState} from "react";
import {useAdmin} from "../context/AdminContext";
import {
Lock,
Unlock,
ShieldAlert,
Eye,
EyeOff,
LogOut,
BarChart2,
Cpu,
Zap,
CheckCircle2,
AlertCircle,
} from "lucide-react";
import {motion, AnimatePresence} from "motion/react";

/* ── 커스텀 레이더 차트 ─────────────────────────────────── */
const RADAR_METRICS = ["정확도", "정밀도", "재현율", "F1", "속도", "Zero-day"];
const RADAR_MODELS = [
  { name: "분석 모델", color: "#22c55e", values: [0, 0, 0, 0, 88.0, 0] },
  { name: "KoBERT",    color: "#3b82f6", values: [93.8, 92.1, 94.6, 93.3, 82.0, 86.4] },
  { name: "LSTM",      color: "#f97316", values: [87.2, 85.9, 88.4, 87.1, 95.0, 68.3] },
];

function polarToXY(cx: number, cy: number, angle: number, r: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function CustomRadarChart() {
  const cx = 130, cy = 120, maxR = 90, levels = 4;
  const n = RADAR_METRICS.length;
  const angles = RADAR_METRICS.map((_, i) => (360 / n) * i);

  return (
    <svg viewBox="0 0 260 240" className="w-full" style={{ maxHeight: 260 }}>
      {/* Grid rings */}
      {Array.from({ length: levels }).map((_, li) => {
        const r = (maxR / levels) * (li + 1);
        const pts = angles.map((a) => { const p = polarToXY(cx, cy, a, r); return `${p.x},${p.y}`; }).join(" ");
        return <polygon key={`ring-${li}`} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
      })}
      {/* Spokes */}
      {angles.map((a, i) => {
        const p = polarToXY(cx, cy, a, maxR);
        return <line key={`spoke-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />;
      })}
      {/* Model polygons */}
      {RADAR_MODELS.map((model) => {
        const pts = model.values.map((v, i) => {
          const r = (v / 100) * maxR;
          const p = polarToXY(cx, cy, angles[i], r);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <polygon
            key={`model-${model.name}`}
            points={pts}
            fill={model.color}
            fillOpacity={0.12}
            stroke={model.color}
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
        );
      })}
      {/* Labels */}
      {RADAR_METRICS.map((label, i) => {
        const p = polarToXY(cx, cy, angles[i], maxR + 14);
        return (
          <text
            key={`label-${i}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-700 dark:fill-white/40"
            fontSize={9}
          >
            {label}
          </text>
        );
      })}
      {/* Legend */}
      {RADAR_MODELS.map((model, i) => (
        <g key={`legend-${model.name}`} transform={`translate(4, ${210 + i * 12})`}>
          <rect width={8} height={8} rx={2} fill={model.color} fillOpacity={0.8} />
          <text x={12} y={7} className="fill-gray-700 dark:fill-white/50" fontSize={9}>{model.name}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── 커스텀 막대 차트 ───────────────────────────────────── */
const BAR_DATA = [
  { name: "분석 모델", accuracy: 0, f1: 0, precision: 0, recall: 0 },
  { name: "KoBERT",    accuracy: 93.8, f1: 93.3, precision: 92.1, recall: 94.6 },
  { name: "LSTM",      accuracy: 87.2, f1: 87.1, precision: 85.9, recall: 88.4 },
  { name: "Baseline",  accuracy: 79.4, f1: 78.8, precision: 77.3, recall: 80.4 },
];
const BAR_SERIES = [
  { key: "accuracy",  name: "정확도", color: "#22c55e" },
  { key: "f1",        name: "F1",    color: "#3b82f6" },
  { key: "precision", name: "정밀도", color: "#a78bfa" },
  { key: "recall",    name: "재현율", color: "#f97316" },
];
const MIN_VAL = 70, MAX_VAL = 100;

function CustomBarChart() {
  const [tooltip, setTooltip] = useState<{ label: string; value: number; color: string } | null>(null);
  return (
    <div className="w-full">
      <div className="flex gap-3 mb-4 flex-wrap">
        {BAR_SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-white/50">{s.name}</span>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {BAR_DATA.map((row) => (
          <div key={row.name}>
            <p className="text-[11px] text-white/40 mb-1.5">{row.name}</p>
            <div className="flex gap-1 items-end h-8">
              {BAR_SERIES.map((s) => {
                const val = row[s.key as keyof typeof row] as number;
                const pct = ((val - MIN_VAL) / (MAX_VAL - MIN_VAL)) * 100;
                return (
                  <div
                    key={s.key}
                    className="relative flex-1 rounded-t-sm cursor-pointer group"
                    style={{ height: `${Math.max(pct, 5)}%`, backgroundColor: s.color, opacity: 0.75 }}
                    onMouseEnter={() => setTooltip({ label: `${row.name} ${s.name}`, value: val, color: s.color })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
            <div className="h-px bg-white/5 mt-1" />
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="mt-3 px-3 py-2 rounded-lg text-xs border border-white/10 bg-[#0d1526] inline-flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: tooltip.color }} />
          <span className="text-white/60">{tooltip.label}</span>
          <span className="text-white/80" style={{ fontWeight: 600 }}>{tooltip.value}%</span>
        </div>
      )}
    </div>
  );
}

/* ── 모의 모델 성능 데이터 ─────────────────────────────── */
const modelDetails = [
  {
    name: "모델 미정",
    status: "active",
    params: "110M",
    trainTime: "4h 23m",
    accuracy: 0,
    f1: 0,
    precision: 0,
    recall: 0,
    inferenceMs: 38,
    note: "현재 운영 중인 주력 모델. 한국어 전기화 학습 기반으로 스미싱 특화 파인튜닝 적용.",
  },
  {
    name: "KoBERT",
    status: "standby",
    params: "92M",
    trainTime: "5h 41m",
    accuracy: 93.8,
    f1: 93.3,
    precision: 92.1,
    recall: 94.6,
    inferenceMs: 52,
    note: "SKT에서 배포한 한국어 BERT. 분석 모델 대비 성능 소폭 낮으나 안정적.",
  },
  {
    name: "Bi-LSTM + Attention",
    status: "legacy",
    params: "8.7M",
    trainTime: "1h 12m",
    accuracy: 87.2,
    f1: 87.1,
    precision: 85.9,
    recall: 88.4,
    inferenceMs: 12,
    note: "경량 모델. 추론 속도 가장 빠르지만 제로데이 탐지 성능 부족.",
  },
];

const statusCfg: Record<string, { label: string; cls: string }> = {
  active: { label: "운영 중", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  standby: { label: "대기", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  legacy: { label: "레거시", cls: "bg-white/10 text-white/40 border-white/10" },
};

/* ── 로그인 게이트 ──────────────────────────────────────── */
function LoginGate() {
  const { login } = useAdmin();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(pw);
    if (!ok) {
      setError(true);
      setShake(true);
      setPw("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="bg-[#111c30] border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
              <Lock size={22} className="text-amber-400" />
            </div>
            <h2 className="text-white mb-1" style={{ fontWeight: 700 }}>관리자 전용 페이지</h2>
            <p className="text-xs text-white/40 text-center">
              모델 성능 비교 데이터는 관리자만 열람 가능합니다
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-2 block">관리자 비밀번호</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-[#0b1120] border border-white/10 rounded-xl focus-within:border-amber-500/40 transition-all">
                <Lock size={16} className="text-white/40 shrink-0" />
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(false); }}
                  placeholder="비밀번호 입력"
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/40 outline-none min-w-0 focus:outline-none focus:ring-0"
                  autoFocus
                />
                <button type="button" onClick={() => setShow(!show)} className="text-white/40 hover:text-white/70 transition-all shrink-0">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-red-400 mt-1.5 flex items-center gap-1"
                  >
                    <AlertCircle size={11} /> 비밀번호가 올바르지 않습니다.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={!pw}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
            >
              로그인
            </button>
          </form>

          <p className="text-[11px] text-white/35 text-center mt-5">
            힌트: <span className="font-mono text-white/40">관리자에게 문의하세요.</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 관리자 대시보드 ────────────────────────────────────── */
function AdminDashboard() {
  const { logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<"overview" | "detail" | "tuning">("overview");

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Unlock size={13} className="text-amber-400" />
            <span className="text-xs text-amber-400 tracking-widest uppercase">관리자 모드</span>
          </div>
          <h1 className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>모델 성능 비교</h1>
          <p className="text-sm text-white/40">분석 모델 · KoBERT · LSTM 성능 분석 리포트</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={12} /> 로그아웃
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "최고 정확도", value: "--%", model: "분석 모델", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "최고 F1", value: "--", model: "분석 모델", icon: BarChart2, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { label: "최고 속도", value: "12ms", model: "LSTM", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Zero-day 최고", value: "--%", model: "분석 모델", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((c) => (
          <div key={c.label} className="bg-[#111c30] dark:bg-[#111c30] border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/40" style={{ fontSize: "0.75rem" }}>{c.label}</p>
              <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon size={13} className={c.color} />
              </div>
            </div>
            <p className={`${c.color} mb-0.5`} style={{ fontWeight: 700, fontSize: "1.4rem" }}>{c.value}</p>
            <p className="text-white/30" style={{ fontSize: "0.6875rem" }}>{c.model}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0b1120] border border-white/10 rounded-xl p-1 w-fit">
        {[
          { key: "overview", label: "개요 차트" },
          { key: "detail", label: "상세 지표" },
          { key: "tuning", label: "학습 설정" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg text-xs transition-all ${
              activeTab === t.key
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Radar */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-sm text-white/80 mb-1" style={{ fontWeight: 500 }}>다차원 성능 비교 (레이더)</p>
              <p className="text-xs text-white/30 mb-4">6개 평가 지표 기준</p>
              <CustomRadarChart />
            </div>

            {/* Bar */}
            <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
              <p className="text-sm text-white/80 mb-1" style={{ fontWeight: 500 }}>모델별 주요 지표 비교 (막대)</p>
              <p className="text-xs text-white/30 mb-4">정확도 · F1 · 정밀도 · 재현율 (%)</p>
              <CustomBarChart />
            </div>
          </motion.div>
        )}

        {activeTab === "detail" && (
          <motion.div key="detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {modelDetails.map((m) => {
              const sc = statusCfg[m.status];
              return (
                <div key={m.name} className="bg-[#111c30] border border-white/10 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu size={14} className="text-white/40" />
                        <span className="text-sm text-white/80" style={{ fontWeight: 600 }}>{m.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${sc.cls}`}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">{m.note}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: "정확도", value: `${m.accuracy}%`, color: "text-emerald-400" },
                      { label: "F1 점수", value: `${m.f1}%`, color: "text-cyan-400" },
                      { label: "정밀도", value: `${m.precision}%`, color: "text-blue-400" },
                      { label: "재현율", value: `${m.recall}%`, color: "text-purple-400" },
                      { label: "추론 속도", value: `${m.inferenceMs}ms`, color: "text-yellow-400" },
                      { label: "파라미터", value: m.params, color: "text-white/60" },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/3 rounded-lg p-2.5 text-center">
                        <p className={`${s.color} text-sm`} style={{ fontWeight: 600 }}>{s.value}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/30">전체 성능 점수</span>
                      <span className="text-[11px] text-white/50">{((m.accuracy + m.f1) / 2).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((m.accuracy + m.f1) / 2) - 70}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${m.status === "active" ? "bg-emerald-500" : m.status === "standby" ? "bg-blue-500" : "bg-white/20"}`}
                        style={{ maxWidth: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "tuning" && (
          <motion.div key="tuning" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 text-[11px] text-white/40 px-5 py-3 border-b border-white/5 bg-white/2">
                <span>모델</span>
                <span>하이퍼파라미터</span>
                <span>학습 데이터</span>
                <span>학습 시간</span>
              </div>
              {[
                { name: "분석 모델", hp: "LR=2e-5, Epoch=5, BS=32", data: "45,231건 (한국어)", time: "4h 23m" },
                { name: "KoBERT", hp: "LR=3e-5, Epoch=4, BS=16", data: "45,231건 (한국어)", time: "5h 41m" },
                { name: "Bi-LSTM", hp: "LR=1e-3, Epoch=20, BS=64", data: "45,231건 (한국어)", time: "1h 12m" },
              ].map((r, i) => (
                <div key={r.name} className={`grid grid-cols-4 px-5 py-4 text-xs text-white/60 ${i < 2 ? "border-b border-white/5" : ""}`}>
                  <span className="text-white/80 font-mono">{r.name}</span>
                  <span className="text-white/40 font-mono text-[11px]">{r.hp}</span>
                  <span>{r.data}</span>
                  <span className="text-cyan-400">{r.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <p className="text-xs text-amber-300/70">
                <strong className="text-amber-300/90">관리자 전용 정보:</strong> 위 하이퍼파라미터 및 학습 설정은 내부 실험 결과이며 외부 공개 시 사전 승인이 필요합니다.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 메인 export ────────────────────────────────────────── */
export function AdminPanel() {
  const { isAdmin } = useAdmin();
  return isAdmin ? <AdminDashboard /> : <LoginGate />;
}