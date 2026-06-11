import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio, ShieldAlert, AlertTriangle, ShieldCheck, Pause, Play, Filter, TrendingUp, Zap, Activity } from "lucide-react";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

interface FeedEvent {
  id: string;
  timestamp: Date;
  sender: string;
  preview: string;
  riskLevel: RiskLevel;
  score: number;
  category: string;
  region: string;
}

const SENDERS = [
  "010-3821-****", "010-9274-****", "국민건강보험", "KB국민은행",
  "CJ대한통운", "경찰청사이버", "이벤트알림", "금융채무조정센터",
  "하나은행", "010-5538-****", "국세청", "교통위반단속센터",
];

const PREVIEWS: { text: string; risk: RiskLevel; score: number; category: string }[] = [
  { text: "【국민건강보험】미납보험료 즉시 납부하지 않으면 급여가 정지됩니다.", risk: "HIGH", score: 9, category: "공공기관 사칭" },
  { text: "[KB국민은행] 비정상 접근 감지. 24시간 내 본인 확인 필요.", risk: "HIGH", score: 10, category: "금융 피싱" },
  { text: "[CJ대한통운] 주소불명 반송 예정. 주소 확인 바랍니다.", risk: "HIGH", score: 8, category: "택배 사기" },
  { text: "갤럭시S24 당첨! 48시간 내 수령 신청하세요.", risk: "HIGH", score: 9, category: "이벤트 사기" },
  { text: "정부지원 저금리 대출 연 1.2%. 신용불량자도 가능.", risk: "HIGH", score: 8, category: "대출 사기" },
  { text: "SKT 5월 이용요금 32,000원 청구. 상세: 114 또는 T world 앱", risk: "LOW", score: 1, category: "정상" },
  { text: "카카오 인증번호 [829401]. 타인에게 알리지 마세요.", risk: "LOW", score: 1, category: "정상" },
  { text: "[경찰청] 귀하 사이버금융범죄 연루 혐의. 48시간 내 출석 확인.", risk: "HIGH", score: 10, category: "공공기관 사칭" },
  { text: "정부 코로나 지원금 미수령 분 환급. 7일 내 신청 필요.", risk: "MEDIUM", score: 6, category: "공공기관 사칭" },
  { text: "하나은행: 해외 결제 시도 감지. 본인이 아니라면 차단 바랍니다.", risk: "MEDIUM", score: 5, category: "금융 피싱" },
  { text: "국세청: 세금 환급금 231,000원 발생. 기간 내 신청 시 지급.", risk: "MEDIUM", score: 7, category: "공공기관 사칭" },
  { text: "배달의민족 주문 확인: #28491 떡볶이 외 2건. 예상 30분.", risk: "LOW", score: 1, category: "정상" },
];

const REGIONS = ["서울", "부산", "인천", "대구", "광주", "대전", "경기", "경남", "전남", "충북"];

