import {useState} from "react";
import {motion} from "motion/react";
import {BarChart2, TrendingUp, CalendarDays, AlertCircle, ChevronDown} from "lucide-react";

/* ── Data ─────────────────────────────────────────────── */
// 정직한 처리: 트렌드 데이터는 KISA·경찰청 RSS/API에서만 적재 가능.
// mock에서 "2025.04 AI 합성 발신번호", "QR코드 피싱 (큐싱)", "400% 급증", "3,200건 동시 발송" 같은
// 출처 없는 가짜 트렌드를 만들면 정직하지 않음. 빈 배열로 두고 UI에서 "KISA·경찰청 RSS/API 미연동" 안내.
const TIMELINE: { date: string; title: string; tag: string; color: string; border: string; bg: string; desc: string }[] = [];

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

      {/* Insight banner — 정직한 안내로 교체 (가짜 인사이트 제거) */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/15 flex gap-3">
        <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-700 dark:text-white/50 leading-relaxed">
          <strong className="text-amber-700 dark:text-amber-300/80">정직한 안내:</strong>
          {' '}트렌드 데이터는 KISA 공공데이터·경찰청 사이버범죄 통계 RSS에서만 적재 가능합니다.
          mock에서 가짜 트렌드(연도·증가율·캠페인 규모)를 추측해 표시하면 정직하지 않으므로 비워두었습니다.
        </p>
      </div>
    </div>
  );
}
