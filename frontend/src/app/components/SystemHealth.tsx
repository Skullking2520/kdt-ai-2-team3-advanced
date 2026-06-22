import {useState, useEffect} from "react";
import {motion} from "motion/react";
import {Activity, Server, Cpu, Database, AlertTriangle, Clock, Zap, TrendingUp, BarChart3, AlertCircle, RefreshCw} from "lucide-react";

/**
 * SystemHealth — 어드민 시스템 헬스 체크
 *
 * 정직한 처리:
 * - 시스템 메트릭(CPU/메모리/GPU/디스크): 실제 서버 메트릭 미연동 → 정직 안내
 * - 서비스 8개(분석 모델/FastAPI/PostgreSQL/Redis/Nginx/패턴 DB/웹소켓/백업 스토리지): 실제 백엔드 서비스 미연동 → 정직 안내
 * - 인시던트 로그: 정직 안내
 * - API 호출 통계: 시연용 mock (백엔드 연동 시 자동 교체, 정직 라벨 명시)
 *
 * 시각화 강화:
 * - API 호출 메인 메트릭 4개 카드 (총 호출 수 / 평균 응답 시간 / 에러율 / 활성 사용자)
 * - 엔드포인트별 상세 테이블 (P50/P95/RPS/에러율/총호출/마지막 호출)
 * - 60분 sparkline 추이
 * - 응답시간 분포 막대 그래프
 */

interface ApiEndpoint {
  method: "GET" | "POST";
  path: string;
  p50: number;
  p95: number;
  rps: number;
  totalCalls: number;
  errors: number;
  lastCall: string;
  status: "healthy" | "degraded" | "down";
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: "POST", path: "/api/analyze",     p50: 120, p95: 340, rps: 28.4, totalCalls: 102_847, errors: 295, lastCall: "방금 전", status: "healthy" },
  { method: "POST", path: "/api/url-detail",  p50: 85,  p95: 240, rps: 12.1, totalCalls: 43_652,  errors: 87,  lastCall: "방금 전", status: "healthy" },
  { method: "POST", path: "/api/sender-lookup", p50: 35, p95: 95,  rps: 6.8,  totalCalls: 24_531,  errors: 41,  lastCall: "1분 전",  status: "healthy" },
  { method: "GET",  path: "/api/history",     p50: 22,  p95: 60,  rps: 4.2,  totalCalls: 15_189,  errors: 8,   lastCall: "방금 전", status: "healthy" },
  { method: "POST", path: "/api/report",      p50: 38,  p95: 110, rps: 1.6,  totalCalls: 5_834,   errors: 12,  lastCall: "2분 전",  status: "healthy" },
  { method: "GET",  path: "/api/patterns",    p50: 18,  p95: 45,  rps: 8.2,  totalCalls: 29_627,  errors: 0,   lastCall: "방금 전", status: "healthy" },
  { method: "GET",  path: "/api/dashboard",   p50: 45,  p95: 130, rps: 0.8,  totalCalls: 2_945,   errors: 3,   lastCall: "30초 전", status: "healthy" },
  { method: "GET",  path: "/api/health",      p50: 4,   p95: 12,  rps: 0.5,  totalCalls: 1_823,   errors: 0,   lastCall: "방금 전", status: "healthy" },
  { method: "GET",  path: "/api/compare",     p50: 28,  p95: 75,  rps: 0.3,  totalCalls: 1_098,   errors: 1,   lastCall: "5분 전",  status: "healthy" },
];

const RESPONSE_DIST = [
  { range: "0-50ms",    count: 6420, color: "#22c55e" },
  { range: "50-100ms",  count: 3180, color: "#84cc16" },
  { range: "100-200ms", count: 1640, color: "#eab308" },
  { range: "200-500ms", count: 410,  color: "#f97316" },
  { range: "500ms+",    count: 85,   color: "#ef4444" },
];

const SPARK_60MIN = Array.from({ length: 60 }, (_, i) => ({
  t: i,
  v: 24 + Math.sin(i / 5) * 8 + Math.random() * 10,
}));

const METHOD_COLOR: Record<"GET" | "POST", string> = {
  GET: "text-cyan-400",
  POST: "text-violet-400",
};

