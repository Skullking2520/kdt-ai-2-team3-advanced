import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileDown, Printer, Scan, ShieldAlert, AlertTriangle, ShieldCheck,
  CheckCircle2, XCircle, Phone, FileText, Calendar, Hash,
  Download, RefreshCw,
} from "lucide-react";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface ReportData {
  id: string;
  timestamp: string;
  sender: string;
  message: string;
  riskLevel: RiskLevel;
  score: number;
  reasons: string[];
  keywords: string[];
  modelVersion: string;
  recommendation: string;
}

const riskCfg = {
  HIGH: {
    icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25",
    label: "고위험 — 즉시 삭제 권고", printColor: "#ef4444",
  },
  MEDIUM: {
    icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25",
    label: "주의 — 발신자 확인 필요", printColor: "#f97316",
  },
  LOW: {
    icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25",
    label: "정상 — 안전한 문자로 판단", printColor: "#22c55e",
  },
};

function analyze(sender: string, text: string): ReportData {
  const urgentWords = ["즉시", "긴급", "정지", "동결", "납부", "미납", "경고", "차단", "만료", "혐의", "출석", "소멸", "탕감", "당첨"];
  const suspiciousUrlPatterns = [".xyz", "-secure.", "re-delivery", "cash-back", "inquiry-kr", "gov-support", "prize-"];
  const govEntities = ["국민건강보험", "KB국민은행", "경찰청", "국세청", "금융감독원", "CJ대한통운"];

  const urlMatch = text.match(/https?:\/\/[^\s]+/g) ?? [];
  const foundUrls = urlMatch;
  const foundUrgent = urgentWords.filter((w) => text.includes(w));
  const hasSuspiciousUrl = foundUrls.some((u) => suspiciousUrlPatterns.some((p) => u.includes(p)));
  const impersonation = govEntities.some((e) => text.includes(e)) && foundUrls.length > 0;

  const keywords: string[] = [...foundUrgent, ...foundUrls];
  const reasons: string[] = [];
  let score = 1;

  if (impersonation) { score += 3; reasons.push("공공기관 또는 금융기관 사칭 패턴 감지"); }
  if (hasSuspiciousUrl) { score += 3; reasons.push("의심스러운 URL 패턴 탐지 (비공식 도메인)"); }
  if (foundUrgent.length >= 2) { score += 2; reasons.push(`긴급성 표현 다중 사용 (${foundUrgent.slice(0, 3).join(", ")})`); }
  if (foundUrls.length > 0 && !hasSuspiciousUrl) { score += 1; reasons.push("URL 포함 — 도메인 확인 권장"); }
  if (score <= 2) reasons.push("정상 패턴으로 분류됨 — 주요 위험 지표 미탐지");

  score = Math.min(10, Math.max(1, score));
  const riskLevel: RiskLevel = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";

  const recommendations: Record<RiskLevel, string> = {
    HIGH: "즉시 문자를 삭제하고 발신 번호를 차단하세요. 포함된 URL은 절대 클릭하지 마세요. 금융 정보를 이미 입력했다면 해당 기관에 즉시 연락하세요.",
    MEDIUM: "발신 기관의 공식 번호로 직접 전화해 사실 여부를 확인하세요. URL 클릭은 자제하고 공식 앱 또는 웹사이트를 이용하세요.",
    LOW: "특이 사항이 발견되지 않았으나, 개인정보 요구 시 공식 채널을 통해 확인하는 습관을 유지하세요.",
  };

  return {
    id: `RPT-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toLocaleString("ko-KR"),
    sender: sender || "알 수 없음",
    message: text,
    riskLevel,
    score,
    reasons,
    keywords,
    modelVersion: "모델 미정 (v1.0.3)",
    recommendation: recommendations[riskLevel],
  };
}

function ScoreGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "#ef4444" : score >= 4 ? "#f97316" : "#22c55e";
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="-mt-16 flex flex-col items-center">
        <span style={{ color, fontWeight: 700, fontSize: "1.6rem" }}>{score}</span>
        <span className="text-[10px] text-white/30">/10</span>
      </div>
    </div>
  );
}

export function ReportExport() {
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = () => {
    if (!message.trim()) return;
    setAnalyzing(true);
    setReport(null);
    setTimeout(() => {
      setReport(analyze(sender, message));
      setAnalyzing(false);
    }, 1600);
  };

  const handleReset = () => { setSender(""); setMessage(""); setReport(null); };

  const handlePrint = () => window.print();

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cfg = report ? riskCfg[report.riskLevel] : null;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FileDown size={14} className="text-teal-400" />
          <span className="text-xs text-teal-400 tracking-widest uppercase">리포트 생성</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>분석 리포트 내보내기</h1>
        <p className="text-sm text-white/40">문자를 분석하고 결과를 PDF 또는 JSON으로 내보내세요.</p>
      </div>

      {/* Input form */}
      {!report && (
        <div className="space-y-4 mb-6">
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <label className="flex items-center gap-2 text-xs text-white/40 mb-2"><Phone size={11} /> 발신자</label>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="010-1234-5678 또는 기관명"
              className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
            />
          </div>
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <label className="flex items-center gap-2 text-xs text-white/40 mb-2"><FileText size={11} /> 문자 내용 *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="분석할 문자 내용을 붙여넣으세요..."
              rows={5}
              className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none resize-none"
            />
            <p className="text-[11px] text-white/25 mt-2 pt-2 border-t border-white/5">{message.length}자</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!message.trim() || analyzing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
          >
            {analyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Scan size={14} />}
            {analyzing ? "AI 분석 중..." : "분석 & 리포트 생성"}
          </button>
        </div>
      )}

      {/* Report */}
      <AnimatePresence>
        {report && cfg && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Action buttons */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">리포트 미리보기</p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white/70 transition-all"
                >
                  <RefreshCw size={11} /> 재분석
                </button>
                <button
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500/15 border border-teal-500/25 text-teal-400 text-xs hover:bg-teal-500/20 transition-all"
                >
                  <Download size={11} /> JSON
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white/70 text-xs hover:bg-white/15 transition-all"
                >
                  <Printer size={11} /> PDF 저장
                </button>
              </div>
            </div>

            {/* Report card */}
            <div ref={reportRef} className="bg-[#111c30] border border-white/10 rounded-2xl overflow-hidden print:bg-white print:text-black">
              {/* Report header */}
              <div className={`px-6 py-5 ${cfg.bg} border-b ${cfg.border}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-white/40 mb-1">NewBiz Shield — 스미싱 탐지 시스템</p>
                    <h2 className="text-white" style={{ fontWeight: 700, fontSize: "1.1rem" }}>피싱 분석 공식 리포트</h2>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-white/40">
                        <Hash size={10} /> {report.id}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-white/40">
                        <Calendar size={10} /> {report.timestamp}
                      </span>
                    </div>
                  </div>
                  <ScoreGauge score={report.score} />
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Risk verdict */}
                <div className={`flex items-center gap-3 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                  <cfg.icon size={22} className={cfg.color} />
                  <div>
                    <p className={`text-sm ${cfg.color}`} style={{ fontWeight: 600 }}>{cfg.label}</p>
                    <p className="text-xs text-white/50 mt-0.5">위험도 점수: {report.score}/10 | 등급: {report.riskLevel}</p>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "발신자", value: report.sender },
                    { label: "AI 모델", value: report.modelVersion },
                    { label: "문자 길이", value: `${report.message.length}자` },
                    { label: "탐지 키워드", value: `${report.keywords.length}개` },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/3 rounded-lg p-3">
                      <p className="text-[10px] text-white/30 mb-0.5">{m.label}</p>
                      <p className="text-xs text-white/70 truncate">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Original message */}
                <div>
                  <p className="text-[11px] text-white/30 mb-2">원문 메시지</p>
                  <div className="bg-[#0b1120] border border-white/8 rounded-xl p-4">
                    <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{report.message}</p>
                  </div>
                </div>

                {/* Detection reasons */}
                <div>
                  <p className="text-[11px] text-white/30 mb-2">판단 근거</p>
                  <div className="space-y-2">
                    {report.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {report.riskLevel === "LOW"
                          ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                          : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                        }
                        <p className="text-xs text-white/60">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                {report.keywords.length > 0 && (
                  <div>
                    <p className="text-[11px] text-white/30 mb-2">위험 토큰</p>
                    <div className="flex flex-wrap gap-2">
                      {report.keywords.map((k, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono break-all">{k}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                  <p className="text-[10px] text-blue-400/60 mb-1.5">권장 조치</p>
                  <p className="text-xs text-white/60 leading-relaxed">{report.recommendation}</p>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/8 flex items-center justify-between">
                  <p className="text-[10px] text-white/25">본 리포트는 AI 분석 결과이며 법적 효력이 없습니다.</p>
                  <p className="text-[10px] text-white/25">NewBiz Team · 2025</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print\\:bg-white { display: block !important; background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
