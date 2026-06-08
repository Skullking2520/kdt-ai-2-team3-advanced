import { useState } from "react";
import { motion } from "motion/react";
import { BarChart2, TrendingUp, TrendingDown, MapPin, CalendarDays, AlertCircle } from "lucide-react";

/* ── Data ─────────────────────────────────────────────── */
const MONTHLY = [
  { month: "24.07", high: 312, medium: 198, low: 541 },
  { month: "24.08", high: 287, medium: 221, low: 498 },
  { month: "24.09", high: 341, medium: 244, low: 612 },
  { month: "24.10", high: 398, medium: 267, low: 689 },
  { month: "24.11", high: 421, medium: 298, low: 723 },
  { month: "24.12", high: 456, medium: 312, low: 698 },
  { month: "25.01", high: 389, medium: 289, low: 741 },
  { month: "25.02", high: 412, medium: 301, low: 756 },
  { month: "25.03", high: 478, medium: 334, low: 812 },
  { month: "25.04", high: 501, medium: 357, low: 834 },
];

const CATEGORY_TRENDS = [
  { name: "공공기관 사칭", values: [24, 27, 31, 33, 35, 38, 34, 36, 39, 41], color: "#3b82f6" },
  { name: "금융 피싱", values: [19, 22, 24, 26, 28, 27, 25, 26, 28, 30], color: "#22c55e" },
  { name: "택배 사기", values: [18, 17, 19, 21, 20, 18, 17, 18, 19, 18], color: "#f59e0b" },
  { name: "이벤트 사기", values: [14, 15, 14, 13, 15, 16, 16, 16, 15, 14], color: "#a78bfa" },
  { name: "대출 사기", values: [13, 12, 11, 13, 12, 11, 11, 12, 12, 11], color: "#fb7185" },
];

const REGIONS = [
  { name: "서울", count: 8412, pct: 28 },
  { name: "경기", count: 6234, pct: 21 },
  { name: "부산", count: 3128, pct: 10 },
  { name: "인천", count: 2847, pct: 9 },
  { name: "대구", count: 2234, pct: 7 },
  { name: "광주", count: 1876, pct: 6 },
  { name: "대전", count: 1654, pct: 6 },
  { name: "기타", count: 4089, pct: 13 },
];

