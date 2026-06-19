import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Search, AlertTriangle, CheckCircle, Clock, Flag, RefreshCw } from "lucide-react";
import { Card } from "./ui/Primitives";
import { ErrorState } from "./ErrorState";
import { api, ApiException } from "@/lib/api";

interface SenderResult {
  number: string;
  trustScore: number;
  status: "위험" | "주의" | "안전" | "알 수 없음";
  reportCount: number;
  lastSeen: string;
  categories: string[];
  history: { date: string; type: string; count: number }[];
  isp: string;
  region: string;
}

const KNOWN: Record<string, Partial<SenderResult>> = {
  "010-8821-3947": { trustScore: 1, status: "위험", reportCount: 342, categories: ["공공기관 사칭", "보험 피싱"], isp: "KT", region: "서울" },
  "010-3392-1847": { trustScore: 2, status: "위험", reportCount: 218, categories: ["보이스피싱", "기관 사칭"], isp: "SKT", region: "경기" },
  "010-5571-2938": { trustScore: 3, status: "위험", reportCount: 156, categories: ["대출 사기"], isp: "LGU+", region: "부산" },
  "02-1234-5678": { trustScore: 8, status: "안전", reportCount: 0, categories: [], isp: "KT", region: "서울" },
  "1588-1234": { trustScore: 9, status: "안전", reportCount: 0, categories: [], isp: "SKT", region: "서울" },
};

function mockLookup(number: string): SenderResult {
  const known = KNOWN[number];
  const trustScore = known?.trustScore ?? (Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 5 : Math.floor(Math.random() * 3) + 1);
  const status: SenderResult["status"] = trustScore >= 7 ? "안전" : trustScore >= 5 ? "주의" : trustScore >= 3 ? "위험" : "위험";
  const reportCount = known?.reportCount ?? (trustScore < 5 ? Math.floor(Math.random() * 200) + 10 : 0);
  const now = new Date();
  const history = trustScore < 5
    ? Array.from({ length: 5 }, (_, i) => ({
        date: new Date(now.getTime() - i * 7 * 24 * 3600 * 1000).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        type: ["공공기관 사칭", "금융 피싱", "대출 사기", "이벤트 사기"][Math.floor(Math.random() * 4)],
        count: Math.floor(Math.random() * 50) + 5,
      }))
    : [];
  return {
    number,
    trustScore,
    status,
    reportCount,
    lastSeen: reportCount > 0 ? "2025.04.28" : "-",
    categories: known?.categories ?? (trustScore < 5 ? ["금융 피싱"] : []),
    history,
    isp: known?.isp ?? ["SKT", "KT", "LGU+"][Math.floor(Math.random() * 3)],
    region: known?.region ?? ["서울", "경기", "부산", "인천"][Math.floor(Math.random() * 4)],
  };
}

