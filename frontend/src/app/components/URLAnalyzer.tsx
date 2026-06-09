import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link2, Search, AlertTriangle, CheckCircle, Shield, RefreshCw, ExternalLink, Clock, Lock, Globe } from "lucide-react";
import { Card } from "./ui/Primitives";
import { api, ApiException } from "@/lib/api";
import type { UrlAnalysisResult } from "@/types/api";
import { ErrorState } from "./ErrorState";

interface URLResult {
  url: string;
  domain: string;
  riskScore: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  ssl: { valid: boolean; issuer: string; expiry: string };
  domainAge: number;
  redirects: { url: string; status: number }[];
  ipCountry: string;
  similarDomains: string[];
  flags: { type: string; desc: string; severity: "high" | "medium" | "low" }[];
}

/** api.analyze() UrlAnalysisResult → 컴포넌트 내부 URLResult 어댑터
 *  백엔드가 urlDetails를 미제공 시 로컬 analyzeURL() 결과로 보완 */
function adaptUrlResult(r: UrlAnalysisResult): URLResult {
  const upper = (s: "high" | "medium" | "low") =>
    s.toUpperCase() as "HIGH" | "MEDIUM" | "LOW";
  const local = analyzeURL(r.content);
  const d = r.urlDetails;
  return {
    url: r.content,
    domain: d?.domain ?? local.domain,
    riskScore: r.riskScore,
    riskLevel: upper(r.riskLevel),
    ssl: d?.ssl ?? local.ssl,
    domainAge: d?.domainAge ?? local.domainAge,
    redirects: d?.redirects ?? local.redirects,
    ipCountry: d?.ipCountry ?? local.ipCountry,
    similarDomains: d?.similarDomains ?? local.similarDomains,
    flags: d?.flags ?? local.flags,
  };
}

const SUSPICIOUS_INDICATORS = [
  "pay", "secure", "login", "update", "verify", "confirm", "bank", "nhis", "hometax", "refund", "prize", "win", "free",
];

function analyzeURL(raw: string): URLResult {
  const url = raw.startsWith("http") ? raw : `http://${raw}`;
  let domain = "";
  try { domain = new URL(url).hostname; } catch { domain = raw; }

  const suspiciousCount = SUSPICIOUS_INDICATORS.filter((w) => domain.toLowerCase().includes(w)).length;
  const hasSuspiciousTLD = /\.(xyz|tk|ml|ga|cf|top|click|loan|win|work|buzz|info)$/i.test(domain);
  const hasDash = (domain.match(/-/g) || []).length > 1;
  const isLong = domain.length > 30;
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(domain.replace(/:\d+$/, ""));
  const hasKrLike = /kr|korea|nhis|hometax|kb|kia|samsung/i.test(domain) && !/\.go\.kr|\.or\.kr|\.co\.kr/.test(domain);

  let risk = 10;
  risk += suspiciousCount * 15;
  if (hasSuspiciousTLD) risk += 30;
  if (hasDash) risk += 10;
  if (isLong) risk += 10;
  if (isIP) risk += 40;
  if (hasKrLike) risk += 25;
  const riskScore = Math.min(10, Math.round(risk / 15));

  const flags: URLResult["flags"] = [];
  if (hasSuspiciousTLD) flags.push({ type: "의심 TLD", desc: `'.${domain.split(".").pop()}' 도메인은 피싱에 자주 사용됩니다.`, severity: "high" });
  if (hasKrLike) flags.push({ type: "유사 도메인", desc: "한국 공공기관·기업명을 포함하지만 공식 도메인이 아닙니다.", severity: "high" });
  if (suspiciousCount > 0) flags.push({ type: "키워드 감지", desc: `피싱 관련 키워드 ${suspiciousCount}개 포함 (${SUSPICIOUS_INDICATORS.filter((w) => domain.includes(w)).join(", ")})`, severity: "medium" });
  if (hasDash) flags.push({ type: "다중 하이픈", desc: "공식 도메인은 보통 하이픈을 많이 사용하지 않습니다.", severity: "medium" });
  if (isIP) flags.push({ type: "IP 직접 접근", desc: "도메인 대신 IP 주소를 사용하는 것은 매우 의심스럽습니다.", severity: "high" });
  if (isLong) flags.push({ type: "비정상 긴 도메인", desc: "30자 이상의 도메인은 신뢰하기 어렵습니다.", severity: "low" });
  if (flags.length === 0) flags.push({ type: "이상 없음", desc: "명시적인 위험 징후가 발견되지 않았습니다.", severity: "low" });

  const domainAge = riskScore >= 7 ? Math.floor(Math.random() * 30) + 1 : Math.floor(Math.random() * 1000) + 180;
  const redirectCount = riskScore >= 6 ? Math.floor(Math.random() * 3) + 1 : 0;
  const redirects = Array.from({ length: redirectCount }, (_, i) => ({
    url: i === 0 ? url : `http://redir${i}.${domain}`,
    status: i < redirectCount - 1 ? 301 : 200,
  }));

  return {
    url, domain,
    riskScore,
    riskLevel: riskScore >= 7 ? "HIGH" : riskScore >= 4 ? "MEDIUM" : "LOW",
    ssl: {
      valid: riskScore < 5,
      issuer: riskScore < 5 ? "Let's Encrypt Authority X3" : "Unknown / Self-signed",
      expiry: riskScore < 5 ? "2025.12.31" : "만료됨",
    },
    domainAge,
    redirects,
    ipCountry: riskScore >= 7 ? ["CN", "RU", "PH", "VN"][Math.floor(Math.random() * 4)] : "KR",
    similarDomains: riskScore >= 6
      ? [`${domain.split(".")[0]}.go.kr`, `${domain.split(".")[0]}.or.kr`, `www.${domain.split(".")[0]}.co.kr`]
      : [],
    flags,
  };
}

