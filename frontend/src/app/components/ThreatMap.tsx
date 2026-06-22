import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Map, TrendingUp } from "lucide-react";

interface Region {
  id: string;
  name: string;
  shortName: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  reports: number;
  highPct: number;
  topType: string;
  trend: number;
  color: string;
}

const REGIONS: Region[] = [
  { id: "seoul",   name: "서울특별시",     shortName: "서울",  cx: 148, cy: 115, rx: 22, ry: 16, reports: 14820, highPct: 38, topType: "금융 피싱",    trend: 12,  color: "#ef4444" },
  { id: "gyeonggi",name: "경기도",         shortName: "경기",  cx: 148, cy: 148, rx: 38, ry: 28, reports: 11230, highPct: 31, topType: "택배 사기",    trend: 8,   color: "#f97316" },
  { id: "incheon", name: "인천광역시",     shortName: "인천",  cx: 110, cy: 128, rx: 15, ry: 12, reports: 4210,  highPct: 28, topType: "공공기관 사칭",trend: -3,  color: "#f97316" },
  { id: "gangwon", name: "강원도",         shortName: "강원",  cx: 220, cy: 128, rx: 32, ry: 34, reports: 2180,  highPct: 19, topType: "대출 사기",    trend: 4,   color: "#eab308" },
  { id: "chungbuk",name: "충청북도",       shortName: "충북",  cx: 195, cy: 190, rx: 22, ry: 22, reports: 2640,  highPct: 22, topType: "공공기관 사칭",trend: 6,   color: "#eab308" },
  { id: "chungnam",name: "충청남도",       shortName: "충남",  cx: 138, cy: 205, rx: 24, ry: 22, reports: 3180,  highPct: 24, topType: "택배 사기",    trend: 2,   color: "#eab308" },
  { id: "daejeon", name: "대전광역시",     shortName: "대전",  cx: 162, cy: 205, rx: 12, ry: 10, reports: 2940,  highPct: 26, topType: "금융 피싱",    trend: 9,   color: "#f97316" },
  { id: "sejong",  name: "세종특별자치시", shortName: "세종",  cx: 158, cy: 190, rx: 8,  ry: 7,  reports: 820,   highPct: 18, topType: "대출 사기",    trend: 15,  color: "#22c55e" },
  { id: "jeonbuk", name: "전라북도",       shortName: "전북",  cx: 152, cy: 248, rx: 25, ry: 22, reports: 2890,  highPct: 25, topType: "공공기관 사칭",trend: 7,   color: "#eab308" },
  { id: "jeonnam", name: "전라남도",       shortName: "전남",  cx: 148, cy: 292, rx: 28, ry: 26, reports: 2410,  highPct: 21, topType: "택배 사기",    trend: 3,   color: "#eab308" },
  { id: "gwangju", name: "광주광역시",     shortName: "광주",  cx: 148, cy: 268, rx: 12, ry: 10, reports: 3120,  highPct: 27, topType: "금융 피싱",    trend: 11,  color: "#f97316" },
  { id: "gyeongbuk",name:"경상북도",       shortName: "경북",  cx: 238, cy: 218, rx: 30, ry: 34, reports: 4120,  highPct: 29, topType: "이벤트 사기",  trend: 5,   color: "#f97316" },
  { id: "gyeongnam",name:"경상남도",       shortName: "경남",  cx: 220, cy: 278, rx: 28, ry: 24, reports: 4680,  highPct: 32, topType: "공공기관 사칭",trend: 18,  color: "#f97316" },
  { id: "daegu",   name: "대구광역시",     shortName: "대구",  cx: 222, cy: 238, rx: 12, ry: 10, reports: 3840,  highPct: 30, topType: "금융 피싱",    trend: 7,   color: "#f97316" },
  { id: "busan",   name: "부산광역시",     shortName: "부산",  cx: 250, cy: 292, rx: 13, ry: 11, reports: 6210,  highPct: 35, topType: "금융 피싱",    trend: 14,  color: "#ef4444" },
  { id: "ulsan",   name: "울산광역시",     shortName: "울산",  cx: 250, cy: 268, rx: 11, ry: 10, reports: 2180,  highPct: 26, topType: "택배 사기",    trend: 4,   color: "#eab308" },
  { id: "jeju",    name: "제주특별자치도", shortName: "제주",  cx: 148, cy: 356, rx: 22, ry: 14, reports: 1140,  highPct: 16, topType: "이벤트 사기",  trend: -2,  color: "#22c55e" },
];

