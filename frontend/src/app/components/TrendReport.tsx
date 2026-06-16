import {useState} from "react";
import {motion} from "motion/react";
import {BarChart2, TrendingUp, CalendarDays, AlertCircle, ChevronDown} from "lucide-react";

/* ── Data ─────────────────────────────────────────────── */
const TIMELINE = [
  { date: "2025.04", title: "AI 합성 발신번호 피싱", tag: "신규", color: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-500/20", bg: "bg-red-50 dark:bg-red-500/8", desc: "AI로 생성된 가짜 공공기관 발신번호 사용. 기존 패턴으로 탐지 어려움." },
  { date: "2025.03", title: "단축URL 이중 리다이렉션", tag: "진화", color: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-500/20", bg: "bg-orange-50 dark:bg-orange-500/8", desc: "bit.ly → 중간 정상 도메인 → 최종 피싱 도메인으로 2단계 리다이렉션하여 URL 검사 우회." },
  { date: "2025.02", title: "전화 유도형 피싱 증가", tag: "증가", color: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20", bg: "bg-amber-50 dark:bg-amber-500/8", desc: "URL 없이 전화번호만 포함해 AI 탐지 회피. 보이스피싱과 연계." },
  { date: "2025.01", title: "QR코드 피싱 (큐싱)", tag: "신규", color: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-500/20", bg: "bg-purple-50 dark:bg-purple-500/8", desc: "문자 내 QR코드 이미지 삽입. 텍스트 기반 탐지 완전 우회. 모델 확장 필요." },
  { date: "2024.12", title: "명절 택배 사기 급증", tag: "시즌형", color: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/20", bg: "bg-blue-50 dark:bg-blue-500/8", desc: "설·추석 전후 택배 위장 스미싱 400% 급증. 계절성 패턴 확인." },
  { date: "2024.11", title: "정부지원금 사칭 캠페인", tag: "대규모", color: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-500/20", bg: "bg-cyan-50 dark:bg-cyan-500/8", desc: "동일 인프라에서 3,200건 동시 발송된 조직적 피싱 캠페인 탐지." },
];

/* ── Main Component ────────────────────────────────────── */
export function TrendReport() {
  const [showAll, setShowAll] = useState(false);
  const DISPLAY_COUNT = 4;
  const remaining = TIMELINE.length - DISPLAY_COUNT;

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

      {/* Attack pattern timeline — 핵심 4건만 먼저, 더보기 구조 */}
      <div className="bg-white border border-gray-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <CalendarDays size={13} className="text-gray-400 dark:text-white/40" />
          <p className="text-sm text-gray-700 dark:text-white/70" style={{ fontWeight: 500 }}>신규 공격 패턴 타임라인</p>
        </div>
        <div className="space-y-3 relative">
          <div className="absolute left-[72px] top-2 bottom-2 w-px bg-gray-200 dark:bg-white/8" />
          {(showAll ? TIMELINE : TIMELINE.slice(0, DISPLAY_COUNT)).map((t, i) => (
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

        {/* 더보기 버튼 */}
        {TIMELINE.length > DISPLAY_COUNT && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all font-medium"
            >
              {showAll ? (
                <><ChevronDown size={13} className="rotate-180" />접기</>
              ) : (
                <><ChevronDown size={13} />더보기 {remaining}건</>
              )}
            </button>
          </div>
        )}
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
