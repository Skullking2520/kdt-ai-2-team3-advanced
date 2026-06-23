import {useState} from "react";
import {useNavigate} from "react-router";
import {motion, AnimatePresence} from "motion/react";
import {Link2, Search, Shield, ShieldCheck, RefreshCw, Globe, FileText, Flag} from "lucide-react";
import {Card} from "./ui/Primitives";
import {api, ApiException} from "@/lib/api";
import type { UrlAnalysisResult } from "@/types/api";
import {ErrorState, type ErrorType} from "./ErrorState";

/**
 * URLAnalyzer 화면 상태:
 * - idle: 분석 시작 전
 * - loading: 분석 중
 * - error: API 호출 자체 실패 (NETWORK/TIMEOUT/SERVER) — ErrorState 표시
 * - success: URL 분석 정상 완료 (vtVerdict는 옵셔널 — 있어도 없어도 같은 success 상태)
 */
type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; errorType: ErrorType; message: string }
  | { kind: "success"; data: URLResult };

interface URLResult {
  url: string;
  domain: string;
  vtVerdict?: {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
    total: number;
    lastCheckedAt?: string;
    status: "pending" | "completed" | "failed" | "not_checked";
  };
}

/** api.analyze() UrlAnalysisResult → 컴포넌트 내부 URLResult 어댑터 (VT 데이터만) */
function adaptUrlResult(r: UrlAnalysisResult): URLResult {
  return {
    url: r.content,
    domain: r.urlDetails.domain,
    vtVerdict: r.urlDetails.vtVerdict,
  };
}

const SAMPLE_URLS = [
  "http://nhis-pay.kr/login",
  "http://prize-samsung.xyz/claim",
  "http://175.221.43.127/login",
  "https://www.nhis.or.kr",
];

