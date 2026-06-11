import { useState } from "react";
import { motion } from "motion/react";
import { ShieldOff, Search, Plus, Download, Trash2, RefreshCw, Lock } from "lucide-react"
import { useAdmin } from "../context/AdminContext";

type IOCType = "URL" | "Domain" | "Phone" | "IP";

interface IOCEntry {
  id: string;
  type: IOCType;
  value: string;
  category: string;
  addedAt: string;
  reportCount: number;
  status: "active" | "expired";
  source: string;
}

const INITIAL_IOCS: IOCEntry[] = [
  { id: "ioc-001", type: "URL",    value: "http://nhis-pay.kr-notice.com/pay",       category: "공공기관 사칭", addedAt: "2025.04.28", reportCount: 342, status: "active",  source: "사용자 신고" },
  { id: "ioc-002", type: "Domain", value: "kbbank-secure.com",                        category: "금융 피싱",    addedAt: "2025.04.25", reportCount: 218, status: "active",  source: "KISA" },
  { id: "ioc-003", type: "URL",    value: "http://cjlogistics.re-delivery.net/confirm",category: "택배 사기",   addedAt: "2025.04.22", reportCount: 189, status: "active",  source: "자동 탐지" },
  { id: "ioc-004", type: "Phone",  value: "010-8821-3947",                             category: "보이스피싱",   addedAt: "2025.04.20", reportCount: 156, status: "active",  source: "사용자 신고" },
  { id: "ioc-005", type: "Domain", value: "samsung-event55.xyz",                       category: "이벤트 사기", addedAt: "2025.04.18", reportCount: 134, status: "active",  source: "KISA" },
  { id: "ioc-006", type: "IP",     value: "175.221.43.127",                            category: "공공기관 사칭",addedAt: "2025.04.15", reportCount: 98,  status: "active",  source: "자동 탐지" },
  { id: "ioc-007", type: "URL",    value: "http://fsc-loan.kr/apply",                  category: "대출 사기",   addedAt: "2025.04.12", reportCount: 87,  status: "active",  source: "사용자 신고" },
  { id: "ioc-008", type: "Phone",  value: "010-3392-1847",                             category: "기관 사칭",   addedAt: "2025.04.10", reportCount: 76,  status: "active",  source: "사용자 신고" },
  { id: "ioc-009", type: "Domain", value: "hometax-refund.net",                        category: "공공기관 사칭",addedAt: "2025.04.08", reportCount: 231, status: "active",  source: "KISA" },
  { id: "ioc-010", type: "URL",    value: "http://prize-samsung.xyz/claim",             category: "이벤트 사기", addedAt: "2025.04.05", reportCount: 142, status: "active",  source: "자동 탐지" },
  { id: "ioc-011", type: "IP",     value: "103.42.18.251",                             category: "금융 피싱",   addedAt: "2025.04.01", reportCount: 67,  status: "active",  source: "KISA" },
  { id: "ioc-012", type: "Domain", value: "kb-otp.kr",                                 category: "금융 피싱",   addedAt: "2025.03.28", reportCount: 312, status: "expired", source: "KISA" },
  { id: "ioc-013", type: "Phone",  value: "010-5571-2938",                             category: "대출 사기",   addedAt: "2025.03.25", reportCount: 45,  status: "active",  source: "사용자 신고" },
  { id: "ioc-014", type: "URL",    value: "http://kupang-tax.com/customs",             category: "택배 사기",   addedAt: "2025.03.22", reportCount: 189, status: "expired", source: "자동 탐지" },
  { id: "ioc-015", type: "Domain", value: "apple-kr-gift.com",                         category: "이벤트 사기", addedAt: "2025.03.18", reportCount: 93,  status: "active",  source: "사용자 신고" },
];

const TYPE_STYLE: Record<IOCType, { bg: string; border: string; text: string }> = {
  URL:    { bg: "bg-purple-500/15",  border: "border-purple-500/25",  text: "text-purple-300" },
  Domain: { bg: "bg-red-500/15",     border: "border-red-500/25",     text: "text-red-300" },
  Phone:  { bg: "bg-orange-500/15",  border: "border-orange-500/25",  text: "text-orange-300" },
  IP:     { bg: "bg-cyan-500/15",    border: "border-cyan-500/25",    text: "text-cyan-300" },
};

