import {useState} from "react";
import {useNavigate} from "react-router";
import {motion, AnimatePresence} from "motion/react";
import {Link2, Search, ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Globe, Flag} from "lucide-react";
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
  riskLevel: "high" | "medium" | "low";
  riskScore: number;
  reasons: { label: string; severity: string }[];
}

function adaptUrlResult(r: UrlAnalysisResult): URLResult {
  return {
    url: r.content,
    domain: r.urlDetails.domain,
    riskLevel: r.riskLevel,
    riskScore: r.riskScore,
    reasons: r.reasons.map((x) => ({ label: x.label, severity: x.severity })),
  };
}

const RISK_CONFIG = {
  high:   { label: "위험", color: "text-red-400",    border: "border-red-500/20",    bg: "bg-red-500/5",    Icon: ShieldX },
  medium: { label: "주의", color: "text-amber-400",  border: "border-amber-500/20",  bg: "bg-amber-500/5",  Icon: ShieldAlert },
  low:    { label: "안전", color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", Icon: ShieldCheck },
} as const;

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
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SuccessResultPanel({
  data,
  onReport,
  onReset,
}: {
  data: URLResult;
  onReport: () => void;
  onReset: () => void;
}) {
  const cfg = RISK_CONFIG[data.riskLevel];
  const { Icon } = cfg;

  return (
    <motion.div
      key="url-result-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b1120] rounded-2xl p-4 space-y-4"
    >
      {/* 위험도 헤더 */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon size={14} className={cfg.color} />
            <p className={`text-sm ${cfg.color}`} style={{ fontWeight: 600 }}>
              {cfg.label} — URL 분석 완료
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color}`} style={{ fontWeight: 700 }}>
            위험도 {data.riskScore}점
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Link2 size={13} className="text-white/50" />
          <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>{data.domain}</p>
        </div>
        <p className="text-[11px] text-white/40 mt-1 break-all">{data.url}</p>
      </div>

      {/* 탐지 이유 */}
      {data.reasons.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-white/40 mb-1">탐지 근거</p>
          {data.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8">
              <span className={`mt-0.5 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                r.severity === "high" ? "text-red-400 border-red-500/30 bg-red-500/10" :
                r.severity === "medium" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                "text-slate-400 border-white/10 bg-white/5"
              }`} style={{ fontWeight: 700 }}>{r.severity}</span>
              <p className="text-xs text-white/70 flex-1">{r.label}</p>
            </div>
          ))}
        </div>
      )}

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