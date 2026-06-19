import { useState } from "react";
import { motion } from "motion/react";
import { MessageSquare, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Database } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { Card } from "./ui/Primitives";

interface FeedbackItem {
  id: string;
  analysisId: string;
  predictedLabel: "high" | "medium" | "low";
  correctLabel: "high" | "medium" | "low";
  content: string;
  isCorrect: boolean;
  comment?: string;
  submittedAt: string;
}

const MOCK_FEEDBACK: FeedbackItem[] = [
  { id: "fb-001", analysisId: "ana-***1", predictedLabel: "high", correctLabel: "high", content: "【국민건강보험】미납보험료 즉시 납부...", isCorrect: true, submittedAt: "2025.04.30 14:22" },
  { id: "fb-002", analysisId: "ana-***2", predictedLabel: "low", correctLabel: "high", content: "카카오톡 친구 추가 요청입니다 [链接]", isCorrect: false, comment: "피싱 링크가 포함되어 있습니다", submittedAt: "2025.04.30 13:45" },
  { id: "fb-003", analysisId: "ana-***3", predictedLabel: "medium", correctLabel: "medium", content: "[CJ대한통운] 택배 도착 예정", isCorrect: true, submittedAt: "2025.04.30 12:10" },
  { id: "fb-004", analysisId: "ana-***4", predictedLabel: "high", correctLabel: "low", content: "배달의민족 주문확인 문자입니다", isCorrect: false, comment: "정상 문자입니다", submittedAt: "2025.04.30 11:33" },
  { id: "fb-005", analysisId: "ana-***5", predictedLabel: "low", correctLabel: "low", content: "우리 은행 자산운용 보고서", isCorrect: true, submittedAt: "2025.04.29 22:18" },
  { id: "fb-006", analysisId: "ana-***6", predictedLabel: "medium", correctLabel: "high", content: "KB국민은행 보안 인증 요청", isCorrect: false, comment: "금융 피싱입니다", submittedAt: "2025.04.29 20:05" },
  { id: "fb-007", analysisId: "ana-***7", predictedLabel: "high", correctLabel: "high", content: "【국세청】환급세액 발생 안내", isCorrect: true, submittedAt: "2025.04.29 18:44" },
  { id: "fb-008", analysisId: "ana-***8", predictedLabel: "low", correctLabel: "medium", content: "이벤트 당첨 알림! 확인하세요", isCorrect: false, submittedAt: "2025.04.29 16:30" },
];

const LABEL_COLOR: Record<string, string> = {
  high: "bg-red-500/15 border-red-500/30 text-red-400",
  medium: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  low: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
};