export function IOCList() {
  const { isAdmin } = useAdmin();
  const [iocs, setIocs] = useState<IOCEntry[]>(INITIAL_IOCS);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [newType, setNewType] = useState<IOCType>("Domain");
  const [newCat, setNewCat] = useState("");

  const filtered = iocs.filter((i) => {
    const matchSearch = search === "" || i.value.toLowerCase().includes(search.toLowerCase()) || i.category.includes(search);
    const matchType = typeFilter === "ALL" || i.type === typeFilter;
    const matchStatus = statusFilter === "ALL" || i.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleAdd = () => {
    if (!newVal.trim()) return;
    const entry: IOCEntry = {
      id: `ioc-${Date.now()}`, type: newType, value: newVal, category: newCat || "기타",
      addedAt: new Date().toLocaleDateString("ko-KR").replaceAll(". ", ".").replace(".", "").slice(0, 10),
      reportCount: 1, status: "active", source: "관리자 직접 등록",
    };
    setIocs((p) => [entry, ...p]);
    setNewVal(""); setNewCat(""); setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    setIocs((p) => p.filter((i) => i.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    if (!isAdmin) return;
    setIocs((p) => p.map((i) => i.id === id ? { ...i, status: i.status === "active" ? "expired" : "active" } : i));
  };

  const handleExport = () => {
    const csv = ["id,type,value,category,addedAt,reportCount,status,source",
      ...filtered.map((i) => `${i.id},${i.type},"${i.value}",${i.category},${i.addedAt},${i.reportCount},${i.status},${i.source}`)
    ].join("\n");
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.href = url;
    a.download = "ioc_list.csv";
    a.click();
    // 클릭 후 blob URL 해제 (메모리 누수 방지)
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="px-4 sm:px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldOff size={14} className="text-red-400" />
          <span className="text-xs text-red-400 tracking-widest uppercase">침해지표 관리</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>IoC 블랙리스트</h1>
        <p className="text-sm text-white/40">피싱에 사용된 URL·도메인·전화번호·IP 침해지표(Indicator of Compromise) 관리</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "전체 IoC", value: iocs.length, color: "text-white/70" },
          { label: "활성", value: iocs.filter((i) => i.status === "active").length, color: "text-red-400" },
          { label: "도메인", value: iocs.filter((i) => i.type === "Domain").length, color: "text-red-300" },
          { label: "이번 달 추가", value: iocs.filter((i) => i.addedAt.includes("2025.04")).length, color: "text-cyan-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111c30] border border-white/10 rounded-xl p-3 text-center">
            <p className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-[11px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex-1 flex items-center gap-2 bg-[#111c30] border border-white/10 rounded-lg px-3 py-2 min-w-0">
          <Search size={12} className="text-white/25 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="값·카테고리 검색..."
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/20 outline-none" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["ALL", "URL", "Domain", "Phone", "IP"].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                typeFilter === t ? "bg-red-500/15 border-red-500/25 text-red-400" : "border-white/10 text-white/35 hover:text-white/55"
              }`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {["ALL", "active", "expired"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                statusFilter === s ? "bg-white/10 border-white/20 text-white/60" : "border-white/8 text-white/25 hover:text-white/45"
              }`}>{s === "ALL" ? "전체" : s === "active" ? "활성" : "만료"}</button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 transition-all">
          <Download size={11} /> CSV
        </button>
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs hover:bg-red-500/20 transition-all">
            <Plus size={11} /> 추가
          </button>
        )}
        {!isAdmin && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/3 border border-white/8 text-white/25 text-xs">
            <Lock size={10} /> 편집 잠금
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && isAdmin && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111c30] border border-red-500/20 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={newType} onChange={(e) => setNewType(e.target.value as IOCType)}
            className="bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 outline-none">
            {["URL", "Domain", "Phone", "IP"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={newVal} onChange={(e) => setNewVal(e.target.value)}
            placeholder="값 입력 (URL, 도메인, 번호, IP)"
            className="col-span-2 bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/20 outline-none" />
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
            placeholder="카테고리"
            className="bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/20 outline-none" />
          <button onClick={handleAdd}
            className="col-span-2 sm:col-span-1 py-2 rounded-lg bg-red-500/20 border border-red-500/25 text-red-400 text-xs hover:bg-red-500/25 transition-all">
            등록
          </button>
          <button onClick={() => setShowAdd(false)} className="py-2 rounded-lg border border-white/10 text-white/35 text-xs hover:text-white/55 transition-all">취소</button>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 text-white/25">
                {["타입", "값", "카테고리", "신고수", "추가일", "출처", "상태", isAdmin ? "관리" : ""].filter(Boolean).map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((ioc, i) => {
                const ts = TYPE_STYLE[ioc.type];
                return (
                  <motion.tr key={ioc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="hover:bg-white/2 transition-all">
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ts.bg} ${ts.border} ${ts.text}`}>{ioc.type}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono max-w-[200px] truncate text-white/55">{ioc.value}</td>
                    <td className="px-4 py-2.5 text-white/45">{ioc.category}</td>
                    <td className="px-4 py-2.5 text-red-400">{ioc.reportCount}</td>
                    <td className="px-4 py-2.5 text-white/25 whitespace-nowrap">{ioc.addedAt}</td>
                    <td className="px-4 py-2.5 text-white/35">{ioc.source}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleToggleStatus(ioc.id)} disabled={!isAdmin}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                          ioc.status === "active"
                            ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-400"
                            : "bg-white/5 border-white/15 text-white/30"
                        } ${!isAdmin ? "cursor-default" : "cursor-pointer"}`}>
                        {ioc.status === "active" ? "활성" : "만료"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5">
                        <button onClick={() => handleDelete(ioc.id)}
                          className="text-white/20 hover:text-red-400 transition-all">
                          <Trash2 size={11} />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
          <p className="text-[11px] text-white/25">{filtered.length}건 표시 / 전체 {iocs.length}건</p>
          <div className="flex items-center gap-1 text-[11px] text-white/20">
            <RefreshCw size={9} />
            <span>마지막 동기화: 방금 전</span>
          </div>
        </div>
      </div>
    </div>
  );
}