const riskCfg = {
  HIGH: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/20", dot: "bg-red-400", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  MEDIUM: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/8", border: "border-orange-500/20", dot: "bg-orange-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  LOW: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10", dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

function generateEvent(): FeedEvent {
  const preview = PREVIEWS[Math.floor(Math.random() * PREVIEWS.length)];
  const sender = SENDERS[Math.floor(Math.random() * SENDERS.length)];
  const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
  return {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    sender,
    preview: preview.text,
    riskLevel: preview.risk,
    score: preview.score,
    category: preview.category,
    region,
  };
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 20;
    const step = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

export function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>(() => Array.from({ length: 8 }, generateEvent));
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [todayCount, setTodayCount] = useState(1247);
  const [highCount, setHighCount] = useState(438);
  const listRef = useRef<HTMLDivElement>(null);
  const countUp = useCountUp(todayCount, 1000);
  const highUp = useCountUp(highCount, 1000);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const e = generateEvent();
      setEvents((prev) => [e, ...prev].slice(0, 60));
      setTodayCount((n) => n + 1);
      if (e.riskLevel === "HIGH") setHighCount((n) => n + 1);
    }, 2200);
    return () => clearInterval(interval);
  }, [running]);

  const filtered = events.filter((e) => filter === "ALL" || e.riskLevel === filter);

  const highPct = Math.round((highCount / todayCount) * 100);
  const medPct = Math.round(((todayCount - highCount - Math.floor(todayCount * 0.35)) / todayCount) * 100);
  const lowPct = 100 - highPct - medPct;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Radio size={14} className="text-red-400 animate-pulse" />
          <span className="text-xs text-red-400 tracking-widest uppercase">실시간</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>실시간 탐지 피드</h1>
            <p className="text-sm text-white/40">전국에서 실시간으로 탐지되는 스미싱 이벤트 스트림</p>
          </div>
          <button
            onClick={() => setRunning(!running)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${
              running
                ? "bg-red-500/15 border-red-500/25 text-red-400 hover:bg-red-500/20"
                : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {running ? <><Pause size={13} /> 일시 정지</> : <><Play size={13} /> 재시작</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "오늘 탐지", value: countUp.toLocaleString(), icon: Activity, color: "text-white/70", bg: "bg-white/5" },
          { label: "HIGH 위험", value: highUp.toLocaleString(), icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/8" },
          { label: "탐지율", value: `${highPct}%`, icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/8" },
          { label: "초당 평균", value: "0.45건", icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/8" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-white/10 rounded-xl p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <p className={`${s.color}`} style={{ fontWeight: 700, fontSize: "1.2rem" }}>{s.value}</p>
              <p className="text-[11px] text-white/30">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk distribution bar */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/50" style={{ fontWeight: 500 }}>오늘 위험도 분포</p>
          <p className="text-[11px] text-white/30">{todayCount.toLocaleString()}건 분석</p>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
          <motion.div animate={{ width: `${highPct}%` }} className="bg-red-500 rounded-full" style={{ transition: "width 0.5s ease" }} />
          <motion.div animate={{ width: `${medPct}%` }} className="bg-orange-500 rounded-full" style={{ transition: "width 0.5s ease" }} />
          <motion.div animate={{ width: `${Math.max(lowPct, 0)}%` }} className="bg-emerald-500 rounded-full" style={{ transition: "width 0.5s ease" }} />
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: "HIGH", pct: highPct, color: "text-red-400" },
            { label: "MEDIUM", pct: medPct, color: "text-orange-400" },
            { label: "LOW", pct: Math.max(lowPct, 0), color: "text-emerald-400" },
          ].map((d) => (
            <span key={d.label} className="flex items-center gap-1 text-[11px]">
              <span className={d.color} style={{ fontWeight: 600 }}>{d.pct}%</span>
              <span className="text-white/30">{d.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={12} className="text-white/30" />
        <div className="flex gap-1.5">
          {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                filter === f
                  ? f === "ALL" ? "bg-white/10 border-white/20 text-white/80"
                    : f === "HIGH" ? "bg-red-500/20 border-red-500/30 text-red-400"
                    : f === "MEDIUM" ? "bg-orange-500/20 border-orange-500/30 text-orange-400"
                    : "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                  : "border-white/10 text-white/35 hover:text-white/55"
              }`}
            >
              {f === "ALL" ? "전체" : f}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-white/25 ml-auto">{filtered.length}개 이벤트</span>
      </div>

      {/* Feed list */}
      <div ref={listRef} className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filtered.map((event) => {
            const cfg = riskCfg[event.riskLevel];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -16, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className={`rounded-xl border p-3.5 ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${cfg.dot} ${event.riskLevel !== "LOW" ? "animate-pulse" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${cfg.badge}`}>{event.riskLevel} {event.score}/10</span>
                      <span className="text-[10px] text-white/35">{event.category}</span>
                      <span className="text-[10px] text-white/25">{event.region}</span>
                      <span className="text-[10px] text-white/20 ml-auto">{formatTime(event.timestamp)}</span>
                    </div>
                    <p className="text-xs text-white/30 mb-1">발신: {event.sender}</p>
                    <p className={`text-xs ${event.riskLevel === "LOW" ? "text-white/50" : "text-white/70"} truncate`}>{event.preview}</p>
                  </div>
                  <cfg.icon size={14} className={`${cfg.color} shrink-0 mt-0.5`} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!running && (
        <div className="text-center mt-4 py-3 rounded-xl bg-white/3 border border-white/8">
          <p className="text-xs text-white/40">⏸ 피드 일시 정지됨</p>
        </div>
      )}
    </div>
  );
}
