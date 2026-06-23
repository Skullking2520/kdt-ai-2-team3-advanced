import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { Card, MetricBig, SectionHeader } from "./ui/Primitives";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/* ── 백엔드 통계 API 응답 타입 (GET /api/stats/dashboard) ── */
interface WeeklyPoint {
  day: string;
  date: string;
  high: number;
  medium: number;
  low: number;
}
interface PieSlice {
  name: string;
  value: number;
  color: string;
}
interface DashboardStats {
  todayTotal: number;
  today: { high: number; medium: number; low: number };
  weeklyTrend: WeeklyPoint[];
}

/* ── Area Chart (Recharts) ─────────────────────────── */
function CustomAreaChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="0"
          vertical={false}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
        <XAxis
          dataKey="day"
          tick={{ fill: "#ffffff", fontSize: 12, fontFamily: "system-ui" }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fill: "#ffffff", fontSize: 11, fontFamily: "system-ui" }}
          axisLine={false}
          tickLine={false}
          width={36}
          tickCount={5}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
          }}
        />
        <Area type="monotone" dataKey="low" stroke="#22c55e" strokeWidth={1.5} fill="url(#gradLow)" />
        <Area type="monotone" dataKey="medium" stroke="#f97316" strokeWidth={1.5} fill="url(#gradMedium)" />
        <Area type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} fill="url(#gradHigh)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Custom Donut Chart ────────────────────────────── */
function CustomDonutChart({ data }: { data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 110, cy = 110, ro = 90, ri = 60;

  if (total === 0) {
    return (
      <svg viewBox="0 0 220 220" className="w-full h-[220px]" preserveAspectRatio="xMidYMid meet">
        <circle cx={cx} cy={cy} r={(ro + ri) / 2} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={ro - ri} />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={24} fill="white" fontWeight="700" fontFamily="system-ui,sans-serif">0</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.4)" fontFamily="system-ui,sans-serif">건</text>
      </svg>
    );
  }

  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + ro * Math.cos(angle);
    const y1 = cy + ro * Math.sin(angle);
    const x2 = cx + ro * Math.cos(angle + sweep);
    const y2 = cy + ro * Math.sin(angle + sweep);
    const xi1 = cx + ri * Math.cos(angle);
    const yi1 = cy + ri * Math.sin(angle);
    const xi2 = cx + ri * Math.cos(angle + sweep);
    const yi2 = cy + ri * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${ro} ${ro} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${large} 0 ${xi1} ${yi1} Z`;
    angle += sweep + 0.02;
    return { ...d, path };
  });

  return (
    <svg viewBox="0 0 220 220" className="w-full h-[220px]" preserveAspectRatio="xMidYMid meet">
      {slices.map((s) => (
        <path key={s.name} d={s.path} fill={s.color} fillOpacity={0.85} />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={24} fill="white" fontWeight="700" fontFamily="system-ui,sans-serif">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.4)" fontFamily="system-ui,sans-serif">건</text>
    </svg>
  );
}

/* ── Dashboard ─────────────────────────────────────── */
export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL ?? "";
    fetch(`${base}/api/stats/dashboard`)
      .then((r) => {
        if (!r.ok) throw new Error("stats fetch failed");
        return r.json();
      })
      .then((d: DashboardStats) => setStats(d))
      .catch(() => setError(true));
  }, []);

  const today = stats?.today ?? { high: 0, medium: 0, low: 0 };
  const total = stats?.todayTotal ?? 0;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0.0");

  const statCards = [
    { label: "오늘 총 분석", value: total, sublabel: "분석 이력 기준", icon: Activity, accent: "cyan" as const },
    { label: "HIGH 위험 탐지", value: today.high, sublabel: `전체의 ${pct(today.high)}%`, icon: ShieldAlert, accent: "red" as const },
    { label: "MEDIUM 위험", value: today.medium, sublabel: `전체의 ${pct(today.medium)}%`, icon: AlertTriangle, accent: "amber" as const },
    { label: "정상 판정", value: today.low, sublabel: `전체의 ${pct(today.low)}%`, icon: ShieldCheck, accent: "emerald" as const },
  ];

  const pieData: PieSlice[] = [
    { name: "HIGH", value: today.high, color: "#ef4444" },
    { name: "MEDIUM", value: today.medium, color: "#f97316" },
    { name: "LOW", value: today.low, color: "#22c55e" },
  ];

  const weeklyData = stats?.weeklyTrend ?? [];
  const todayLabel = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <TrendingUp size={12} className="text-cyan-400" />
          <span className="text-[11px] text-cyan-400 tracking-wider uppercase">실시간 현황</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 800, fontSize: "1.9rem", letterSpacing: "-0.02em" }}>대시보드</h1>
        <p className="text-sm text-white/50">{todayLabel} 기준 분석 이력(smishing_logs) 현황입니다.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          통계 데이터를 불러오지 못했습니다. 백엔드 통계 API 연결을 확인해주세요.
        </div>
      )}

      {/* MetricBig stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <MetricBig
            key={card.label}
            value={card.value}
            label={card.label}
            sublabel={card.sublabel}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly trend */}
        <Card padding="p-5" className="lg:col-span-2">
          <SectionHeader title="주간 탐지 추이" sub="최근 7일" />
          <div className="flex items-center gap-4 text-[11px] text-white/40 mb-4 px-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />HIGH</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />MEDIUM</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />LOW</span>
          </div>
          <CustomAreaChart data={weeklyData} />
        </Card>

        {/* Donut chart */}
        <Card padding="p-5">
          <SectionHeader title="위험도 분포" sub="오늘 기준" />
          <CustomDonutChart data={pieData} />
          <div className="space-y-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-white/50">{d.name}</span>
                </div>
                <span className="text-xs text-white/70">{d.value}건</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
