import {useState} from "react";
import {motion, AnimatePresence} from "motion/react";
import {
Smartphone,
ShieldAlert,
ShieldCheck,
AlertTriangle,
Scan,
ChevronLeft,
Phone,
MessageSquare,
Wifi,
Battery,
Signal,

} from "lucide-react";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface SMSMessage {
  id: string;
  sender: string;
  preview: string;
  fullText: string;
  time: string;
  read: boolean;
  result?: {
    riskLevel: RiskLevel;
    score: number;
    reasons: string[];
    keywords: string[];
  };
  scanning?: boolean;
}

const INITIAL_MESSAGES: SMSMessage[] = [
  {
    id: "m1",
    sender: "국민건강보험공단",
    preview: "【국민건강보험】미납보험료가 있습니다. 즉시 납부하지...",
    fullText: "【국민건강보험】미납보험료가 있습니다. 즉시 납부하지 않으면 급여가 정지될 수 있습니다.\n\n납부하기: http://nhis-pay.kr-notice.com/pay",
    time: "오후 2:34",
    read: false,
  },
  {
    id: "m2",
    sender: "카카오",
    preview: "카카오 인증번호는 [394821]입니다. 타인에게...",
    fullText: "카카오 인증번호는 [394821]입니다. 타인에게 절대 알려주지 마세요.",
    time: "오후 1:12",
    read: true,
  },
  {
    id: "m3",
    sender: "010-5839-2847",
    preview: "[CJ대한통운] 고객님의 택배가 주소불명으로...",
    fullText: "[CJ대한통운] 고객님의 택배가 주소불명으로 반송될 예정입니다. 주소 확인 후 재배송 요청 바랍니다.\n\nhttp://cjlogistics.re-delivery.net/confirm",
    time: "오전 11:08",
    read: true,
  },
  {
    id: "m4",
    sender: "KB국민은행",
    preview: "【KB국민은행】 고객님의 계좌에서 비정상 접근이...",
    fullText: "【KB국민은행】 고객님의 계좌에서 비정상 접근이 감지되었습니다.\n\n24시간 이내에 본인 확인을 완료하지 않으면 계좌가 동결됩니다.\n\n확인: http://kbbank-secure.com/verify",
    time: "오전 9:45",
    read: false,
  },
  {
    id: "m5",
    sender: "SKT",
    preview: "[SKT] 5월 이용요금이 청구되었습니다. 확인: 114...",
    fullText: "[SKT] 고객님의 5월 이용요금 32,000원이 청구되었습니다.\n상세 내용은 114 또는 T world 앱에서 확인하세요.",
    time: "어제",
    read: true,
  },
  {
    id: "m6",
    sender: "이벤트팀",
    preview: "[이벤트당첨] 축하합니다! 갤럭시S24 특별 추첨에...",
    fullText: "[이벤트당첨] 축하합니다! 고객님이 갤럭시S24 특별 추첨에 당첨되셨습니다.\n\n48시간 내 수령신청: http://prize-claim.xyz/win",
    time: "어제",
    read: true,
  },
];

function analyzeMessage(text: string): SMSMessage["result"] {
  const urgentWords = ["즉시", "정지", "동결", "납부", "미납", "비정상", "24시간", "48시간", "차단"];
  const suspiciousUrls = [".kr-", "re-delivery", "-secure.", "prize-claim", ".xyz"];
  const hasUrl = /https?:\/\/[^\s]+/.test(text);
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const url = urlMatch?.[0] ?? "";

  const foundKeywords = urgentWords.filter((k) => text.includes(k));
  const hasSuspiciousUrl = suspiciousUrls.some((p) => url.toLowerCase().includes(p));
  const impersonation =
    (text.includes("국민건강보험") && !url.includes("nhis.or.kr")) ||
    (text.includes("KB국민은행") && !url.includes("kbstar.com")) ||
    (text.includes("CJ대한통운") && !url.includes("cjlogistics.com"));

  let score = 1;
  const reasons: string[] = [];
  const keywords: string[] = [...foundKeywords];

  if (impersonation) { score += 3; reasons.push("공공기관/금융기관 사칭"); }
  if (hasSuspiciousUrl) { score += 3; reasons.push("의심스러운 URL 포함"); keywords.push(url); }
  if (foundKeywords.length >= 2) { score += 2; reasons.push("긴급성 표현 과다 사용"); }
  if (!hasUrl && !impersonation && foundKeywords.length === 0) {
    reasons.push("정상 패턴으로 판단됨");
  }

  score = Math.min(10, Math.max(1, score));
  const riskLevel: RiskLevel = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";

  return { riskLevel, score, reasons, keywords };
}