const STATUS_STYLE = {
  healthy:  { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  degraded: { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400"   },
  down:     { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400"     },
};

export function SystemHealth() {
  const [refreshed, setRefreshed] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // mock이지만 시간이 지나면 RPS를 약간 변동 (시각적 활기)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = () => {
    setRefreshed(true);
    setLastRefresh(new Date());
    setTimeout(() => setRefreshed(false), 1000);
  };

  // 집계
  const totalCalls = API_ENDPOINTS.reduce((s, e) => s + e.totalCalls, 0);
  const totalErrors = API_ENDPOINTS.reduce((s, e) => s + e.errors, 0);
  const avgP50 = Math.round(API_ENDPOINTS.reduce((s, e) => s + e.p50, 0) / API_ENDPOINTS.length);
  const avgP95 = Math.round(API_ENDPOINTS.reduce((s, e) => s + e.p95, 0) / API_ENDPOINTS.length);
  const totalRps = API_ENDPOINTS.reduce((s, e) => s + e.rps, 0);
  const errorRate = ((totalErrors / totalCalls) * 100).toFixed(2);
  const activeEndpoints = API_ENDPOINTS.filter((e) => e.status === "healthy").length;

  const maxRps = Math.max(...API_ENDPOINTS.map((e) => e.rps));
  const maxDist = Math.max(...RESPONSE_DIST.map((d) => d.count));
  const maxSpark = Math.max(...SPARK_60MIN.map((p) => p.v));

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
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

      {/* API 호출 메인 메트릭 4-카드 — 시각화 강화 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm text-white/80" style={{ fontWeight: 600 }}>API 호출 현황 (최근 24시간)</h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400" style={{ fontWeight: 600 }}>
            <AlertCircle size={10} />
            시연용 가상 데이터
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "총 호출 수", value: totalCalls.toLocaleString(), sub: `+${(totalCalls * 0.124).toFixed(0)} (24h)`, icon: Zap, color: "#22d3ee" },
            { label: "평균 P50 / P95", value: `${avgP50}ms`, sub: `P95 ${avgP95}ms`, icon: Clock, color: "#a78bfa" },
            { label: "에러율", value: `${errorRate}%`, sub: `${totalErrors.toLocaleString()}건 실패`, icon: AlertTriangle, color: parseFloat(errorRate) < 0.5 ? "#22c55e" : "#f97316" },
            { label: "활성 엔드포인트", value: `${activeEndpoints}/${API_ENDPOINTS.length}`, sub: `${totalRps.toFixed(1)} req/s`, icon: Server, color: "#22c55e" },
          ].map((m) => (
            <div key={m.label} className="bg-[#111c30] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon size={12} style={{ color: m.color }} />
                <p className="text-[11px] text-white/40">{m.label}</p>
              </div>
              <p className="text-2xl text-white" style={{ fontWeight: 700 }}>{m.value}</p>
              <p className="text-[10px] text-white/30 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 60분 처리량 추이 — 강화된 sparkline */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>API 처리량 추이</p>
            <p className="text-[11px] text-white/30 mt-0.5">최근 60분 · 분당 요청 수</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              현재 <span className="text-white/80" style={{ fontWeight: 600 }}>{totalRps.toFixed(1)} req/s</span>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="text-emerald-400" style={{ fontWeight: 600 }}>+12.4%</span>
            </span>
          </div>
        </div>
        <div className="flex items-end gap-px h-20">
          {SPARK_60MIN.map((p, i) => (
            <motion.div
              key={`${i}-${tick}`}
              initial={{ height: 0 }}
              animate={{ height: `${(p.v / maxSpark) * 100}%` }}
              transition={{ delay: i * 0.005, duration: 0.4 }}
              className="flex-1 rounded-t-sm"
              style={{ backgroundColor: "#22d3ee", opacity: 0.5 + (p.v / maxSpark) * 0.4 }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white/20 mt-2">
          <span>60분 전</span>
          <span>30분 전</span>
          <span>현재</span>
        </div>
      </div>

      {/* 응답 시간 분포 + 엔드포인트별 상세 — 2-컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 응답시간 분포 */}
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={13} className="text-cyan-400" />
            <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>응답 시간 분포</p>
          </div>
          <div className="space-y-2.5">
            {RESPONSE_DIST.map((d) => (
              <div key={d.range}>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="text-white/50 font-mono">{d.range}</span>
                  <span className="text-white/70" style={{ fontWeight: 600 }}>{d.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.count / maxDist) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-3">총 {RESPONSE_DIST.reduce((s, d) => s + d.count, 0).toLocaleString()}건 측정</p>
        </div>

        {/* 엔드포인트별 상세 테이블 */}
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Server size={13} className="text-cyan-400" />
            <p className="text-sm text-white/80" style={{ fontWeight: 600 }}>엔드포인트별 상세 성능</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/8">
                  {["메서드", "엔드포인트", "P50", "P95", "RPS", "총 호출", "에러율", "상태"].map((h) => (
                    <th key={h} className="text-left pb-2 pr-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {API_ENDPOINTS.map((ep) => {
                  const errRate = ((ep.errors / ep.totalCalls) * 100).toFixed(2);
                  const ss = STATUS_STYLE[ep.status];
                  const rpsPct = (ep.rps / maxRps) * 100;
                  return (
                    <tr key={ep.path} className="text-white/60 hover:bg-white/2 transition-colors">
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] font-mono ${METHOD_COLOR[ep.method]}`} style={{ fontWeight: 700 }}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-white/80 text-[11px]">{ep.path}</td>
                      <td className="py-2.5 pr-3 font-mono text-white/70">{ep.p50}ms</td>
                      <td className="py-2.5 pr-3 font-mono text-white/70">{ep.p95}ms</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${rpsPct}%` }} />
                          </div>
                          <span className="font-mono text-white/70 text-[10px]">{ep.rps}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-white/70 text-[10px]">{ep.totalCalls.toLocaleString()}</td>
                      <td className="py-2.5 pr-3">
                        <span className={parseFloat(errRate) < 0.5 ? "text-emerald-400" : parseFloat(errRate) < 1 ? "text-amber-400" : "text-red-400"} style={{ fontWeight: 600 }}>
                          {errRate}%
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ss.bg} ${ss.border} ${ss.text}`} style={{ fontWeight: 600 }}>
                          {ep.status === "healthy" ? "정상" : ep.status === "degraded" ? "저하" : "중단"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 정직 처리: 시스템 메트릭 + 서비스 + 인시던트 모두 미연동 안내 */}
      <div className="space-y-3">
        {/* 시스템 메트릭 정직 처리 */}
        <div className="bg-amber-500/5 border border-dashed border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs" style={{ fontWeight: 700 }}>
              <Cpu size={14} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-amber-800 dark:text-amber-200" style={{ fontWeight: 600 }}>
                  시스템 메트릭 (CPU/메모리/GPU/디스크) 미연동
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300">정직 처리</span>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                운영팀이 Prometheus·Grafana·CloudWatch 같은 실제 서버 모니터링 시스템과 연동하면, 이 자리에 CPU 사용률·메모리 점유율·GPU 추론 활용도·디스크 I/O가 자동으로 표시됩니다. 현재는 mock 가짜 데이터(27%/59%/64%/48%)를 정직하게 표시하지 않습니다.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {[
                  { label: "CPU 사용률", icon: Cpu, color: "#22d3ee" },
                  { label: "메모리", icon: Server, color: "#a78bfa" },
                  { label: "GPU (추론)", icon: Activity, color: "#fb923c" },
                  { label: "디스크", icon: Database, color: "#22c55e" },
                ].map((m) => (
                  <div key={m.label} className="bg-white/3 border border-white/8 rounded-lg p-2 text-center">
                    <m.icon size={12} className="mx-auto mb-1" style={{ color: m.color, opacity: 0.4 }} />
                    <p className="text-[10px] text-white/40">{m.label}</p>
                    <p className="text-[11px] text-white/25 mt-0.5" style={{ fontWeight: 600 }}>미연동</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 서비스 상태 정직 처리 */}
        <div className="bg-amber-500/5 border border-dashed border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs" style={{ fontWeight: 700 }}>
              <Server size={14} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-amber-800 dark:text-amber-200" style={{ fontWeight: 600 }}>
                  백엔드 서비스 8종 (분석 모델·FastAPI·DB·Redis·Nginx 등) 미연동
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300">정직 처리</span>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                각 서비스의 헬스체크(/health), 가동률, 버전, 마지막 점검 시간은 실제 서비스가 배포된 후 운영팀이 모니터링 대시보드를 연동하면 자동으로 표시됩니다. 현재는 mock 가짜 데이터를 정직하게 표시하지 않습니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                {[
                  "분석 모델 추론 서버", "FastAPI 백엔드", "PostgreSQL DB", "Redis 캐시",
                  "Nginx 로드밸런서", "패턴 DB 동기화", "실시간 피드 웹소켓", "백업 스토리지",
                ].map((svc) => (
                  <div key={svc} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg p-2">
                    <div className="w-2 h-2 rounded-full bg-white/15" />
                    <span className="text-[11px] text-white/40 flex-1">{svc}</span>
                    <span className="text-[9px] text-white/25 font-mono">미연동</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 인시던트 로그 정직 처리 */}
        <div className="bg-amber-500/5 border border-dashed border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs" style={{ fontWeight: 700 }}>
              <AlertTriangle size={14} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-amber-800 dark:text-amber-200" style={{ fontWeight: 600 }}>
                  인시던트 로그 미연동
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300">정직 처리</span>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                실제 인시던트(Nginx 502, GPU 메모리 도달, 패턴 DB 지연 등)는 Sentry·PagerDuty 같은 운영 모니터링 도구와 연동 후 자동으로 적재됩니다.
                마지막 점검: <span className="font-mono">{lastRefresh.toLocaleTimeString("ko-KR")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
