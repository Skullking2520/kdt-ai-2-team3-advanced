import { useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Lock, Search, Download } from "lucide-react"
import { useAdmin } from "../context/AdminContext";

interface LogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  detail: string;
  level: "INFO" | "WARN" | "CRITICAL";
  ip: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: "log-001", timestamp: "2025.04.30 14:32:11", actor: "admin", action: "LOGIN", resource: "AdminPanel", detail: "관리자 로그인 성공", level: "INFO", ip: "192.168.1.1" },
  { id: "log-002", timestamp: "2025.04.30 14:35:02", actor: "admin", action: "VIEW", resource: "ErrorAnalysis", detail: "오탐/미탐 분석 페이지 접근", level: "INFO", ip: "192.168.1.1" },
  { id: "log-003", timestamp: "2025.04.30 13:18:44", actor: "admin", action: "EXPORT", resource: "PatternDB", detail: "패턴 DB 전체 내보내기 (247건)", level: "WARN", ip: "192.168.1.1" },
  { id: "log-004", timestamp: "2025.04.30 12:01:33", actor: "system", action: "MODEL_UPDATE", resource: "분석 모델", detail: "모델 가중치 업데이트 완료 (미정)", level: "INFO", ip: "127.0.0.1" },
  { id: "log-005", timestamp: "2025.04.30 11:45:20", actor: "guest", action: "FAIL_LOGIN", resource: "AdminPanel", detail: "관리자 로그인 실패 (3회 시도)", level: "CRITICAL", ip: "203.241.xx.xx" },
  { id: "log-006", timestamp: "2025.04.30 11:20:08", actor: "admin", action: "DELETE", resource: "History", detail: "분석 이력 32건 삭제", level: "WARN", ip: "192.168.1.1" },
  { id: "log-007", timestamp: "2025.04.29 22:14:55", actor: "system", action: "PATTERN_ADD", resource: "PatternDB", detail: "신규 피싱 패턴 3건 자동 등록", level: "INFO", ip: "127.0.0.1" },
  { id: "log-008", timestamp: "2025.04.29 18:30:12", actor: "admin", action: "CONFIG_CHANGE", resource: "Settings", detail: "분류 임계값 변경: 50% → 45%", level: "WARN", ip: "192.168.1.1" },
  { id: "log-009", timestamp: "2025.04.29 15:22:41", actor: "admin", action: "REPORT_APPROVE", resource: "ReportPage", detail: "사용자 신고 ID rep-892 승인 처리", level: "INFO", ip: "192.168.1.1" },
  { id: "log-010", timestamp: "2025.04.29 10:05:19", actor: "system", action: "BACKUP", resource: "Database", detail: "일별 백업 완료 (33,700건)", level: "INFO", ip: "127.0.0.1" },
  { id: "log-011", timestamp: "2025.04.29 09:00:00", actor: "system", action: "STARTUP", resource: "Server", detail: "FastAPI 서버 재시작", level: "INFO", ip: "127.0.0.1" },
  { id: "log-012", timestamp: "2025.04.28 23:58:02", actor: "guest", action: "FAIL_LOGIN", resource: "AdminPanel", detail: "관리자 로그인 실패 (1회 시도)", level: "CRITICAL", ip: "110.45.xx.xx" },
  { id: "log-013", timestamp: "2025.04.28 20:11:34", actor: "admin", action: "REDTEAM", resource: "RedTeam", detail: "레드팀 테스트 실행 (동형자 치환 기법)", level: "WARN", ip: "192.168.1.1" },
  { id: "log-014", timestamp: "2025.04.28 16:44:07", actor: "admin", action: "AB_TEST", resource: "ABTest", detail: "모델 A/B 테스트 실행 (분석 모델 vs KoBERT)", level: "INFO", ip: "192.168.1.1" },
  { id: "log-015", timestamp: "2025.04.28 14:32:00", actor: "admin", action: "LOGOUT", resource: "AdminPanel", detail: "관리자 로그아웃", level: "INFO", ip: "192.168.1.1" },
];

