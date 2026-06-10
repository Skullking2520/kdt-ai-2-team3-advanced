import { useState, useRef } from "react";
import { motion } from "motion/react"
import { Upload, FileText, Download, BarChart2, RefreshCw, CheckCircle, AlertTriangle, Minus } from "lucide-react";

interface SMSRow {
  id: string;
  sender: string;
  message: string;
  score?: number;
  level?: "HIGH" | "MEDIUM" | "LOW";
  done?: boolean;
}

const RISK_KEYWORDS = ["즉시", "긴급", "정지", "동결", "납부", "미납", "경고", "당첨", "클릭", "소멸", "혐의", "체포", "대출"];
function mockAnalyze(msg: string): { score: number; level: "HIGH" | "MEDIUM" | "LOW" } {
  const hits = RISK_KEYWORDS.filter((k) => msg.includes(k)).length;
  const hasUrl = /http/i.test(msg);
  const raw = hits * 1.5 + (hasUrl ? 2 : 0) + Math.random() * 1.5;
  const score = Math.max(1, Math.min(10, Math.round(raw)));
  const level = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
  return { score, level };
}

const SAMPLE_CSV = `sender,message
010-8821-3947,【국민건강보험】미납보험료 89200원 즉시 납부 http://nhis-pay.kr
SKT,[SKT] 5월 요금 38500원 청구. tworld.co.kr 확인
010-3392-1847,갤럭시S25 당첨! 48시간 내 수령 http://prize.xyz
카카오뱅크,[카카오뱅크] 5월 이자 납입 안내. 앱에서 확인해주세요.
국세청,【국세청】환급금 237400원 소멸 예정. http://hometax-refund.net
CJ대한통운,[CJ대한통운] 운송장 123456789 배송 완료. 경비실 수령.
010-5571-2938,저금리 정부대출 5천만원 신용불량자 가능 http://loan-gov.kr
KB국민카드,[KB국민카드] 스타벅스 4500원 승인. 미사용 시 1588-1688`;

function parseCSV(raw: string): SMSRow[] {
  const lines = raw.trim().split("\n").slice(1);
  return lines.map((line, i) => {
    const parts = line.split(",");
    const sender = parts[0]?.trim() ?? "";
    const message = parts.slice(1).join(",").trim();
    return { id: `row-${i + 1}`, sender, message };
  }).filter((r) => r.sender && r.message);
}

const LEVEL_STYLE = {
  HIGH: { bg: "bg-red-500/15", border: "border-red-500/25", text: "text-red-400", icon: AlertTriangle },
  MEDIUM: { bg: "bg-amber-500/15", border: "border-amber-500/25", text: "text-amber-400", icon: Minus },
  LOW: { bg: "bg-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-400", icon: CheckCircle },
};

