import { useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Lock, Search, Download, Eye, Check, X, MessageSquare } from "lucide-react"
import { useAdmin } from "../context/AdminContext";

interface ReportEntry {
  id: string;
  userId: string;
  maskedContent: string;
  category: string;
  reason: string;
  submittedAt: string;
  status: "pending" | "reviewing" | "approved" | "rejected";
}

const MOCK_REPORTS: ReportEntry[] = [
  { id: "rep-001", userId: "user-***1", maskedContent: "【국민건강보험】미납보험료...", category: "공공기관 사칭", reason: "官方 기관을 사칭하는 스미싱으로 보입니다", submittedAt: "2025.04.30 16:42", status: "pending" },
  { id: "rep-002", userId: "user-***7", maskedContent: "[CJ대한통운] 주소불명...", category: "택배 사기", reason: "택배사를 사칭한フィッシング链接입니다", submittedAt: "2025.04.30 15:28", status: "pending" },
  { id: "rep-003", userId: "user-***3", maskedContent: "【KB국민은행】 계좌 비정상...", category: "금융 피싱", reason: "은행을 사칭하여 계좌정보 탈취 시도", submittedAt: "2025.04.30 12:15", status: "reviewing" },
  { id: "rep-004", userId: "user-***9", maskedContent: "[이벤트당첨] 축하합니다!...", category: "이벤트 사기", reason: "당첨금을미끼로 개인정보 탈취", submittedAt: "2025.04.29 22:05", status: "approved" },
  { id: "rep-005", userId: "user-***2", maskedContent: "[국세청] 환급세액 발생...", category: "공공기관 사칭", reason: "국세청을 사칭한 phishing", submittedAt: "2025.04.29 18:30", status: "rejected" },
];

const STATUS_STYLE: Record<ReportEntry["status"], { label: string; cls: string }> = {
  pending:   { label: "미처리", cls: "bg-red-500/15 border-red-500/30 text-red-400" },
  reviewing: { label: "검토 중", cls: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
  approved:  { label: "승인", cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
  rejected:  { label: "거절", cls: "bg-white/10 border-white/20 text-white/40" },
};

function ReportReviewTab() {
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filtered = reports.filter((r) => filterStatus === "ALL" || r.status === filterStatus);

  const handleAction = (id: string, action: ReportEntry["status"]) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: action } : r));
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {["ALL", "pending", "reviewing", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
              filterStatus === s ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "border-white/10 text-white/40 hover:text-white/60"
            }`}>
            {s === "ALL" ? "전체" : STATUS_STYLE[s as ReportEntry["status"]]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Report list */}
      {filtered.length === 0 ? (
        <div className="bg-[#111c30] border border-white/10 rounded-xl py-16 text-center">
          <MessageSquare size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/30">신고 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sc = STATUS_STYLE[r.status];
            return (
              <div key={r.id} className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 font-mono">{r.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${sc.cls}`}>{sc.label}</span>
                    <span className="text-[10px] text-white/30">{r.submittedAt}</span>
                  </div>
                  <span className="text-[10px] text-white/40">{r.userId}</span>
                </div>
                <p className="text-xs text-white/40 mb-1 truncate">{r.maskedContent}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{r.category}</span>
                  <span className="text-[11px] text-white/50">{r.reason}</span>
                </div>
                {/* Action buttons */}
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(r.id, "reviewing")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/25 transition-all">
                      <Eye size={11} /> 검토 중
                    </button>
                    <button onClick={() => handleAction(r.id, "approved")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-all">
                      <Check size={11} /> 승인
                    </button>
                    <button onClick={() => handleAction(r.id, "rejected")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all">
                      <X size={11} /> 무시
                    </button>
                  </div>
                )}
                {r.status === "reviewing" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(r.id, "approved")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-all">
                      <Check size={11} /> 승인
                    </button>
                    <button onClick={() => handleAction(r.id, "rejected")}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all">
                      <X size={11} /> 거절
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<"logs" | "reports">("logs");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  const handleLogin = () => {
    if (!login(pw)) { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const filtered = MOCK_LOGS.filter((l) => {
    const matchSearch = search === "" || Object.values(l).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
    const matchLevel = levelFilter === "ALL" || l.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#0b1120] border border-white/10 rounded-xl p-1 w-fit mb-5">
        {([
          { key: "logs", label: "감사 로그" },
          { key: "reports", label: "신고 검토" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs transition-all ${
              activeTab === t.key
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {activeTab === "logs" && (
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
      )}

      {activeTab === "logs" ? (
        <>
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
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <p className="text-sm text-white/30">검색 결과가 없습니다.</p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((log, i) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
                <p className="text-[11px] text-white/25">{filtered.length}건 / 전체 {MOCK_LOGS.length}건</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-all"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-6 h-6 rounded text-[11px] transition-all ${
                        currentPage === i + 1
                          ? "bg-amber-500/20 text-amber-400"
                          : "text-white/35 hover:text-white/60"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded text-[11px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-all"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── 신고 검토 탭 ── */
        <ReportReviewTab />
      )}
    </div>
  );
}