export function AdminFeedback() {
  const { isAdmin } = useAdmin();
  const [filter, setFilter] = useState<"all" | "correct" | "fp" | "fn">("all");
  const [search, setSearch] = useState("");

  const correctCount = MOCK_FEEDBACK.filter((f) => f.isCorrect).length;
  const incorrectCount = MOCK_FEEDBACK.filter((f) => !f.isCorrect).length;
  const total = MOCK_FEEDBACK.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const filtered = MOCK_FEEDBACK.filter((f) => {
    const matchSearch = search === "" || f.content.includes(search) || f.analysisId.includes(search);
    if (!matchSearch) return false;
    if (filter === "correct") return f.isCorrect;
    if (filter === "fp") return !f.isCorrect && f.predictedLabel !== "low"; // false positive (predicted high but actually low)
    if (filter === "fn") return !f.isCorrect && f.predictedLabel === "low"; // false negative (predicted low but actually high)
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="px-4 sm:px-6 py-8 text-center">
        <p className="text-sm text-white/40">피드백 분석은 관리자만 열람 가능합니다.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={14} className="text-cyan-400" />
          <span className="text-xs text-cyan-400 tracking-widest uppercase">관리자 전용 · 분석</span>
        </div>
        <h1 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피드백 분석</h1>
        <p className="text-sm text-white/40">사용자 정확도 피드백 수집 · FP/FN 후보 추출 · 재학습 데이터 생성</p>
      </div>

      {/* Accuracy summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card padding="p-4">
          <p className="text-[10px] text-white/30 mb-1">전체 피드백</p>
          <p className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{total}</p>
          <p className="text-[10px] text-white/25 mt-0.5">건</p>
        </Card>
        <Card padding="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <p className="text-[10px] text-white/30">정확해요</p>
          </div>
          <p className="text-emerald-400" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{correctCount}</p>
          <p className="text-[10px] text-white/25 mt-0.5">정답</p>
        </Card>
        <Card padding="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle size={12} className="text-red-400" />
            <p className="text-[10px] text-white/30">틀렸어요</p>
          </div>
          <p className="text-red-400" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{incorrectCount}</p>
          <p className="text-[10px] text-white/25 mt-0.5">오답</p>
        </Card>
        <Card padding="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-cyan-400" />
            <p className="text-[10px] text-white/30">정확도</p>
          </div>
          <p className="text-cyan-400" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{accuracy}<span className="text-sm text-white/40">%</span></p>
          <p className="text-[10px] text-white/25 mt-0.5">예측 정확률</p>
        </Card>
      </div>

      {/* FP/FN info box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-amber-300/80" style={{ fontWeight: 600 }}>FP/FN候选 데이터 안내</p>
          <p className="text-[11px] text-amber-400/60 mt-0.5 leading-relaxed">
            <span className="text-red-400">FP (False Positive)</span>: 모델이 위험하다고 판단했으나 실제 정상인 경우 — 오탐 감소 학습에 활용.
            <span className="text-orange-400 ml-3">FN (False Negative)</span>: 모델이 정상이라고 판단했으나 실제 위험인 경우 — 미탐 감소 학습에 활용.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 flex items-center gap-2 bg-[#111c30] border border-white/10 rounded-lg px-3 py-2 min-w-0">
          <MessageSquare size={12} className="text-white/25 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="내용·분석ID 검색..."
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/20 outline-none"
          />
        </div>
        <div className="flex gap-1">
          {([
            { key: "all", label: "전체" },
            { key: "correct", label: "정답" },
            { key: "fp", label: "FP (오탐)" },
            { key: "fn", label: "FN (미탐)" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                filter === f.key
                  ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                  : "border-white/10 text-white/40 hover:text-white/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/30">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111c30] border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30 font-mono">{item.analysisId}</span>
                  <span className="text-[10px] text-white/25">{item.submittedAt}</span>
                  {item.isCorrect ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 size={10} /> 정답
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-red-400">
                      <XCircle size={10} />
                      {item.predictedLabel !== "low" ? "FP (오탐)" : "FN (미탐)"}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-white/60 mb-3 leading-relaxed truncate">{item.content}</p>

              {/* Label comparison */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30">모델 예측:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${LABEL_COLOR[item.predictedLabel]}`}>
                    {item.predictedLabel.toUpperCase()}
                  </span>
                </div>
                <span className="text-white/20">→</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30">사용자:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${LABEL_COLOR[item.correctLabel]}`}>
                    {item.correctLabel.toUpperCase()}
                  </span>
                </div>
              </div>

              {item.comment && (
                <p className="text-[11px] text-white/40 italic">"{item.comment}"</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Export retraining data button */}
      {incorrectCount > 0 && (
        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/25 transition-all"
            onClick={() => {
              const fpFn = MOCK_FEEDBACK.filter((f) => !f.isCorrect);
              const json = JSON.stringify(fpFn, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "retraining_data.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 0);
            }}
          >
            <Database size={13} />
            FP/FN 데이터 내보내기 (JSON)
          </button>
          <span className="text-[11px] text-white/30">재학습용 데이터셋으로 활용</span>
        </div>
      )}
    </div>
  );
}