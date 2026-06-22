import {useState, useEffect} from "react";
import {motion} from "motion/react";
import {Activity, Server, Cpu, Database, CheckCircle, AlertTriangle, XCircle, RefreshCw, Clock} from "lucide-react"

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency: number;
  uptime: number;
  lastCheck: string;
  version?: string;
}

interface MetricPoint { t: number; v: number; }

function useAnimatedMetric(base: number, variance: number): number {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setVal(base + (Math.random() - 0.5) * variance * 2), 1500);
    return () => clearInterval(t);
  }, [base, variance]);
  return Math.max(0, Math.min(100, val));
}

function GaugeArc({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const cx = size / 2;
  const circumference = Math.PI * r;
  const dash = (value / 100) * circumference;
  return (
    <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <path d={`M 5 ${size / 2} A ${r} ${r} 0 0 1 ${size - 5} ${size / 2}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
      <motion.path d={`M 5 ${size / 2} A ${r} ${r} 0 0 1 ${size - 5} ${size / 2}`}
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{ strokeDasharray: `${dash} ${circumference}` }}
        transition={{ duration: 0.8 }} />
      <text x={cx} y={size / 2 + 4} textAnchor="middle" fontSize="13" fill={color} fontWeight="700">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

const INITIAL_SERVICES: ServiceStatus[] = [
  { name: "분석 모델 추론 서버", status: "healthy", latency: 142, uptime: 0, lastCheck: "방금 전", version: "미정" },
  { name: "FastAPI 백엔드",       status: "healthy", latency: 28,  uptime: 99.99, lastCheck: "방금 전", version: "v0.109.0" },
  { name: "PostgreSQL DB",        status: "healthy", latency: 4,   uptime: 100.0, lastCheck: "방금 전", version: "16.2" },
  { name: "Redis 캐시",           status: "healthy", latency: 1,   uptime: 100.0, lastCheck: "방금 전" },
  { name: "Nginx 로드밸런서",      status: "healthy", latency: 8,   uptime: 99.98, lastCheck: "방금 전", version: "1.25.3" },
  { name: "패턴 DB 동기화",        status: "degraded",latency: 380, uptime: 97.4,  lastCheck: "2분 전" },
  { name: "실시간 피드 웹소켓",    status: "healthy", latency: 12,  uptime: 99.91, lastCheck: "방금 전" },
  { name: "백업 스토리지",         status: "healthy", latency: 45,  uptime: 99.85, lastCheck: "5분 전" },
];

const STATUS_STYLE = {
  healthy:  { icon: CheckCircle, text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "정상" },
  degraded: { icon: AlertTriangle, text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "저하" },
  down:     { icon: XCircle, text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "중단" },
};

const GPU_STATUS = {
  idle:     { text: "text-white/40", bg: "bg-white/8", border: "border-white/15", label: "유휴" },
  normal:   { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "정상" },
  warning:  { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "경고" },
};

const API_ENDPOINTS = [
  { path: "POST /analyze", avgMs: 142, rps: 28.4, success: 99.7 },
  { path: "GET /patterns",  avgMs: 18,  rps: 8.2,  success: 100 },
  { path: "GET /history",   avgMs: 24,  rps: 5.1,  success: 99.9 },
  { path: "POST /report",   avgMs: 38,  rps: 1.8,  success: 99.8 },
  { path: "GET /live-feed", avgMs: 12,  rps: 41.2, success: 99.99 },
];

export function SystemHealth() {
  const cpu = useAnimatedMetric(34, 8);
  const mem = useAnimatedMetric(61, 5);
  const gpu = useAnimatedMetric(72, 12);
  const disk = useAnimatedMetric(48, 1);
  const [refreshed, setRefreshed] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [sparkData] = useState<MetricPoint[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, v: 30 + Math.random() * 40 }))
  );

  const handleRefresh = () => {
    setRefreshed(true);
    setLastRefresh(new Date());
    setTimeout(() => setRefreshed(false), 1000);
  };

  const healthyCount = INITIAL_SERVICES.filter((s) => s.status === "healthy").length;
  const degradedCount = INITIAL_SERVICES.filter((s) => s.status === "degraded").length;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 tracking-widest uppercase">시스템 모니터링</span>
          </div>
          <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>시스템 헬스 체크</h1>
          <p className="text-sm text-white/40">서버·모델·DB·API 실시간 상태 모니터링</p>
        </div>
        <button onClick={handleRefresh}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all ${refreshed ? "text-emerald-400" : ""}`}>
          <RefreshCw size={11} className={refreshed ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${degradedCount > 0 ? "bg-amber-500/8 border-amber-500/20" : "bg-emerald-500/8 border-emerald-500/20"}`}>
        {degradedCount > 0
          ? <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          : <CheckCircle size={18} className="text-emerald-400 shrink-0" />}
        <div>
          <p className={`text-sm ${degradedCount > 0 ? "text-amber-400" : "text-emerald-400"}`} style={{ fontWeight: 600 }}>
            {degradedCount > 0 ? `${degradedCount}개 서비스 성능 저하` : "모든 시스템 정상"}
          </p>
          <p className="text-[11px] text-white/35">{healthyCount}/{INITIAL_SERVICES.length} 서비스 정상 · 마지막 확인: {lastRefresh.toLocaleTimeString("ko-KR")}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400">실시간</span>
        </div>
      </div>

      {/* Resource metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "CPU 사용률", value: cpu, color: "#22d3ee", icon: Cpu, isGpu: false },
          { label: "메모리",     value: mem, color: "#a78bfa", icon: Server, isGpu: false },
          { label: "GPU (추론)", value: gpu, color: "#fb923c", icon: Activity, isGpu: true },
          { label: "디스크",     value: disk,color: "#22c55e", icon: Database, isGpu: false },
        ].map((m) => {
          const gpuState = m.isGpu
            ? (gpu < 10 ? "idle" : gpu < 50 ? "normal" : "warning")
            : null;
          const gpuStyle = gpuState ? GPU_STATUS[gpuState] : null;
          return (
          <div key={m.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3 flex flex-col items-center">
            <m.icon size={13} className="mb-1" style={{ color: m.color }} />
            <p className="text-[11px] text-white/35 mb-1">{m.label}</p>
            <GaugeArc value={m.value} color={m.color} size={70} />
            {gpuStyle && (
              <span className={`mt-1.5 text-[9px] px-1.5 py-0.5 rounded border ${gpuStyle.bg} ${gpuStyle.border} ${gpuStyle.text}`}>
                {gpuStyle.label}
              </span>
            )}
          </div>
          );
        })}
      </div>

      {/* Throughput sparkline */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>API 처리량 (Requests/sec)</p>
          <span className="text-xs text-cyan-400" style={{ fontWeight: 600 }}>28.4 req/s</span>
        </div>
        <div className="flex items-end gap-0.5 h-12">
          {sparkData.map((p, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(p.v / 70) * 100}%` }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
              className="flex-1 rounded-sm"
              style={{ backgroundColor: "#22d3ee", opacity: 0.5 + (p.v / 70) * 0.3 }} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>20분 전</span><span>현재</span>
        </div>
      </div>

      {/* Services table */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/8">
          <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>서비스 상태</p>
        </div>
        <div className="divide-y divide-white/5">
          {INITIAL_SERVICES.map((svc) => {
            const ss = STATUS_STYLE[svc.status];
            return (
              <div key={svc.name} className="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-all">
                <ss.icon size={13} className={ss.text} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/70">{svc.name}</p>
                    {svc.version && <span className="text-[10px] text-white/25 font-mono">{svc.version}</span>}
                  </div>
                  <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                    <Clock size={8} /> {svc.lastCheck}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[11px] text-white/25">레이턴시</p>
                    <p className={`text-xs ${svc.latency > 200 ? "text-amber-400" : "text-white/60"} font-mono`}>{svc.latency}ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] text-white/25">가동률</p>
                    <p className={`text-xs ${svc.uptime < 99 ? "text-amber-400" : "text-emerald-400"} font-mono`}>{svc.uptime}%</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text}`}>{ss.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* API endpoint stats */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-4" style={{ fontWeight: 500 }}>API 엔드포인트 성능</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/25 border-b border-white/8">
                {["엔드포인트", "평균 응답", "RPS", "성공률"].map((h) => (
                  <th key={h} className="text-left pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {API_ENDPOINTS.map((ep) => (
                <tr key={ep.path} className="text-white/55">
                  <td className="py-2 pr-4 font-mono text-cyan-400/80">{ep.path}</td>
                  <td className="py-2 pr-4">{ep.avgMs}ms</td>
                  <td className="py-2 pr-4">{ep.rps}</td>
                  <td className="py-2">
                    <span className={ep.success >= 99.9 ? "text-emerald-400" : "text-amber-400"}>{ep.success}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident log */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <p className="text-sm text-white/70 mb-3" style={{ fontWeight: 500 }}>최근 인시던트</p>
        <div className="space-y-2.5">
          {[
            { date: "2025.04.30 09:12", level: "warn", msg: "패턴 DB 동기화 지연 — 평균 380ms (기준: 100ms)" },
            { date: "2025.04.28 03:44", level: "info", msg: "예약 백업 완료 — 33,700건 스냅샷 저장" },
            { date: "2025.04.25 14:22", level: "warn", msg: "GPU 메모리 85% 도달 — 자동 캐시 클리어 실행" },
            { date: "2025.04.22 00:00", level: "info", msg: "분석 모델 가중치 업데이트 완료 (미정)" },
            { date: "2025.04.18 11:03", level: "error", msg: "Nginx 502 오류 2분간 발생 — 자동 복구 완료" },
          ].map((inc, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                inc.level === "error" ? "bg-red-500/15 border-red-500/25 text-red-400"
                : inc.level === "warn" ? "bg-amber-500/15 border-amber-500/25 text-amber-400"
                : "bg-blue-500/15 border-blue-500/25 text-blue-400"
              }`}>{inc.level.toUpperCase()}</span>
              <p className="text-[11px] text-white/50 flex-1 leading-relaxed">{inc.msg}</p>
              <span className="text-[10px] text-white/20 shrink-0 font-mono">{inc.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