const riskCfg = {
  HIGH: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25", badge: "bg-red-500/20 text-red-400 border border-red-500/30" },
  MEDIUM: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/25", badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  LOW: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25", badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
};

export function SMSSimulator() {
  const [messages, setMessages] = useState<SMSMessage[]>(INITIAL_MESSAGES);
  const [selected, setSelected] = useState<SMSMessage | null>(null);
  const [scanAll, setScanAll] = useState(false);

  const scannedCount = messages.filter((m) => m.result).length;
  const highCount = messages.filter((m) => m.result?.riskLevel === "HIGH").length;

  const handleSelect = (msg: SMSMessage) => {
    setSelected(messages.find((m) => m.id === msg.id) ?? msg);
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, read: true } : m));
  };

  const handleScan = (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, scanning: true } : m));
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== id) return m;
        const result = analyzeMessage(m.fullText);
        const updated = { ...m, scanning: false, result };
        if (selected?.id === id) setSelected(updated);
        return updated;
      }));
    }, 1400);
  };

  const handleScanAll = () => {
    setScanAll(true);
    const unscanned = messages.filter((m) => !m.result && !m.scanning);
    unscanned.forEach((msg, i) => {
      setTimeout(() => handleScan(msg.id), i * 600);
    });
    setTimeout(() => setScanAll(false), unscanned.length * 600 + 1500);
  };

  const currentMsg = selected ? messages.find((m) => m.id === selected.id) ?? selected : null;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={14} className="text-indigo-400" />
          <span className="text-xs text-indigo-400 tracking-widest uppercase">인터랙티브 데모</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>SMS 스미싱 시뮬레이터</h1>
            <p className="text-sm text-white/40">실제 수신함처럼 문자를 열어보고 AI로 스캔해 보세요.</p>
          </div>
          <button
            onClick={handleScanAll}
            disabled={scanAll || messages.every((m) => m.result)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-sm hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {scanAll ? (
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <Scan size={14} />
            )}
            전체 스캔
          </button>
        </div>
      </div>

      {/* Summary */}
      {scannedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
            <p className="text-white/60" style={{ fontWeight: 700, fontSize: "1.25rem" }}>{scannedCount}</p>
            <p className="text-[11px] text-white/30">스캔 완료</p>
          </div>
          <div className="bg-[#111c30] border border-red-500/15 rounded-xl p-3 text-center">
            <p className="text-red-400" style={{ fontWeight: 700, fontSize: "1.25rem" }}>{highCount}</p>
            <p className="text-[11px] text-white/30">HIGH 위험</p>
          </div>
          <div className="bg-[#111c30] border border-emerald-500/15 rounded-xl p-3 text-center">
            <p className="text-emerald-400" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
              {messages.filter((m) => m.result?.riskLevel === "LOW").length}
            </p>
            <p className="text-[11px] text-white/30">안전</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phone mockup */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            {/* Phone frame */}
            <div className="relative bg-[#0a0f1e] border-2 border-white/15 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50" style={{ aspectRatio: "9/19" }}>
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <span className="text-[11px] text-white/60" style={{ fontWeight: 600 }}>9:41</span>
                <div className="w-20 h-5 bg-black rounded-full" />
                <div className="flex items-center gap-1">
                  <Signal size={12} className="text-white/60" />
                  <Wifi size={12} className="text-white/60" />
                  <Battery size={12} className="text-white/60" />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* Message list */}
                {!currentMsg && (
                  <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
                      <MessageSquare size={14} className="text-white/40" />
                      <span className="text-sm text-white/70" style={{ fontWeight: 500 }}>메시지</span>
                      <span className="ml-auto w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] text-white" style={{ fontWeight: 700 }}>
                        {messages.filter((m) => !m.read).length}
                      </span>
                    </div>
                    <div className="overflow-y-auto" style={{ height: "calc(100% - 80px)" }}>
                      {messages.map((msg) => {
                        const r = msg.result;
                        const cfg = r ? riskCfg[r.riskLevel] : null;
                        return (
                          <motion.button
                            key={msg.id}
                            onClick={() => handleSelect(msg)}
                            className={`w-full flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-all text-left ${!msg.read ? "bg-indigo-500/5" : ""}`}
                          >
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs ${cfg ? cfg.bg : "bg-white/10"}`} style={{ fontWeight: 600 }}>
                              {cfg ? <cfg.icon size={14} className={cfg.color} /> : <span className="text-white/50">{msg.sender[0]}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs ${!msg.read ? "text-white/90" : "text-white/60"}`} style={{ fontWeight: !msg.read ? 600 : 400 }}>
                                  {msg.sender}
                                </span>
                                <span className="text-[10px] text-white/25 shrink-0 ml-2">{msg.time}</span>
                              </div>
                              <p className={`text-[11px] truncate mt-0.5 ${!msg.read ? "text-white/60" : "text-white/35"}`}>
                                {msg.preview}
                              </p>
                              {msg.scanning && (
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="w-2 h-2 border border-indigo-400/50 border-t-indigo-400 rounded-full animate-spin" />
                                  <span className="text-[10px] text-indigo-400">스캔 중...</span>
                                </div>
                              )}
                              {r && (
                                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] border ${cfg?.badge}`}>
                                  {r.riskLevel} {r.score}/10
                                </span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Message detail */}
                {currentMsg && (
                  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                      <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/5 rounded-lg transition-all">
                        <ChevronLeft size={16} className="text-white/50" />
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                          <Phone size={12} className="text-white/40" />
                        </div>
                        <div>
                          <p className="text-xs text-white/80" style={{ fontWeight: 500 }}>{currentMsg.sender}</p>
                          <p className="text-[10px] text-white/30">{currentMsg.time}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4">
                      <div className="flex justify-start mb-4">
                        <div className="max-w-[85%] bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2.5">
                          <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{currentMsg.fullText}</p>
                          <p className="text-[10px] text-white/25 mt-1 text-right">{currentMsg.time}</p>
                        </div>
                      </div>

                      {/* Scan result inline */}
                      <AnimatePresence>
                        {currentMsg.scanning && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                            <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-[11px] text-indigo-400">AI 분석 중...</p>
                          </motion.div>
                        )}
                        {currentMsg.result && !currentMsg.scanning && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-xl p-3 border ${riskCfg[currentMsg.result.riskLevel].bg} ${riskCfg[currentMsg.result.riskLevel].border}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {(() => { const C = riskCfg[currentMsg.result!.riskLevel]; return <C.icon size={13} className={C.color} />; })()}
                              <span className={`text-xs ${riskCfg[currentMsg.result.riskLevel].color}`} style={{ fontWeight: 600 }}>
                                {currentMsg.result.riskLevel} — {currentMsg.result.score}/10
                              </span>
                            </div>
                            <ul className="space-y-1">
                              {currentMsg.result.reasons.map((r, i) => (
                                <li key={i} className="text-[11px] text-white/50 flex items-start gap-1.5">
                                  <span className="text-white/25 mt-0.5">·</span>{r}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Scan button */}
                    {!currentMsg.result && !currentMsg.scanning && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleScan(currentMsg.id)}
                          className="w-full py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs flex items-center justify-center gap-2 hover:bg-indigo-500/25 transition-all"
                        >
                          <Scan size={13} /> AI 스캔 시작
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Analysis panel */}
        <div className="space-y-4">
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
            <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>사용 방법</p>
            <ol className="space-y-3">
              {[
                "왼쪽 폰 화면에서 문자를 클릭해 내용을 확인하세요",
                "'AI 스캔 시작' 버튼을 눌러 피싱 여부를 분석하세요",
                "결과가 문자 말풍선 아래에 표시됩니다",
                "'전체 스캔' 버튼으로 모든 문자를 한번에 분석할 수 있습니다",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-white/50">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-[10px]" style={{ fontWeight: 600 }}>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          {/* Results summary */}
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
            <p className="text-sm text-white/70 mb-3" style={{ fontWeight: 500 }}>문자함 분석 현황</p>
            <div className="space-y-2">
              {messages.map((msg) => {
                const r = msg.result;
                const cfg = r ? riskCfg[r.riskLevel] : null;
                return (
                  <div key={msg.id} className="flex items-center gap-3">
                    <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${cfg ? cfg.bg : "bg-white/5"}`}>
                      {cfg ? <cfg.icon size={11} className={cfg.color} /> : <MessageSquare size={11} className="text-white/20" />}
                    </div>
                    <span className="flex-1 text-xs text-white/50 truncate">{msg.sender}</span>
                    {msg.scanning && <div className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />}
                    {r && !msg.scanning && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg?.badge}`}>{r.riskLevel}</span>
                    )}
                    {!r && !msg.scanning && (
                      <button
                        onClick={() => handleScan(msg.id)}
                        className="text-[10px] text-white/25 hover:text-indigo-400 transition-all flex items-center gap-1"
                      >
                        <Scan size={9} /> 스캔
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
            <p className="text-[11px] text-indigo-300/60 leading-relaxed">
              실제 서비스에서는 문자 수신 즉시 백그라운드 AI 스캔이 자동으로 실행됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
