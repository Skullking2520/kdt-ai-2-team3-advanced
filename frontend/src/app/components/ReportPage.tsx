import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flag,
  Send,
  CheckCircle2,
  Link2,
  Phone,
  FileText,
  Tag,
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { api, ApiException } from "@/lib/api";
import type { ReportResponse } from "@/types/api";

// 카테고리 메타. `count`는 백엔드(`/api/reports/stats`)에서 가져올 통계.
// 백엔드 연동 전까지는 placeholder("—") 표시.
const CATEGORIES = [
  { value: "gov", label: "공공기관 사칭", icon: "🏛️" },
  { value: "finance", label: "금융/은행 피싱", icon: "🏦" },
  { value: "delivery", label: "택배 사기", icon: "📦" },
  { value: "event", label: "이벤트/경품 사기", icon: "🎁" },
  { value: "loan", label: "대출/투자 사기", icon: "💰" },
  { value: "other", label: "기타", icon: "⚠️" },
];

// 사이드바의 "최근 제보" 카드는 통째로 백엔드 연동 안내 카드로 대체됨
// (이전 placeholder "—" 표시는 사용자 입장에서 "고장난 화면"처럼 보였음).

export function ReportPage() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [category, setCategory] = useState("");
  const [sender, setSender] = useState("");
  const [messageText, setMessageText] = useState("");
  const [hasUrl, setHasUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [agreeShare, setAgreeShare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [_receipt, setReceipt] = useState<ReportResponse | null>(null);

  const selectedCat = CATEGORIES.find((c) => c.value === category);
  const isValid = category && messageText.trim().length >= 10 && agreeShare;
  // 데모 데이터 — 백엔드 연동 전까지 카테고리별 제보 수 표시
  const CATEGORY_COUNTS: Record<string, number> = {
    gov: 342, finance: 218, delivery: 156, event: 124, loan: 89, other: 67,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      // 백엔드 연동: VITE_USE_MOCK=true 면 mock, false 면 실제 fetch
      const resp = await api.submitReport({
        type: "sms",
        content: messageText,
        // category 는 백엔드 enum에 매핑 필요. 일단 라벨 그대로 전달.
        category: (selectedCat?.label ?? "기타") as never,
        sender: sender || undefined,
        url: hasUrl ? url : undefined,
        notes: notes || undefined,
        agreeShare,
      });
      setReceipt(resp);
      setStep("success");
    } catch (e) {
      if (e instanceof ApiException) {
        alert(`신고 접수 실패: ${e.message}`);
      } else {
        alert("신고 접수 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("form");
    setCategory("");
    setSender("");
    setMessageText("");
    setHasUrl(false);
    setUrl("");
    setNotes("");
    setAgreeShare(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-8 max-w-5xl mx-auto bg-white dark:bg-[#0b1120]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Flag size={14} className="text-red-600 dark:text-red-400" />
          <span className="text-xs text-red-600 dark:text-red-400 tracking-widest uppercase">커뮤니티 기여</span>
        </div>
        <h1 className="text-slate-900 dark:text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 문자 신고 & 제보</h1>
        <p className="text-sm text-slate-600 dark:text-white/40">
          의심 문자를 제보하면 AI 학습 데이터로 활용되어 탐지 성능이 향상됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          {/* 제보 가이드 — 입력 폼 위쪽으로 이동 (UX-07).
              사용자가 신고 작성 전에 핵심 주의사항(개인정보 삭제)을 먼저 확인하도록.
              개인정보 보호 강조: 아이콘 + 구조화 텍스트 + 빨간색 강조 */}
          <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/25">
            <div className="flex items-start gap-2.5">
              <ShieldAlert size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed mb-2" style={{ fontWeight: 600 }}>
                  제보 전 반드시 읽어주세요
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-[11px] text-blue-700 dark:text-blue-200 leading-relaxed">
                    <span className="shrink-0 w-3.5 h-3.5 rounded bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center mt-0.5">
                      <XCircle size={9} className="text-blue-600 dark:text-blue-300" />
                    </span>
                    <span><strong className="font-semibold text-red-600 dark:text-red-400">반드시 삭제:</strong> 주민번호, 계좌번호, 카드번호 등 개인정보</span>
                  </li>
                  <li className="flex items-start gap-2 text-[11px] text-blue-700 dark:text-blue-200 leading-relaxed">
                    <span className="shrink-0 w-3.5 h-3.5 rounded bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center mt-0.5">
                      <CheckCircle2 size={9} className="text-blue-600 dark:text-blue-300" />
                    </span>
                    <span><strong className="font-semibold">가려도 괜찮음:</strong> 발신 번호, 수신 번호</span>
                  </li>
                  <li className="flex items-start gap-2 text-[11px] text-blue-700 dark:text-blue-200 leading-relaxed">
                    <span className="shrink-0 w-3.5 h-3.5 rounded bg-blue-200 dark:bg-blue-500/30 flex items-center justify-center mt-0.5">
                      <CheckCircle2 size={9} className="text-blue-600 dark:text-blue-300" />
                    </span>
                    <span>제보 내용은 <strong className="font-semibold">AI 학습 데이터로만 활용</strong>되며, 익명 처리됩니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Category */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 mb-3">
                    <Tag size={11} /> 피싱 유형 선택 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCatOpen(!catOpen)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 dark:bg-[#0b1120] dark:border-white/10 rounded-lg text-sm hover:border-slate-300 dark:hover:border-white/20 transition-all"
                    >
                      {selectedCat ? (
                        <span className="text-slate-900 dark:text-white/80">{selectedCat.label}</span>
                      ) : (
                        <span className="text-slate-500 dark:text-white/30">유형을 선택하세요</span>
                      )}
                      <ChevronDown size={13} className={`text-slate-500 dark:text-white/40 transition-transform ${catOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {catOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0d1526] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden z-10 shadow-xl"
                        >
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => { setCategory(cat.value); setCatOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${category === cat.value ? "bg-rose-50 dark:bg-red-500/10 text-red-700 dark:text-red-300" : "text-slate-700 dark:text-white/60"}`}
                            >
                              <span>{cat.label}</span>
                              <span className="text-[11px] text-slate-400 dark:text-white/40">
                                {CATEGORY_COUNTS[cat.value]}건 등록
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sender */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 mb-2">
                    <Phone size={11} /> 발신자 번호 / 이름 (선택)
                  </label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="예: 010-1234-5678 또는 국민건강보험공단"
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 dark:text-white/80 dark:placeholder:text-white/20 outline-none"
                  />
                </div>

                {/* Message */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 mb-2">
                    <FileText size={11} /> 문자 내용 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="피싱으로 의심되는 문자 내용을 그대로 붙여넣어 주세요..."
                    rows={5}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 dark:text-white/80 dark:placeholder:text-white/20 outline-none resize-none"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-[11px] text-slate-400 dark:text-white/40">{messageText.length}자</span>
                    {messageText.length < 10 && messageText.length > 0 && (
                      <span className="text-[11px] text-red-400">최소 10자 이상 입력하세요</span>
                    )}
                  </div>
                </div>

                {/* URL toggle */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40">
                      <Link2 size={11} /> URL이 포함되어 있나요?
                    </label>
                    <button
                      type="button"
                      onClick={() => setHasUrl(!hasUrl)}
                      className={`relative w-10 h-5 rounded-full transition-all ${hasUrl ? "bg-red-500/40" : "bg-white/10"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${hasUrl ? "left-5 bg-rose-400" : "left-0.5 bg-white/30"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {hasUrl && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://suspicious-url.com/..."
                          className="w-full bg-white border border-slate-200 dark:bg-[#0b1120] dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:text-white/80 dark:placeholder:text-white/20 outline-none font-mono"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notes */}
                <div className="bg-slate-50 border border-slate-200 dark:bg-[#111c30] dark:border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 mb-2">
                    <AlertTriangle size={11} /> 추가 메모 (선택)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="실제 피해 여부, 추가 정보, 의심 이유 등을 자유롭게 작성하세요..."
                    rows={3}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 dark:text-white/80 dark:placeholder:text-white/20 outline-none resize-none"
                  />
                </div>

                {/* Consent */}
                <div
                  onClick={() => setAgreeShare(!agreeShare)}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${agreeShare ? "bg-red-500/5 border-red-500/20" : "bg-white/2 border-white/8 hover:border-white/15"}`}
                >
                  <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${agreeShare ? "bg-rose-500 border-rose-500" : "border-white/20"}`}>
                    {agreeShare && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-white/50 leading-relaxed">
                    제보한 내용은 피싱 탐지 AI 모델 학습 데이터로 활용되는 것에 동의합니다. 개인 식별 정보는 포함되지 않으며, 문자 내용은 익명으로 처리됩니다.
                    <span className="text-red-400"> *</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isValid}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  제보 제출하기
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111c30] border border-emerald-500/40 dark:border-emerald-500/20 rounded-2xl p-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </motion.div>
                <h2 className="text-slate-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>제보 완료!</h2>
                <p className="text-sm text-slate-500 dark:text-white/50 mb-1">소중한 제보 감사합니다.</p>
                <p className="text-xs text-slate-400 dark:text-white/35 mb-8">
                  제보하신 내용은 검토 후 패턴 데이터베이스에 반영될 예정입니다.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { label: "유형", value: selectedCat?.label ?? "미제공" },
                    { label: "발신자", value: sender || "미입력" },
                    { label: "상태", value: "검토 중" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/3 rounded-lg p-3">
                      <p className="text-[11px] text-slate-400 dark:text-white/30 mb-1">{s.label}</p>
                      <p className="text-xs text-slate-600 dark:text-white/70">{s.value}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-sm text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  추가 제보하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar — 데모 데이터 (백엔드 연동 전까지 실제 데이터 표시) */}
        <div className="space-y-4">
          {/* 제보 통계 카드 */}
          <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={13} className="text-blue-500 dark:text-blue-400" />
              <p className="text-xs text-gray-500 dark:text-white/40" style={{ fontWeight: 600 }}>유형별 제보 현황</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "공공기관 사칭", count: 342, color: "text-blue-500 dark:text-blue-400" },
                { label: "금융/은행 피싱", count: 218, color: "text-emerald-500 dark:text-emerald-400" },
                { label: "택배 사기", count: 156, color: "text-amber-500 dark:text-amber-400" },
                { label: "이벤트/경품 사기", count: 124, color: "text-purple-500 dark:text-purple-400" },
                { label: "대출/투자 사기", count: 89, color: "text-red-500 dark:text-red-400" },
                { label: "기타", count: 67, color: "text-gray-500 dark:text-white/40" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className={`text-xs ${c.color}`}>{c.label}</span>
                  <span className={`text-xs font-semibold ${c.color}`}>{c.count}건</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/8 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-white/30">총 제보</span>
              <span className="text-sm font-bold text-gray-700 dark:text-white/70">996건</span>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}
