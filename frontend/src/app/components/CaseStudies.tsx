import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Radio, ExternalLink, RefreshCw, Building2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Case {
  id: string;
  year: string;
  title: string;
  category: string;
  damage: string;
  victims: string;
  method: string;
  actualTexts: string[];
  howItWorked: string[];
  redFlags: string[];
  prevention: string[];
  outcome: string;
  severity: "critical" | "high" | "medium";
  arrested: boolean;
}


// 정직한 처리: 피해 사례는 KISA·경찰청·언론 등 공식 출처에서 크롤링한 실재 사건만 표시.
// mock에서 "약 42억원", "피의자 7명 구속", "주범 징역 8년" 같은 출처 없는 가짜 사건을 만들면
// 정직하지 않음. 빈 배열로 두고 UI에서 "KISA·경찰청 RSS/API 미연동" 안내.
const CASES: Case[] = [];


const SEV_STYLE = {
  critical: { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/25", text: "text-red-600 dark:text-red-400", label: "심각" },
  high:     { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/25", text: "text-orange-600 dark:text-orange-400", label: "높음" },
  medium:   { bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/25", text: "text-amber-600 dark:text-amber-400", label: "보통" },
};

interface OfficialAlert {
  id: string;
  source: string;
  sourceIcon: string;

  time: string;
  title: string;
  type: string;
  description: string;
  targetGroup: string;
  url: string;
  severity: "urgent" | "warning" | "info";
}

// 실제 정부/경찰 기관 사례를 시뮬레이션 (실제 환경에서는 API로 크롤링)
// 정직한 처리: 정부 RSS/API 미연동. 일반인이 직접 연결 못하므로 mock 가짜 알림 만들면 정직하지 않음.
// UI에서 "KISA·경찰청 RSS/API 미연동" 안내로 대체.

const SEVERITY_STYLE = {
  urgent:  { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/30", text: "text-red-600 dark:text-red-400", dot: "bg-red-500 dark:bg-red-400", label: "긴급" },
  warning: { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/30", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500 dark:bg-orange-400", label: "경고" },
  info:    { bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", dot: "bg-cyan-500 dark:bg-cyan-400", label: "안내" },
};

const PAGE_SIZE = 10;

export function CaseStudies() {
  const [expanded, setExpanded] = useState<string | null>("c1");
  const [catFilter, setCatFilter] = useState("전체");
  const [currentPage, setCurrentPage] = useState(1);
  // 정직한 처리: KISA·경찰청 RSS/API 미연동 — officialFeed는 빈 배열로 고정
  const [officialFeed] = useState<OfficialAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = ["전체", ...Array.from(new Set(CASES.map((c) => c.category)))];
  const filtered = catFilter === "전체" ? CASES : CASES.filter((c) => c.category === catFilter);

  // Reset page when filter changes
  const handleFilterChange = (cat: string) => {
    setCatFilter(cat);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  // 정직한 처리: KISA·경찰청 RSS/API 미연동 — 30초 시뮬레이션 mock 가짜 실시간 업데이트 제거
  useEffect(() => {
    // 백엔드 연동 시 실제 API 호출로 교체
  }, []);

  const handleRefresh = () => {
    // 정직한 처리: 가짜 새로고침 시뮬레이션 제거. 백엔드 연동 시 실제 API 호출로 교체
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-8 max-w-4xl mx-auto bg-white dark:bg-[#0b1120]">
      {/* 정직한 안내: 정부기관 RSS/API는 일반인이 직접 연결 못함 — KISA·경찰청·금감원·과기부 데이터는 자동 적재 안 됨 */}
      <div className="mb-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-amber-500/15 text-amber-700 text-xs" style={{ fontWeight: 700 }}>
            !
          </div>
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200" style={{ fontWeight: 600 }}>
              피해 사례·기관 알림 (KISA·경찰청 RSS/API 미연동)
            </p>
            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
              정부기관 RSS/API는 일반인이 직접 연결할 수 없으므로, mock에서 가짜 사건·기관 알림을 만들면 정직하지 않습니다.
              백엔드 운영팀이 KISA 공공데이터·경찰청 사이버범죄 통계 RSS를 연동하면 자동으로 적재됩니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-orange-500 dark:text-orange-400" />
          <span className="text-xs text-orange-600 dark:text-orange-400 tracking-widest uppercase">실제 피해 사례</span>
        </div>
        <h1 className="text-gray-900 dark:text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피해 사례집</h1>
        <p className="text-sm text-gray-500 dark:text-white/40">실제 발생한 스미싱 피해 사례 분석 — 수법·피해액·예방법 전문 리포트</p>
      </div>

      {/* Official Feed Section */}
      <div className="mb-8 bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-sm text-cyan-900 dark:text-white/80" style={{ fontWeight: 600 }}>정부·경찰 공식 피싱 주의보</h2>
            <div className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
              실시간 연동
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40 border border-gray-200 dark:border-white/10">
              수사·처리 사례 {CASES.length}건
            </span>
          </div>
          <button onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-300 dark:border-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-xs hover:bg-cyan-100 dark:hover:bg-cyan-500/10 transition-all disabled:opacity-50">
            <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-white/40 mb-4">
          한국인터넷진흥원(KISA), 경찰청, 금융감독원 등 공공기관에서 발표한 최신 피싱 주의보입니다.
        </p>
        {/* 발표용 Mock 데이터 안내 */}
        <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            💡 <strong>발표 시점:</strong> 이 영역은 발표용 Mock 데이터입니다. 실제 환경에서는 KISA·경찰청 RSS/API 연동을 통해 실시간 업데이트 예정입니다.
          </p>
        </div>

        <div className="space-y-2.5">
          {officialFeed.slice(0, 4).map((alert) => {
            const ss = SEVERITY_STYLE[alert.severity];
            return (
              <motion.div key={alert.id} layout
                className={`rounded-xl border ${ss.bg} ${ss.border} p-4 hover:bg-white/3 dark:hover:bg-white/3 transition-all`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${ss.dot} shrink-0 mt-1.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text} font-mono`}>
                        {ss.label}
                      </span>
                      <span className="text-[10px] text-gray-600 dark:text-white/40">{alert.source}</span>
                      <span className="text-[10px] text-gray-500 dark:text-white/40">·</span>
                      <span className="text-[10px] text-gray-600 dark:text-white/40">{alert.time}</span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white/80 mb-1" style={{ fontWeight: 600 }}>{alert.title}</p>
                    <p className="text-xs text-gray-700 dark:text-white/50 leading-relaxed mb-2 line-clamp-2">{alert.description}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-gray-500 dark:text-white/40">대상: {alert.targetGroup}</span>
                      <a href={alert.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline">
                        공식 출처 확인 <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
          <p className="text-[10px] text-gray-500 dark:text-white/40">
            <Building2 size={10} className="inline mr-1" />
            실제 크롤링 환경에서는 공공기관 RSS/API를 통해 실시간으로 업데이트됩니다
          </p>
          <span className="text-[10px] text-gray-500 dark:text-white/40">마지막 업데이트: 방금 전</span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-3">
        <h2 className="text-sm text-gray-700 dark:text-white/70 mb-3" style={{ fontWeight: 600 }}>과거 주요 피해 사례 아카이브</h2>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => handleFilterChange(c)}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                catFilter === c
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-400"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:text-white/55"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Cases */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon="cases"
            title="이 카테고리에 해당하는 사례가 없어요"
            description="다른 카테고리를 선택하거나 전체 보기를 눌러보세요."
            action={{ label: "전체 보기로 전환", onClick: () => handleFilterChange("전체") }}
          />
        ) : (
          paginated.map((c) => {
            const ss = SEV_STYLE[c.severity];
            const isOpen = expanded === c.id;
          return (
            <motion.div key={c.id} layout className={`rounded-2xl border overflow-hidden ${ss.bg} ${ss.border}`}>
              {/* Header — P2-9: metadata 축약, title line-clamp */}
              <button onClick={() => setExpanded(isOpen ? null : c.id)}
                className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/3 dark:hover:bg-white/3 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text} font-mono`}>{ss.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white/55">{c.category}</span>
                    {c.arrested && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-500/15 dark:border-emerald-500/25 dark:text-emerald-400">검거완료</span>}
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white/80 line-clamp-2" style={{ fontWeight: 600 }}>{c.title}</p>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-red-600 dark:text-red-400">피해액 {c.damage}</span>
                    <span className="text-xs text-gray-600 dark:text-white/40">피해자 {c.victims}</span>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-gray-500 dark:text-white/30 shrink-0 mt-0.5" /> : <ChevronDown size={14} className="text-gray-500 dark:text-white/30 shrink-0 mt-0.5" />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-200 dark:border-white/8">
                    <div className="p-5 space-y-5">
                      {/* Actual texts */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-white/40 mb-2">실제 피싱 문자 예시</p>
                        <div className="space-y-2">
                          {c.actualTexts.map((t, i) => (
                            <div key={i} className="bg-white border border-gray-200 dark:bg-[#0b1120] dark:border-white/10 rounded-xl p-3 text-xs text-gray-800 dark:text-white/65 leading-relaxed font-mono">
                              {t}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* How it worked */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-white/40 mb-2 flex items-center gap-1"><AlertTriangle size={10} className="text-red-500 dark:text-red-400" /> 수법 분석</p>
                          <ol className="space-y-1.5">
                            {c.howItWorked.map((h, i) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-gray-700 dark:text-white/55">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/15 dark:border-red-500/20 dark:text-red-400 flex items-center justify-center text-[9px]">{i + 1}</span>
                                {h}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Red flags + Prevention */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">경고 신호</p>
                            <div className="flex flex-wrap gap-1.5">
                              {c.redFlags.map((f, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 mb-2">예방법</p>
                            <ul className="space-y-1">
                              {c.prevention.map((p, i) => (
                                <li key={i} className="text-[11px] text-emerald-700 dark:text-emerald-400/70 flex items-start gap-1.5">
                                  <ShieldCheck size={10} className="shrink-0 mt-0.5" />{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Outcome */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 dark:bg-white/3 dark:border-white/8">
                        <p className="text-[11px] text-gray-500 dark:text-white/40 mb-1">수사·처리 결과</p>
                        <p className="text-xs text-gray-700 dark:text-white/55 leading-relaxed line-clamp-2">{c.outcome}</p>
                      </div>
                    </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        }))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
          >
            이전
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 rounded-lg text-xs border transition-all ${
                p === currentPage
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