const TIMELINE = [
  { date: "2025.04", title: "AI 합성 발신번호 피싱", tag: "신규", color: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/8", desc: "AI로 생성된 가짜 공공기관 발신번호 사용. 기존 패턴으로 탐지 어려움." },
  { date: "2025.03", title: "단축URL 이중 리다이렉션", tag: "진화", color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/8", desc: "bit.ly → 중간 정상 도메인 → 최종 피싱 도메인으로 2단계 리다이렉션하여 URL 검사 우회." },
  { date: "2025.02", title: "전화 유도형 피싱 증가", tag: "증가", color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/8", desc: "URL 없이 전화번호만 포함해 AI 탐지 회피. 보이스피싱과 연계." },
  { date: "2025.01", title: "QR코드 피싱 (큐싱)", tag: "신규", color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/8", desc: "문자 내 QR코드 이미지 삽입. 텍스트 기반 탐지 완전 우회. 모델 확장 필요." },
  { date: "2024.12", title: "명절 택배 사기 급증", tag: "시즌형", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/8", desc: "설·추석 전후 택배 위장 스미싱 400% 급증. 계절성 패턴 확인." },
  { date: "2024.11", title: "정부지원금 사칭 캠페인", tag: "대규모", color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/8", desc: "동일 인프라에서 3,200건 동시 발송된 조직적 피싱 캠페인 탐지." },
];

/* ── Custom Chart Components ──────────────────────────── */
const CW = 560, CH = 160, CP = { t: 8, r: 8, b: 22, l: 36 };

function StackedBarChart({ data }: { data: typeof MONTHLY }) {
  const maxVal = Math.max(...data.map((d) => d.high + d.medium + d.low));
  const iW = CW - CP.l - CP.r;
  const iH = CH - CP.t - CP.b;
  const bw = (iW / data.length) * 0.65;
  const gap = (iW / data.length) * 0.35;

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-[160px]">
      <g transform={`translate(${CP.l},${CP.t})`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={iW} y1={t * iH} y2={t * iH} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * (bw + gap);
          const total = d.high + d.medium + d.low;
          const lowH = (d.low / maxVal) * iH;
          const medH = (d.medium / maxVal) * iH;
          const highH = (d.high / maxVal) * iH;
          return (
            <g key={d.month}>
              <rect x={x} y={iH - lowH} width={bw} height={lowH} rx={2} fill="#22c55e" fillOpacity={0.5} />
              <rect x={x} y={iH - lowH - medH} width={bw} height={medH} rx={0} fill="#f97316" fillOpacity={0.6} />
              <rect x={x} y={iH - lowH - medH - highH} width={bw} height={highH} rx={0} fill="#ef4444" fillOpacity={0.75} />
              <text x={x + bw / 2} y={iH + 15} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">{d.month.slice(3)}</text>
            </g>
          );
        })}
        {[0, Math.round(maxVal / 2), maxVal].map((v, i) => (
          <text key={i} x={-4} y={iH - (v / maxVal) * iH + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.25)">{v}</text>
        ))}
      </g>
    </svg>
  );
}

function LineChart({ data }: { data: typeof CATEGORY_TRENDS }) {
  const allVals = data.flatMap((d) => d.values);
  const maxVal = Math.max(...allVals);
  const iW = CW - CP.l - CP.r;
  const iH = CH - CP.t - CP.b;
  const xStep = iW / (data[0].values.length - 1);
  const ys = (v: number) => iH - (v / maxVal) * iH;

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-[160px]">
      <g transform={`translate(${CP.l},${CP.t})`}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} x2={iW} y1={t * iH} y2={t * iH} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {data.map((series) => {
          const d = series.values.map((v, i) => `${i === 0 ? "M" : "L"} ${i * xStep},${ys(v)}`).join(" ");
          return <path key={series.name} d={d} fill="none" stroke={series.color} strokeWidth={1.5} strokeOpacity={0.8} strokeLinejoin="round" />;
        })}
        {MONTHLY.map((d, i) => (
          <text key={d.month} x={i * xStep} y={iH + 15} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.25)">{d.month.slice(3)}</text>
        ))}
      </g>
    </svg>
  );
}