export function URLAnalyzer() {
  const nav = useNavigate();
  const [input, setInput] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const [tab, setTab] = useState<"detection" | "details">("detection");

  const handleAnalyze = async (val?: string) => {
    const target = val ?? input;
    if (!target.trim()) return;
    setView({ kind: "loading" });
    try {
      const resp = await api.analyze({ type: "url", content: target });

      // 응답 타입 검증
      if (resp.type !== "url") {
        setView({
          kind: "error",
          errorType: "unknown",
          message: `응답 타입 불일치 (expected: url, got: ${resp.type})`,
        });
        return;
      }

      // URL 분석은 항상 success — vtVerdict 유무는 VT 영역에서만 분기 처리
      setView({ kind: "success", data: adaptUrlResult(resp) });
    } catch (e) {
      if (e instanceof ApiException) {
        let errorType: ErrorType = "unknown";
        if (e.code === "NETWORK") errorType = "network";
        else if (e.code === "MODEL_TIMEOUT") errorType = "timeout";
        else if (e.code === "INTERNAL") errorType = "server";
        setView({ kind: "error", errorType, message: e.message });
      } else {
        setView({
          kind: "error",
          errorType: "unknown",
          message: "분석 중 알 수 없는 오류가 발생했습니다.",
        });
      }
    }
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          <Link2 size={12} className="text-blue-400" />
          <span className="text-[11px] text-blue-400 tracking-wider uppercase">URL 분석</span>
        </div>
        <h1 className="text-white mb-2" style={{ fontWeight: 800, fontSize: "1.9rem", letterSpacing: "-0.02em" }}>URL 심층 분석기</h1>
        <p className="text-sm text-white/80">의심 URL의 도메인·리다이렉션·VT 보안 벤더 분석</p>
      </div>

      {/* Input */}
      <Card padding="p-4" className="mb-5">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 focus-within:border-blue-500/30 transition-all">
            <Globe size={13} className="text-white/25 shrink-0" />
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://example.com 또는 의심 URL 입력..."
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none" />
          </div>
          <button onClick={() => handleAnalyze()} disabled={!input.trim() || view.kind === "loading"}
            className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/25 transition-all disabled:opacity-40 flex items-center gap-1.5">
            {view.kind === "loading" ? <div className="w-3.5 h-3.5 border border-blue-400/30 border-t-sky-400 rounded-full animate-spin" /> : <Search size={13} />}
            분석
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
          <p className="text-[10px] text-white/25">샘플:</p>
          {SAMPLE_URLS.map((u) => (
            <button key={u} onClick={() => { setInput(u); }}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 hover:text-blue-400 hover:border-blue-500/30 transition-all font-mono truncate max-w-[180px]">
              {u}
            </button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {view.kind === "error" && (
          <ErrorState
            type={view.errorType}
            title={
              view.errorType === "timeout"
                ? "AI 서버가 준비 중입니다"
                : view.errorType === "unknown"
                ? "URL 분석에 실패했어요"
                : undefined
            }
            description={
              view.errorType === "timeout"
                ? "첫 요청 시 AI 모델을 불러오는 과정에서 30초~1분 정도 소요될 수 있습니다. 잠시 후 다시 시도해주세요."
                : view.errorType === "unknown"
                ? view.message
                : undefined
            }
            onRetry={() => handleAnalyze()}
            showHome
            onHome={() => nav("/")}
          />
        )}

        {/* 개인정보 마스킹 학습 안내 */}
        <div className="mt-6 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
          <ShieldCheck size={13} className="text-white/40 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white/50 leading-relaxed">
            <strong className="text-white/70">개인정보(전화번호, 이름, 계좌번호 등)는 자동으로 마스킹 처리된 후에만 데이터 품질 개선 목적</strong>으로 활용됩니다.
            원본 문자는 저장되지 않으며, 해당 기능은 관리자 승인 후에만 활성화됩니다.
          </p>
        </div>

        {view.kind === "loading" && (
          <motion.div
            key="loading-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#0b1120] rounded-2xl p-8 text-center"
          >
            <div className="inline-flex items-center gap-3 text-sm text-white/70">
              <div className="w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
              URL 분석 중입니다...
            </div>
          </motion.div>
        )}

        {view.kind === "success" && (
          <SuccessResultPanel
            data={view.data}
            tab={tab}
            onTabChange={setTab}
            onReport={() =>
              nav("/report", {
                state: {
                  type: "url" as const,
                  content: view.data.url,
                  url: view.data.url,
                },
              })
            }
            onReset={() => {
              setView({ kind: "idle" });
              setInput("");
              setTab("detection");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * SuccessResultPanel — vtVerdict 유무에 따라 VT 영역만 분기
 * - vtVerdict 존재 + status === "completed": VT 통계 (큰 동그라미 + 4-카드)
 * - vtVerdict 없음/실패/pending: amber 안내 카드 (분석 자체는 성공)
 */
function SuccessResultPanel({
  data,
  tab,
  onTabChange,
  onReport,
  onReset,
}: {
  data: URLResult;
  tab: "detection" | "details";
  onTabChange: (t: "detection" | "details") => void;
  onReport: () => void;
  onReset: () => void;
}) {
  const vtAvailable =
    data.vtVerdict !== undefined && data.vtVerdict.status === "completed";

  return (
    <motion.div
      key="url-result-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b1120] rounded-2xl p-4 space-y-4"
    >
      {/* URL 정보 헤더 — 정상 분석 결과 */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={14} className="text-emerald-400" />
          <p className="text-sm text-emerald-300" style={{ fontWeight: 600 }}>URL 분석 완료</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Link2 size={14} className="text-white/60" />
          <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>{data.domain}</p>
        </div>
        <p className="text-[11px] text-white/40 mt-1 break-all">{data.url}</p>
      </div>

      {/* 탭 */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {([
          { id: "detection", label: "발각", icon: Shield },
          { id: "details", label: "세부", icon: FileText },
        ] as const).map((t) => (
          <button
            key={`tab-${t.id}`}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs transition-all border-b-2 -mb-px ${
              tab === t.id
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-white/50 hover:text-white/70"
            }`}
            style={{ fontWeight: tab === t.id ? 600 : 500 }}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "detection" ? (
          <motion.div
            key="detection"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* 추가 보안 검사 (VirusTotal) */}
            <div>
              <p className="text-xs text-white/60 mb-2 flex items-center gap-1.5">
                <Shield size={11} />
                추가 보안 검사
              </p>
              {vtAvailable ? (
                <Card padding="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-blue-400" />
                      <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>VirusTotal 보안 벤더 분석</p>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">
                      {data.vtVerdict?.lastCheckedAt
                        ? new Date(data.vtVerdict.lastCheckedAt).toLocaleString("ko-KR")
                        : "방금 전"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5 items-center">
                    {(() => {
                      const v = data.vtVerdict!;
                      const total = v.malicious + v.suspicious + v.harmless + v.undetected;
                      if (total === 0) return null;
                      const cx = 80, cy = 80, ro = 70, ri = 46;
                      const segments: { value: number; color: string }[] = [
                        { value: v.malicious, color: "#ef4444" },
                        { value: v.suspicious, color: "#f97316" },
                        { value: v.harmless, color: "#22c55e" },
                        { value: v.undetected, color: "#475569" },
                      ];
                      let angle = -Math.PI / 2;
                      const slices = segments.map((s) => {
                        const sweep = (s.value / total) * 2 * Math.PI;
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
                        angle += sweep + 0.01;
                        return { ...s, path };
                      });
                      return (
                        <div className="flex justify-center">
                          <svg viewBox="0 0 160 160" className="w-[160px] h-[160px]">
                            {slices.map((s, i) => (
                              <path key={`slice-${i}-${s.color}`} d={s.path} fill={s.color} fillOpacity={0.85} />
                            ))}
                            <text x={cx} y={cy - 4} textAnchor="middle" fontSize={26} fill="white" fontWeight="700" fontFamily="system-ui,sans-serif">{v.malicious}</text>
                            <text x={cx} y={cy + 18} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.5)" fontFamily="system-ui,sans-serif">/{v.total}</text>
                          </svg>
                        </div>
                      );
                    })()}
                    <div className="space-y-2">
                      <p className="text-[11px] text-white/40 mb-1">
                        {(() => {
                          const v = data.vtVerdict!;
                          if (v.malicious > 0) {
                            return <><strong className="text-red-400">{v.malicious} / {v.total}</strong> 보안 업체에서 이 URL을 악성으로 표시했습니다.</>;
                          }
                          if (v.suspicious > 0) {
                            return <><strong className="text-amber-400">{v.suspicious} / {v.total}</strong> 보안 업체에서 이 URL을 의심 대상으로 표시했습니다.</>;
                          }
                          return <>{v.total}개 엔진 분석 결과 악성 탐지가 없습니다.</>;
                        })()}
                      </p>
                      {[
                        { label: "악성 (Malicious)", value: data.vtVerdict!.malicious, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
                        { label: "의심 (Suspicious)", value: data.vtVerdict!.suspicious, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
                        { label: "정상 (Harmless)", value: data.vtVerdict!.harmless, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
                        { label: "미분류 (Undetected)", value: data.vtVerdict!.undetected, color: "text-white/40", bg: "bg-white/5", border: "border-white/15" },
                      ].map((s, i) => (
                        <div key={`stat-${i}-${s.label}`} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${s.bg} ${s.border}`}>
                          <span className={`text-[10px] ${s.color}`} style={{ fontWeight: 700 }}>{s.label}</span>
                          <span className={`text-sm ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                /* VT 결과가 없을 때 — amber 안내 */
                <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs shrink-0" style={{ fontWeight: 700 }}>!</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-amber-800 dark:text-amber-200" style={{ fontWeight: 600 }}>
                          추가 보안 검사 정보를 불러올 수 없습니다
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300">정보 부족</span>
                      </div>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                        VirusTotal 분석 결과를 현재 사용할 수 없습니다.
                        <br />
                        URL 기본 분석 결과는 정상적으로 제공됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs" style={{ fontWeight: 700 }}>
                  !
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-amber-800 dark:text-amber-200" style={{ fontWeight: 600 }}>
                      VirusTotal API 메타 정보 미연동
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300">정직 처리</span>
                  </div>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                    카테고리·태그·HTTP 응답·서버 정보·IP/ASN·WHOIS 등록 정보·분석 이력은 VirusTotal API를 우리 백엔드가 직접 호출해서 받아와야 표시할 수 있습니다. mock에서 가짜 메타(예: 등록일 2025-11-12, IP 175.221.43.127, PHISHING 카테고리)를 만들면 정직하지 않습니다. 운영팀이 VT API key를 발급·연동하면 자동으로 적재됩니다.
                  </p>
                  <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 mt-2">
                    VT API 연동 시 표시되는 정보: 카테고리(Categories) · 태그(Tags) · HTTP Status/Type/Length/Server · IP/ASN/Country · Whois 등록일/만료일/Registrar/Email · Last Analysis Date · First Submission Date
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <button
          onClick={onReport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-all text-xs"
          style={{ fontWeight: 600 }}
        >
          <Flag size={11} /> 신고하기
        </button>
        <button onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white/80 transition-all">
          <RefreshCw size={11} /> 새 URL 분석
        </button>
      </div>
    </motion.div>
  );
}