const MAX_REPORTS = Math.max(...REGIONS.map((r) => r.reports));

const MONTHLY: { month: string; total: number }[] = [
  { month: "11월", total: 38200 },
  { month: "12월", total: 41500 },
  { month: "1월",  total: 45800 },
  { month: "2월",  total: 43200 },
  { month: "3월",  total: 49600 },
  { month: "4월",  total: 56400 },
];

function getHeatColor(reports: number): string {
  const t = reports / MAX_REPORTS;
  if (t > 0.7) return "#ef4444";
  if (t > 0.4) return "#f97316";
  if (t > 0.2) return "#eab308";
  return "#22c55e";
}

function getRadius(reports: number): number {
  return 8 + (reports / MAX_REPORTS) * 22;
}

export function ThreatMap() {
  const [hovered, setHovered] = useState<Region | null>(null);
  const [selected, setSelected] = useState<Region | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "trend">("all");

  const sorted = [...REGIONS].sort((a, b) => b.reports - a.reports);
  const displayed = selected ?? hovered;
  const maxMonthly = Math.max(...MONTHLY.map((m) => m.total));

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Map size={14} className="text-red-400" />
          <span className="text-xs text-red-400 tracking-widest uppercase">지역별 피해 현황</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 피해 지역 히트맵</h1>
        <p className="text-sm text-white/40">2025년 4월 기준 지역별 스미싱 신고 밀도 시각화</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "전체 신고량" },
          { key: "high", label: "HIGH 위험 비율" },
          { key: "trend", label: "전월 대비 증감" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
              filter === f.key ? "bg-red-500/15 border-red-500/30 text-red-400" : "border-white/10 text-white/40 hover:text-white/60"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-[#111c30] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
            {/* Map background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }} />
            </div>

            <svg viewBox="60 80 240 310" className="w-full max-h-[500px] relative z-10">
              {/* Sea background */}
              <rect x="60" y="80" width="240" height="310" fill="rgba(34,211,238,0.03)" rx="8" />

              {/* Korea outline — simplified ellipses per region */}
              {REGIONS.map((r) => {
                const rad = getRadius(r.reports);
                const col = filter === "all" ? getHeatColor(r.reports)
                  : filter === "high" ? `hsl(${(1 - r.highPct / 40) * 120},80%,55%)`
                  : r.trend > 10 ? "#ef4444" : r.trend > 0 ? "#f97316" : "#22c55e";
                const isActive = displayed?.id === r.id;
                return (
                  <g key={r.id} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(r)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                    {/* Pulse ring for high risk */}
                    {r.reports > 10000 && (
                      <circle cx={r.cx} cy={r.cy} r={rad + 4} fill="none"
                        stroke={col} strokeWidth={1} opacity={0.3}>
                        <animate attributeName="r" from={rad + 2} to={rad + 10} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={r.cx} cy={r.cy}
                      r={isActive ? rad + 3 : rad}
                      fill={col}
                      fillOpacity={isActive ? 0.7 : 0.45}
                      stroke={col}
                      strokeWidth={isActive ? 2 : 0.5}
                      strokeOpacity={0.8}
                      style={{ transition: "all 0.2s" }} />
                    <text x={r.cx} y={r.cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={r.rx > 18 ? 8 : 7} fill="white" fillOpacity={0.85} fontWeight="600"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {r.shortName}
                    </text>
                    <text x={r.cx} y={r.cy + (r.rx > 18 ? 10 : 9)} textAnchor="middle" dominantBaseline="middle"
                      fontSize={6} fill="white" fillOpacity={0.5}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {filter === "all" ? `${(r.reports / 1000).toFixed(1)}k` : filter === "high" ? `${r.highPct}%` : `${r.trend > 0 ? "+" : ""}${r.trend}%`}
                    </text>
                  </g>
                );
              })}

              {/* 제주 island label */}
              <text x={148} y={344} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.2)">— 제주해협 —</text>
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 px-2">
              <p className="text-[10px] text-white/25">신고량:</p>
              {[
                { label: "낮음", color: "#22c55e" },
                { label: "보통", color: "#eab308" },
                { label: "높음", color: "#f97316" },
                { label: "매우 높음", color: "#ef4444" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1 text-[10px] text-white/30">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color, opacity: 0.7 }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tooltip panel */}
          <AnimatePresence>
            {displayed ? (
              <motion.div key={displayed.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#111c30] border rounded-xl p-4 overflow-hidden"
                style={{ borderColor: displayed.color + "40" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>{displayed.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded border" style={{ color: displayed.color, borderColor: displayed.color + "40", backgroundColor: displayed.color + "20" }}>
                    #{sorted.findIndex((r) => r.id === displayed.id) + 1}위
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "총 신고", value: `${displayed.reports.toLocaleString()}건` },
                    { label: "HIGH 비율", value: `${displayed.highPct}%` },
                    { label: "주요 유형", value: displayed.topType },
                    { label: "전월 대비", value: `${displayed.trend > 0 ? "+" : ""}${displayed.trend}%` },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                      <span className="text-white/35">{s.label}</span>
                      <span className={s.label === "전월 대비"
                        ? displayed.trend > 10 ? "text-red-400" : displayed.trend > 0 ? "text-amber-400" : "text-emerald-400"
                        : "text-white/65"
                      } style={{ fontWeight: 500 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(displayed.reports / MAX_REPORTS) * 100}%`, backgroundColor: displayed.color, opacity: 0.7 }} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" className="bg-[#111c30] border border-white/8 border-dashed rounded-xl p-4 text-center">
                <Map size={18} className="text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/20">지역을 클릭하거나 hover하세요</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Monthly trend */}
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-3 flex items-center gap-1"><TrendingUp size={10} /> 월별 전국 신고 추이</p>
            <div className="space-y-1.5">
              {MONTHLY.map((m) => (
                <div key={m.month} className="flex items-center gap-2">
                  <span className="text-[11px] text-white/30 w-7 shrink-0">{m.month}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(m.total / maxMonthly) * 100}%` }} transition={{ duration: 0.7 }}
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" style={{ opacity: 0.7 }} />
                  </div>
                  <span className="text-[11px] text-white/40 w-12 text-right">{(m.total / 1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 */}
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-3">신고량 TOP 5</p>
            <div className="space-y-2">
              {sorted.slice(0, 5).map((r, i) => (
                <button key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  className={`w-full flex items-center gap-2 text-left p-1.5 rounded-lg transition-all ${selected?.id === r.id ? "bg-white/8" : "hover:bg-white/5"}`}>
                  <span className="text-[10px] text-white/20 w-3">{i + 1}</span>
                  <span className="flex-1 text-[11px] text-white/60">{r.name}</span>
                  <span className="text-[11px]" style={{ color: r.color }}>{r.reports.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { label: "전국 총 신고", value: `${REGIONS.reduce((s, r) => s + r.reports, 0).toLocaleString()}건` },
          { label: "최다 피해 지역", value: "서울특별시" },
          { label: "가장 빠른 증가", value: `경상남도 +18%` },
          { label: "주요 피싱 유형", value: "금융 피싱 (32%)" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3">
            <p className="text-[11px] text-white/30">{s.label}</p>
            <p className="text-xs text-white/70 mt-0.5" style={{ fontWeight: 500 }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