export function BulkAnalysis() {
  const [rows, setRows] = useState<SMSRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSample = () => {
    setRows(parseCSV(SAMPLE_CSV));
    setDone(false);
    setProgress(0);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRows(parseCSV(ev.target?.result as string));
      setDone(false);
      setProgress(0);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (rows.length === 0) return;
    setAnalyzing(true);
    setDone(false);
    const updated = [...rows.map((r) => ({ ...r, done: false }))];
    setRows(updated);

    for (let i = 0; i < updated.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      const result = mockAnalyze(updated[i].message);
      updated[i] = { ...updated[i], ...result, done: true };
      setRows([...updated]);
      setProgress(Math.round(((i + 1) / updated.length) * 100));
    }
    setAnalyzing(false);
    setDone(true);
  };

  const handleExport = () => {
    const csv = ["id,sender,message,score,level",
      ...rows.map((r) => `${r.id},"${r.sender}","${r.message}",${r.score ?? ""},${r.level ?? ""}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bulk_analysis_result.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const highCount = rows.filter((r) => r.level === "HIGH").length;
  const medCount = rows.filter((r) => r.level === "MEDIUM").length;
  const lowCount = rows.filter((r) => r.level === "LOW").length;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Upload size={14} className="text-teal-400" />
          <span className="text-xs text-teal-400 tracking-widest uppercase">일괄 분석</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>파일 업로드 일괄 분석</h1>
        <p className="text-sm text-white/40">CSV 파일로 최대 1,000건의 SMS를 한 번에 분석합니다.</p>
      </div>

      {/* Upload area */}
      {rows.length === 0 && (
        <div className="mb-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/15 rounded-2xl p-12 text-center cursor-pointer hover:border-teal-500/30 hover:bg-teal-500/3 transition-all group"
          >
            <Upload size={28} className="text-white/20 mx-auto mb-3 group-hover:text-teal-400 transition-all" />
            <p className="text-sm text-white/40 group-hover:text-white/60 transition-all">CSV 파일을 클릭해서 업로드</p>
            <p className="text-[11px] text-white/20 mt-1">형식: sender, message 컬럼</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </div>
          <div className="flex justify-center mt-3">
            <button onClick={loadSample}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-teal-400 transition-all">
              <FileText size={11} /> 샘플 CSV 로드
            </button>
          </div>
        </div>
      )}

      {/* Loaded data */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-white/40">{rows.length}건 로드됨</span>
            <button onClick={handleAnalyze} disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs hover:bg-teal-500/25 transition-all disabled:opacity-50">
              {analyzing ? <div className="w-3 h-3 border border-teal-400/30 border-t-teal-400 rounded-full animate-spin" /> : <BarChart2 size={12} />}
              {analyzing ? `분석 중 ${progress}%` : "전체 분석 시작"}
            </button>
            {done && (
              <button onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-all">
                <Download size={12} /> CSV 내보내기
              </button>
            )}
            <button onClick={() => { setRows([]); setDone(false); setProgress(0); }}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/55 transition-all ml-auto">
              <RefreshCw size={10} /> 초기화
            </button>
          </div>

          {/* Progress bar */}
          {(analyzing || done) && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all" />
              </div>
              <p className="text-[11px] text-white/30">{done ? "분석 완료" : `${progress}% 완료`}</p>
            </div>
          )}

          {/* Summary */}
          {done && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3">
              {[
                { label: "HIGH", count: highCount, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
                { label: "MEDIUM", count: medCount, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { label: "LOW", count: lowCount, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg} ${s.border}`}>
                  <p className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.count}</p>
                  <p className="text-[11px] text-white/35">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Table */}
          <div className="bg-[#111c30] border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-white/30">
                    <th className="text-left px-4 py-2.5">#</th>
                    <th className="text-left px-4 py-2.5">발신자</th>
                    <th className="text-left px-4 py-2.5">메시지</th>
                    <th className="text-left px-4 py-2.5">점수</th>
                    <th className="text-left px-4 py-2.5">등급</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row, i) => {
                    const ls = row.level ? LEVEL_STYLE[row.level] : null;
                    const Icon = ls?.icon;
                    return (
                      <tr key={row.id} className="hover:bg-white/2 transition-all">
                        <td className="px-4 py-2.5 text-white/25">{i + 1}</td>
                        <td className="px-4 py-2.5 text-white/50 font-mono max-w-[100px] truncate">{row.sender}</td>
                        <td className="px-4 py-2.5 text-white/65 max-w-[280px] truncate">{row.message}</td>
                        <td className="px-4 py-2.5">
                          {row.done ? (
                            <span className={`${ls?.text}`} style={{ fontWeight: 600 }}>{row.score}</span>
                          ) : analyzing && !row.done ? (
                            <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                          ) : <span className="text-white/20">-</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.done && ls && Icon ? (
                            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border w-fit ${ls.bg} ${ls.border} ${ls.text}`}>
                              <Icon size={9} /> {row.level}
                            </span>
                          ) : <span className="text-white/20">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