const LEVEL_STYLE = {
  INFO: { bg: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  WARN: { bg: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  CRITICAL: { bg: "bg-red-500/10 border-red-500/20 text-red-400" },
};

const ACTION_COLOR: Record<string, string> = {
  LOGIN: "text-emerald-400", LOGOUT: "text-white/40", VIEW: "text-cyan-400", EXPORT: "text-amber-400",
  DELETE: "text-red-400", CONFIG_CHANGE: "text-orange-400", FAIL_LOGIN: "text-red-500",
  MODEL_UPDATE: "text-violet-400", PATTERN_ADD: "text-cyan-400", REPORT_APPROVE: "text-emerald-400",
  BACKUP: "text-white/50", STARTUP: "text-white/50", REDTEAM: "text-red-400", AB_TEST: "text-violet-400",
};

export function AuditLog() {
  const { isAdmin, login } = useAdmin();
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");

  const handleLogin = () => {
    if (!login(pw)) { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const filtered = MOCK_LOGS.filter((l) => {
    const matchSearch = search === "" || Object.values(l).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
    const matchLevel = levelFilter === "ALL" || l.level === levelFilter;
    return matchSearch && matchLevel;
  });

  if (!isAdmin) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-amber-400" />
          </div>
          <h1 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.3rem" }}>관리자 전용</h1>
          <p className="text-sm text-white/40">보안 감사 로그는 관리자 인증이 필요합니다.</p>
        </div>
        <div className="bg-[#111c30] border border-white/10 rounded-xl p-5">
          <p className="text-xs text-white/40 mb-3">관리자 비밀번호</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className={`w-full bg-[#0b1120] border rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none mb-3 transition-all ${pwError ? "border-red-500/50" : "border-white/10 focus:border-amber-500/30"}`}
            placeholder="비밀번호 입력..." />
          {pwError && <p className="text-xs text-red-400 mb-2">비밀번호가 틀렸습니다.</p>}
          <button onClick={handleLogin} className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/25 transition-all">인증</button>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const csv = ["id,timestamp,actor,action,resource,detail,level,ip",
      ...filtered.map((l) => `${l.id},${l.timestamp},${l.actor},${l.action},${l.resource},"${l.detail}",${l.level},${l.ip}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = "audit_log.csv";
    a.click();
    // 클릭 후 blob URL 해제 (메모리 누수 방지)
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={14} className="text-amber-400" />
          <span className="text-xs text-amber-400 tracking-widest uppercase">관리자 전용 · 보안 감사</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>보안 감사 로그</h1>
        <p className="text-sm text-white/40">관리자 행동 및 시스템 이벤트 추적 이력</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "전체", count: MOCK_LOGS.length, color: "text-white/60" },
          { label: "WARN", count: MOCK_LOGS.filter((l) => l.level === "WARN").length, color: "text-amber-400" },
          { label: "CRITICAL", count: MOCK_LOGS.filter((l) => l.level === "CRITICAL").length, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
            <p className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.count}</p>
            <p className="text-[11px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 flex items-center gap-2 bg-[#111c30] border border-white/10 rounded-lg px-3 py-2 min-w-0">
          <Search size={12} className="text-white/25 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="검색 (actor, action, detail...)"
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/20 outline-none" />
        </div>
        <div className="flex gap-1">
          {["ALL", "INFO", "WARN", "CRITICAL"].map((lv) => (
            <button key={lv} onClick={() => setLevelFilter(lv)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                levelFilter === lv ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "border-white/10 text-white/35 hover:text-white/55"
              }`}>{lv}</button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all">
          <Download size={11} /> CSV
        </button>
      </div>

      {/* Log table */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 text-white/25">
                {["시간", "Actor", "Action", "Resource", "상세", "Level", "IP"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((log, i) => (
                <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-white/2 transition-all">
                  <td className="px-4 py-2.5 text-white/25 whitespace-nowrap font-mono text-[10px]">{log.timestamp}</td>
                  <td className="px-4 py-2.5 text-white/50">{log.actor}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap">
                    <span className={ACTION_COLOR[log.action] ?? "text-white/50"}>{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/45 whitespace-nowrap">{log.resource}</td>
                  <td className="px-4 py-2.5 text-white/55 max-w-[200px] truncate">{log.detail}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LEVEL_STYLE[log.level].bg}`}>{log.level}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/25 font-mono text-[10px]">{log.ip}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
          <p className="text-[11px] text-white/25">{filtered.length}건 / 전체 {MOCK_LOGS.length}건</p>
          <p className="text-[11px] text-white/20">최근 7일 이력 표시 중</p>
        </div>
      </div>
    </div>
  );
}
