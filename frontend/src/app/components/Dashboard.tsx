import { ShieldAlert, ShieldCheck, AlertTriangle, TrendingUp, Activity, Flag, MessageSquare, ChevronRight } from "lucide-react";
import { Card, MetricBig, SectionHeader, FeedItem } from "./ui/Primitives";
import { useNavigate } from "react-router";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const weeklyData = [
  { day: "월", high: 12, medium: 8, low: 32 },
  { day: "화", high: 19, medium: 14, low: 41 },
  { day: "수", high: 8, medium: 11, low: 28 },
  { day: "목", high: 24, medium: 18, low: 53 },
  { day: "금", high: 31, medium: 22, low: 67 },
  { day: "토", high: 15, medium: 9, low: 44 },
  { day: "일", high: 9, medium: 6, low: 38 },
];

const pieData = [
  { name: "HIGH", value: 118, color: "#ef4444" },
  { name: "MEDIUM", value: 88, color: "#f97316" },
  { name: "LOW", value: 303, color: "#22c55e" },
];

const categoryData = [
  { category: "공공기관 사칭", count: 89 },
  { category: "금융 피싱", count: 73 },
  { category: "택배 사기", count: 61 },
  { category: "이벤트/경품", count: 48 },
  { category: "대출 사기", count: 37 },
  { category: "기타", count: 27 },
];

const recentAlerts = [
  { time: "2분 전", type: "HIGH", text: "【국민건강보험】미납보험료 즉시 납부 요청", category: "공공기관 사칭" },
  { time: "7분 전", type: "HIGH", text: "[CJ대한통운] 주소불명 반송 예정 확인 요청", category: "택배 사기" },
  { time: "15분 전", type: "MEDIUM", text: "특별 이벤트 당첨! 링크를 통해 수령하세요", category: "이벤트 사기" },
  { time: "23분 전", type: "LOW", text: "카카오 인증번호 [394821]", category: "정상" },
  { time: "31분 전", type: "HIGH", text: "KB국민은행 비정상 접근 감지 즉시 확인 필요", category: "금융 피싱" },
];

// 신고/피드백 알림 데이터
const reportStats = [
  { label: "미처리 신고", value: 7, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { label: "검토 중", value: 3, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { label: "완료 처리", value: 24, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
];
const feedbackStats = [
  { label: "정확해요", value: 89, color: "text-emerald-400" },
  { label: "틀렸어요", value: 11, color: "text-red-400" },
];

const statCards = [
  { label: "오늘 총 분석",     value: 509, sublabel: "+12.4% 전일 대비", icon: Activity,     accent: "cyan"    as const },
  { label: "HIGH 위험 탐지",  value: 118, sublabel: "전체의 23.2%",      icon: ShieldAlert,  accent: "red"     as const },
  { label: "MEDIUM 위험",     value: 88,  sublabel: "전체의 17.3%",      icon: AlertTriangle,accent: "amber"   as const },
  { label: "정상 판정",       value: 303, sublabel: "전체의 59.5%",      icon: ShieldCheck,  accent: "emerald" as const },
];

/* ── Area Chart (Recharts) ─────────────────────────── */
function CustomAreaChart({ data }: { data: typeof weeklyData }) {
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
function CustomDonutChart({ data }: { data: typeof pieData }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 80, cy = 80, ro = 65, ri = 44;
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
    <svg viewBox="0 0 160 160" className="w-full h-[160px]" preserveAspectRatio="xMidYMid meet">
      {slices.map((s) => (
        <path key={s.name} d={s.path} fill={s.color} fillOpacity={0.85} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fill="white" fontWeight="700" fontFamily="system-ui,sans-serif">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="system-ui,sans-serif">건</text>
    </svg>
  );
}

/* ── Custom Horizontal Bar Chart ──────────────────── */
function CustomBarChart({ data }: { data: typeof categoryData }) {
  const maxVal = Math.max(...data.map((d) => d.count));
  const barH = 18, gap = 10;
  const chartH = data.length * (barH + gap);
  const labelW = 88, barAreaW = 200, numW = 36;
  const totalW = labelW + barAreaW + numW;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH}`} className="w-full" style={{ height: `${Math.max(chartH, 120)}px` }} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const y = i * (barH + gap);
        const bw = (d.count / maxVal) * barAreaW;
        return (
          <g key={d.category}>
            <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.5)" fontFamily="system-ui,sans-serif">{d.category}</text>
            <rect x={labelW} y={y} width={barAreaW} height={barH} rx={4} fill="rgba(255,255,255,0.04)" />
            <rect x={labelW} y={y} width={bw} height={barH} rx={4} fill="#3b82f6" fillOpacity={0.75} />
            <text x={labelW + bw + 6} y={y + barH / 2 + 4} fontSize={10} fill="rgba(255,255,255,0.6)" fontFamily="system-ui,sans-serif">{d.count}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Dashboard ─────────────────────────────────────── */
export function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="px-4 sm:px-6 py-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <TrendingUp size={12} className="text-cyan-400" />
          <span className="text-[11px] text-cyan-400 tracking-wider uppercase">실시간 현황</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 800, fontSize: "1.9rem", letterSpacing: "-0.02em" }}>대시보드</h1>
        <p className="text-sm text-white/50">오늘 2026.05.04 기준 탐지 현황입니다.</p>
      </div>

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

      {/* 신고/피드백 알림 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 신고 알림 */}
        <Card padding="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-red-400" />
              <span className="text-sm text-white/80" style={{ fontWeight: 600 }}>신고 알림</span>
            </div>
            <button
              onClick={() => navigate("/audit")}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-all"
            >
              신고 검토 <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {reportStats.map((s) => (
              <div key={s.label} className={`rounded-xl p-3 border ${s.bg} text-center`}>
                <p className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 피드백 알림 */}
        <Card padding="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-cyan-400" />
              <span className="text-sm text-white/80" style={{ fontWeight: 600 }}>피드백 분석</span>
            </div>
            <button
              onClick={() => navigate("/feedback")}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-all"
            >
              상세 보기 <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {feedbackStats.map((s) => (
              <div key={s.label} className="rounded-xl p-3 border border-white/10 text-center">
                <p className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}<span className="text-sm text-white/40">%</span></p>
                <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
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

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category bar chart */}
        <Card padding="p-5">
          <SectionHeader title="피싱 유형별 분류" sub="누적 탐지 수" />
          <CustomBarChart data={categoryData} />
        </Card>

        {/* Recent alerts — FeedItem 사용 */}
        <Card padding="p-5">
          <SectionHeader title="최근 탐지 알림" sub="실시간 업데이트" />
          <div className="space-y-2">
            {recentAlerts.map((alert, i) => (
              <FeedItem
                key={i}
                level={alert.type as "HIGH" | "MEDIUM" | "LOW"}
                sender={alert.category}
                preview={alert.text}
                time={alert.time}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}