/* ── Main Component ────────────────────────────────────── */
export function TrendReport() {
  const [period, setPeriod] = useState<"3m" | "6m" | "all">("all");

  const totalThisMonth = MONTHLY[MONTHLY.length - 1];
  const totalLastMonth = MONTHLY[MONTHLY.length - 2];
  const thisTotal = totalThisMonth.high + totalThisMonth.medium + totalThisMonth.low;
  const lastTotal = totalLastMonth.high + totalLastMonth.medium + totalLastMonth.low;
  const growthPct = (((thisTotal - lastTotal) / lastTotal) * 100).toFixed(1);
  const highGrowth = (((totalThisMonth.high - totalLastMonth.high) / totalLastMonth.high) * 100).toFixed(1);

  const filteredData = period === "3m" ? MONTHLY.slice(-3) : period === "6m" ? MONTHLY.slice(-6) : MONTHLY;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 size={14} className="text-indigo-400" />
          <span className="text-xs text-indigo-400 tracking-widest uppercase">트렌드 분석</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 트렌드 리포트</h1>
            <p className="text-sm text-white/40">2024.07 ~ 2025.04 스미싱 탐지 동향 분석</p>
          </div>
          <div className="flex gap-1.5">
            {(["3m", "6m", "all"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  period === p ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" : "border-white/10 text-white/35 hover:text-white/55"
                }`}>
                {p === "all" ? "전체" : p === "6m" ? "6개월" : "3개월"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "이번 달 총 탐지", value: thisTotal.toLocaleString(), trend: `+${growthPct}%`, up: true },
          { label: "HIGH 위험 탐지", value: totalThisMonth.high.toLocaleString(), trend: `+${highGrowth}%`, up: true },
          { label: "신규 패턴 등록", value: "14", trend: "+4 전월 대비", up: true },
          { label: "평균 위험 점수", value: "7.2", trend: "▲ 0.3", up: false },
        ].map((k) => (
          <div key={k.label} className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <p className="text-[11px] text-white/35 mb-1">{k.label}</p>
            <p className="text-white" style={{ fontWeight: 700, fontSize: "1.4rem" }}>{k.value}</p>
            <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${k.up ? "text-red-400" : "text-emerald-400"}`}>
              {k.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{k.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly stacked bar */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-white/80" style={{ fontWeight: 500 }}>월별 탐지 건수 추이</p>
            <p className="text-xs text-white/30">위험도별 누적 막대 차트</p>
          </div>
          <div className="flex gap-3 text-[11px] text-white/40">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/75" />HIGH</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500/60" />MED</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/50" />LOW</span>
          </div>
        </div>
        <StackedBarChart data={filteredData} />
      </div>

      {/* Category line chart */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-white/80" style={{ fontWeight: 500 }}>피싱 유형별 비중 변화</p>
            <p className="text-xs text-white/30">전체 대비 % 기준</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TRENDS.map((s) => (
              <span key={s.name} className="flex items-center gap-1 text-[10px] text-white/40">
                <span className="w-2 h-0.5 rounded" style={{ backgroundColor: s.color }} />{s.name}
              </span>
            ))}
          </div>
        </div>
        <LineChart data={CATEGORY_TRENDS} />
      </div>

      {/* Regional distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={13} className="text-white/40" />
            <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>지역별 탐지 분포</p>
          </div>
          <div className="space-y-2.5">
            {REGIONS.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3">
                <span className="text-[11px] text-white/30 w-4 shrink-0">{i + 1}</span>
                <span className="text-xs text-white/60 w-12 shrink-0">{r.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ delay: i * 0.05, duration: 0.6 }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                </div>
                <span className="text-[11px] text-white/40 w-8 text-right">{r.pct}%</span>
                <span className="text-[11px] text-white/25 w-14 text-right">{r.count.toLocaleString()}건</span>
              </div>
            ))}
          </div>
        </div>

        {/* YoY comparison */}
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>전년 동기 대비</p>
          <div className="space-y-3">
            {[
              { label: "총 탐지 건수", this: 1692, last: 1287, color: "bg-red-500" },
              { label: "HIGH 위험", this: 501, last: 341, color: "bg-red-500" },
              { label: "신규 공격 패턴", this: 14, last: 7, color: "bg-orange-500" },
              { label: "평균 위험 점수", this: 72, last: 65, color: "bg-amber-500" },
            ].map((s) => {
              const growth = Math.round(((s.this - s.last) / s.last) * 100);
              return (
                <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/55">{s.label}</span>
                    <span className="text-xs text-red-400" style={{ fontWeight: 600 }}>+{growth}%</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: "100%", opacity: 0.8 }} />
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.last / s.this) * 100}%`, opacity: 0.35 }} />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/50">2025: {s.this.toLocaleString()}</span>
                    <span className="text-[10px] text-white/25">2024: {s.last.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attack pattern timeline */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <CalendarDays size={13} className="text-white/40" />
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>신규 공격 패턴 타임라인</p>
        </div>
        <div className="space-y-3 relative">
          <div className="absolute left-[72px] top-2 bottom-2 w-px bg-white/8" />
          {TIMELINE.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex gap-4 items-start">
              <span className="text-[11px] text-white/25 w-14 shrink-0 pt-2 text-right">{t.date}</span>
              <div className="relative z-10 w-2 h-2 rounded-full mt-2.5 shrink-0" style={{ backgroundColor: t.color.replace("text-", "").includes("red") ? "#ef4444" : t.color.includes("orange") ? "#f97316" : t.color.includes("amber") ? "#f59e0b" : t.color.includes("purple") ? "#a78bfa" : t.color.includes("blue") ? "#3b82f6" : "#22d3ee" }} />
              <div className={`flex-1 p-3 rounded-xl border ${t.bg} ${t.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-xs ${t.color}`} style={{ fontWeight: 500 }}>{t.title}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${t.border} ${t.color}`}>{t.tag}</span>
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Insight banner */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex gap-3">
        <AlertCircle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50 leading-relaxed">
          <strong className="text-indigo-300/80">분석 인사이트:</strong> 2025년 들어 URL을 포함하지 않는 전화 유도형 및 QR코드 피싱이 증가하고 있습니다.
          현재 텍스트 기반 탐지 모델의 보완을 위해 멀티모달 입력(이미지 + 텍스트) 확장이 권고됩니다.
        </p>
      </div>
    </div>
  );
}