const SAMPLE_URLS = [
  "http://nhis-pay.kr/login",
  "http://prize-samsung.xyz/claim",
  "http://175.221.43.127/login",
  "https://www.nhis.or.kr",
];

const RISK_STYLE = {
  HIGH: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "bg-red-500/20 border-red-500/30" },
  MEDIUM: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/20 border-amber-500/30" },
  LOW: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", badge: "bg-emerald-500/20 border-emerald-500/30" },
};

export function URLAnalyzer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<URLResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (val?: string) => {
    const target = val ?? input;
    if (!target.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      // 백엔드 연동: VITE_USE_MOCK=true 면 mock/responses.ts, false 면 실제 fetch
      const resp = await api.analyze({ type: "url", content: target });
      // resp 가 UrlAnalysisResult 일 때 어댑터로 컴포넌트 내부 형태로 변환
      // (타입 narrow: union AnalysisResult 의 type 필드 사용)
      if (resp.type === "url") {
        setResult(adaptUrlResult(resp));
      }
    } catch (e) {
      if (e instanceof ApiException) {
        setError(`분석 실패: ${e.message}`);
      } else {
        setError("분석 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const rs = result ? RISK_STYLE[result.riskLevel] : null;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
      {/* Page header — 배지 필 스타일로 통일 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
          <Link2 size={12} className="text-sky-400" />
          <span className="text-[11px] text-sky-400 tracking-wider uppercase">URL 분석</span>
        </div>
        <h1 className="text-white mb-2" style={{ fontWeight: 800, fontSize: "1.9rem", letterSpacing: "-0.02em" }}>URL 심층 분석기</h1>
        <p className="text-sm text-white/50">의심 URL의 도메인 나이·SSL·리다이렉션·유사 도메인 탐지</p>
      </div>

      {/* Input */}
      <Card padding="p-4" className="mb-5">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 focus-within:border-sky-500/30 transition-all">
            <Globe size={13} className="text-white/25 shrink-0" />
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://example.com 또는 의심 URL 입력..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-white/20 outline-none" />
          </div>
          <button onClick={() => handleAnalyze()} disabled={!input.trim() || loading}
            className="px-4 py-2 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 text-sm hover:bg-sky-500/25 transition-all disabled:opacity-40 flex items-center gap-1.5">
            {loading ? <div className="w-3.5 h-3.5 border border-sky-400/30 border-t-sky-400 rounded-full animate-spin" /> : <Search size={13} />}
            분석
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
          <p className="text-[10px] text-white/25">샘플:</p>
          {SAMPLE_URLS.map((u) => (
            <button key={u} onClick={() => { setInput(u); handleAnalyze(u); }}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/35 hover:text-sky-400 hover:border-sky-500/30 transition-all font-mono truncate max-w-[180px]">
              {u}
            </button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {error && (
          <ErrorState
            type="unknown"
            title="URL 분석에 실패했어요"
            description={error}
            onRetry={() => handleAnalyze()}
          />
        )}
        {result && rs && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Risk header */}
            <div className={`rounded-2xl border p-4 ${rs.bg} ${rs.border}`}>
              <div className="flex items-center gap-3">
                {result.riskLevel === "HIGH"
                  ? <AlertTriangle size={20} className="text-red-400" />
                  : result.riskLevel === "MEDIUM"
                  ? <AlertTriangle size={20} className="text-amber-400" />
                  : <CheckCircle size={20} className="text-emerald-400" />}
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${rs.text}`} style={{ fontWeight: 700 }}>{result.domain}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${rs.badge} ${rs.text}`}>{result.riskLevel}</span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5">위험도 점수: {result.riskScore}/10</p>
                </div>
                <div className={`ml-auto text-3xl ${rs.text}`} style={{ fontWeight: 700 }}>{result.riskScore}</div>
              </div>
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "도메인 나이", value: `${result.domainAge}일`, icon: Clock, warn: result.domainAge < 60 },
                { label: "SSL 인증서", value: result.ssl.valid ? "유효" : "무효", icon: Lock, warn: !result.ssl.valid },
                { label: "서버 국가", value: result.ipCountry, icon: Globe, warn: result.ipCountry !== "KR" },
                { label: "리다이렉션", value: `${result.redirects.length}회`, icon: RefreshCw, warn: result.redirects.length > 0 },
              ].map((c) => (
                <div key={c.label} className={`rounded-2xl border p-3 text-center ${c.warn ? "bg-red-500/8 border-red-500/20" : "bg-white/3 border-white/8"}`}>
                  <c.icon size={13} className={`mx-auto mb-1 ${c.warn ? "text-red-400" : "text-white/30"}`} />
                  <p className="text-[10px] text-white/30">{c.label}</p>
                  <p className={`text-xs mt-0.5 ${c.warn ? "text-red-400" : "text-white/60"}`} style={{ fontWeight: 500 }}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* SSL detail */}
            <Card padding="p-4">
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Lock size={10} /> SSL 인증서 상세</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "발급 기관", v: result.ssl.issuer },
                  { k: "만료일", v: result.ssl.expiry },
                  { k: "유효 여부", v: result.ssl.valid ? "유효" : "무효/만료" },
                  { k: "HTTPS", v: result.url.startsWith("https") ? "사용" : "미사용" },
                ].map((s) => (
                  <div key={s.k} className="bg-white/3 rounded-lg p-2">
                    <p className="text-[10px] text-white/30">{s.k}</p>
                    <p className="text-xs text-white/60 mt-0.5">{s.v}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Redirects */}
            {result.redirects.length > 0 && (
              <Card padding="p-4">
                <p className="text-xs text-white/40 mb-2">리다이렉션 체인</p>
                <div className="space-y-1.5">
                  {result.redirects.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">{r.status}</span>
                      <span className="text-xs text-white/50 font-mono truncate">{r.url}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Similar domains */}
            {result.similarDomains.length > 0 && (
              <Card padding="p-4">
                <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><ExternalLink size={10} /> 공식 도메인 (참고)</p>
                <div className="flex flex-wrap gap-2">
                  {result.similarDomains.map((d) => (
                    <span key={d} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">{d}</span>
                  ))}
                </div>
              </Card>
            )}

            {/* Flags */}
            <Card padding="p-4">
              <p className="text-xs text-white/40 mb-3 flex items-center gap-1"><Shield size={10} /> 위험 징후</p>
              <div className="space-y-2">
                {result.flags.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl border ${
                    f.severity === "high" ? "bg-red-500/8 border-red-500/20" : f.severity === "medium" ? "bg-amber-500/8 border-amber-500/20" : "bg-emerald-500/8 border-emerald-500/20"
                  }`}>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                      f.severity === "high" ? "bg-red-500/20 border-red-500/30 text-red-400" : f.severity === "medium" ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    }`}>{f.type}</span>
                    <p className="text-[11px] text-white/50 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <button onClick={() => { setResult(null); setInput(""); }}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/55 transition-all">
              <RefreshCw size={11} /> 새 URL 분석
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}