const STATUS_STYLE = {
  위험: { bg: "bg-red-500/10", border: "border-red-500/25", text: "text-red-400", icon: AlertTriangle, score: "text-red-400" },
  주의: { bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400", icon: AlertTriangle, score: "text-amber-400" },
  안전: { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", icon: CheckCircle, score: "text-emerald-400" },
  "알 수 없음": { bg: "bg-white/5", border: "border-white/15", text: "text-white/50", icon: Clock, score: "text-white/50" },
};

const SAMPLES = ["010-8821-3947", "010-3392-1847", "1588-1234", "010-5571-2938"];

export function SenderLookup() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SenderResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STATUS_MAP: Record<string, SenderResult["status"]> = {
    danger: "위험", caution: "주의", safe: "안전", unknown: "알 수 없음",
  };

  const handleSearch = async (val?: string) => {
    const target = (val ?? input).trim();
    if (!target) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await api.lookupSender(target);
      setResult({
        number: data.number,
        trustScore: data.trustScore === 0 ? 1 : data.trustScore === 100 ? 9 : data.trustScore,
        status: STATUS_MAP[data.status] ?? "알 수 없음",
        reportCount: data.reportCount,
        lastSeen: data.lastReportedAt ? new Date(data.lastReportedAt).toLocaleDateString("ko-KR") : "-",
        categories: data.categories,
        history: data.history,
        isp: data.isp,
        region: data.region,
      });
    } catch (e) {
      if (e instanceof ApiException) {
        console.error("[SenderLookup] API 실패, mock fallback:", e.message);
      }
      setResult(mockLookup(target));
    } finally {
      setLoading(false);
    }
  };

  const ss = result ? STATUS_STYLE[result.status] : null;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      {/* Page header — 배지 필 스타일로 통일 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
          <Phone size={12} className="text-rose-400" />
          <span className="text-[11px] text-rose-400 tracking-wider uppercase">발신자 조회</span>
        </div>
        <h1 className="text-white mb-2" style={{ fontWeight: 800, fontSize: "1.9rem", letterSpacing: "-0.02em" }}>발신번호 신뢰도 조회</h1>
        <p className="text-sm text-white/50">번호별 신고 이력, 신뢰 점수, 피싱 카테고리를 확인합니다.</p>
      </div>

      {/* Search */}
      <Card padding="p-4" className="mb-5">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 focus-within:border-rose-500/30 transition-all">
            <Phone size={12} className="text-white/25 shrink-0" />
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="010-0000-0000 또는 발신번호 입력..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-white/20 outline-none" />
          </div>
          <button onClick={() => handleSearch()} disabled={!input.trim() || loading}
            className="px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm hover:bg-rose-500/25 transition-all disabled:opacity-40 flex items-center gap-1.5">
            {loading ? <div className="w-3.5 h-3.5 border border-rose-400/30 border-t-rose-400 rounded-full animate-spin" /> : <Search size={13} />}
            조회
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
          <p className="text-[10px] text-white/25">샘플:</p>
          {SAMPLES.map((s) => (
            <button key={s} onClick={() => { setInput(s); handleSearch(s); }}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/35 hover:text-rose-400 hover:border-rose-500/25 transition-all font-mono">
              {s}
            </button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {error && (
          <ErrorState
            type="unknown"
            title="발신번호 조회에 실패했어요"
            description={error}
            onRetry={() => handleSearch()}
          />
        )}
        {result && ss && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Status banner */}
            <div className={`rounded-2xl border p-4 ${ss.bg} ${ss.border}`}>
              <div className="flex items-center gap-3">
                <ss.icon size={22} className={ss.text} />
                <div>
                  <p className="text-white/80 font-mono" style={{ fontWeight: 600 }}>{result.number}</p>
                  <p className={`text-sm ${ss.text}`} style={{ fontWeight: 700 }}>{result.status}</p>
                </div>
                <div className="ml-auto text-center">
                  <p className={`text-3xl ${ss.score}`} style={{ fontWeight: 800 }}>{result.trustScore}</p>
                  <p className="text-[10px] text-white/30">신뢰 점수</p>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "신고 건수", value: result.reportCount > 0 ? `${result.reportCount}건` : "없음" },
                { label: "마지막 신고", value: result.lastSeen },
                { label: "통신사", value: result.isp },
                { label: "추정 지역", value: result.region },
              ].map((s) => (
                <Card key={s.label} padding="p-3" className="text-center">
                  <p className="text-[10px] text-white/30">{s.label}</p>
                  <p className="text-xs text-white/70 mt-0.5" style={{ fontWeight: 500 }}>{s.value}</p>
                </Card>
              ))}
            </div>

            {/* Categories */}
            {result.categories.length > 0 && (
              <Card padding="p-4">
                <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Flag size={10} /> 신고 카테고리</p>
                <div className="flex flex-wrap gap-2">
                  {result.categories.map((c) => (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{c}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* History */}
            {result.history.length > 0 && (
              <Card padding="p-4">
                <p className="text-xs text-white/40 mb-3 flex items-center gap-1"><Clock size={10} /> 신고 이력</p>
                <div className="space-y-2">
                  {result.history.map((h, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] text-white/25 w-16 shrink-0">{h.date}</span>
                      <span className="text-xs text-white/55 flex-1">{h.type}</span>
                      <span className="text-[11px] text-red-400">{h.count}건</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Trust score gauge */}
            <Card padding="p-4">
              <p className="text-xs text-white/40 mb-3">신뢰 점수 척도</p>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`flex-1 ${i < result.trustScore
                    ? result.trustScore <= 3 ? "bg-red-500" : result.trustScore <= 6 ? "bg-amber-500" : "bg-emerald-500"
                    : "bg-white/8"} ${i === 0 ? "rounded-l-full" : ""} ${i === 9 ? "rounded-r-full" : ""}`}
                    style={{ opacity: i < result.trustScore ? 0.7 + i * 0.03 : 1 }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-white/20 mt-1">
                <span>위험 (1)</span><span>주의 (5)</span><span>안전 (10)</span>
              </div>
            </Card>

            <button onClick={() => { setResult(null); setInput(""); }}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-all">
              <RefreshCw size={11} /> 다른 번호 조회
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}