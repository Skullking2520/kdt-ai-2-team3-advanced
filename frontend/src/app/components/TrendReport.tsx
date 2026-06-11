import {useState} from "react";
import {motion} from "motion/react";
import {BarChart2, TrendingUp, TrendingDown, CalendarDays, AlertCircle} from "lucide-react";

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
  { date: "2025.04", title: "AI 합성 발신번호 피싱", tag: "신규", color: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-500/20", bg: "bg-red-50 dark:bg-red-500/8", desc: "AI로 생성된 가짜 공공기관 발신번호 사용. 기존 패턴으로 탐지 어려움." },
  { date: "2025.03", title: "단축URL 이중 리다이렉션", tag: "진화", color: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-500/20", bg: "bg-orange-50 dark:bg-orange-500/8", desc: "bit.ly → 중간 정상 도메인 → 최종 피싱 도메인으로 2단계 리다이렉션하여 URL 검사 우회." },
  { date: "2025.02", title: "전화 유도형 피싱 증가", tag: "증가", color: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20", bg: "bg-amber-50 dark:bg-amber-500/8", desc: "URL 없이 전화번호만 포함해 AI 탐지 회피. 보이스피싱과 연계." },
  { date: "2025.01", title: "QR코드 피싱 (큐싱)", tag: "신규", color: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-500/20", bg: "bg-purple-50 dark:bg-purple-500/8", desc: "문자 내 QR코드 이미지 삽입. 텍스트 기반 탐지 완전 우회. 모델 확장 필요." },
  { date: "2024.12", title: "명절 택배 사기 급증", tag: "시즌형", color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20", bg: "bg-blue-50 dark:bg-blue-500/8", desc: "설·추석 전후 택배 위장 스미싱 400% 급증. 계절성 패턴 확인." },
  { date: "2024.11", title: "정부지원금 사칭 캠페인", tag: "대규모", color: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-500/20", bg: "bg-cyan-50 dark:bg-cyan-500/8", desc: "동일 인프라에서 3,200건 동시 발송된 조직적 피싱 캠페인 탐지." },
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
          <BarChart2 size={14} className="text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">트렌드 분석</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-gray-900 dark:text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 트렌드 리포트</h1>
            <p className="text-sm text-gray-500 dark:text-white/40">신규 공격 패턴과 탐지 모델 인사이트</p>
          </div>
        </div>
      </div>

      {/* 차트 섹션 — 백엔드 연동 전. KPI/monthly/category/region/YoY는 모두 mock 데이터
          (실제 분석 DB 응답이 없으면 사용자 입장에서 "고장난 화면"으로 보임).
          사용자에게 실질적으로 필요한 정보(신규 공격 패턴 타임라인 + 인사이트)만 남기고
          나머지는 백엔드 연동 안내 카드로 통합. (P2-8 단순화) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/25 rounded-xl p-5">
          <div className="flex items-start gap-2.5">
            <BarChart2 size={16} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-1" style={{ fontWeight: 600 }}>
                탐지 통계 · 백엔드 연동 예정
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300/80 leading-relaxed">
                월별 탐지 건수, 유형별 비중, 지역 분포, 전년 대비 추이 차트는
                분석 DB 연동 후 자동으로 표시됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25 rounded-xl p-5">
          <div className="flex items-start gap-2.5">
            <TrendingUp size={16} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-1" style={{ fontWeight: 600 }}>
                지금 당장 확인 가능한 정보
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed list-disc list-inside space-y-0.5">
                <li>최근 발견된 신규 공격 패턴 (아래 타임라인)</li>
                <li>탐지 모델 개선 권고 사항 (인사이트)</li>
                <li>단기 트렌드 분석은 곧 제공 예정</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Attack pattern timeline */}
      <div className="bg-white border border-gray-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <CalendarDays size={13} className="text-gray-400 dark:text-white/40" />
          <p className="text-sm text-gray-700 dark:text-white/70" style={{ fontWeight: 500 }}>신규 공격 패턴 타임라인</p>
        </div>
        <div className="space-y-3 relative">
          <div className="absolute left-[72px] top-2 bottom-2 w-px bg-gray-200 dark:bg-white/8" />
          {TIMELINE.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
              className="flex gap-4 items-start">
              <span className="text-[11px] text-gray-500 dark:text-white/25 w-14 shrink-0 pt-2 text-right">{t.date}</span>
              <div className="relative z-10 w-2 h-2 rounded-full mt-2.5 shrink-0" style={{ backgroundColor: t.color.includes("red") ? "#ef4444" : t.color.includes("orange") ? "#f97316" : t.color.includes("amber") ? "#f59e0b" : t.color.includes("purple") ? "#a78bfa" : t.color.includes("blue") ? "#3b82f6" : "#22d3ee" }} />
              <div className={`flex-1 p-3 rounded-xl border ${t.bg} ${t.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-xs ${t.color}`} style={{ fontWeight: 500 }}>{t.title}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${t.border} ${t.color}`}>{t.tag}</span>
                </div>
                <p className="text-[11px] text-gray-700 dark:text-white/45 leading-relaxed">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Insight banner */}
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/5 dark:border-indigo-500/15 flex gap-3">
        <AlertCircle size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-700 dark:text-white/50 leading-relaxed">
          <strong className="text-indigo-700 dark:text-indigo-300/80">분석 인사이트:</strong> 2025년 들어 URL을 포함하지 않는 전화 유도형 및 QR코드 피싱이 증가하고 있습니다.
          현재 텍스트 기반 탐지 모델의 보완을 위해 멀티모달 입력(이미지 + 텍스트) 확장이 권고됩니다.
        </p>
      </div>
    </div>
  );
}
