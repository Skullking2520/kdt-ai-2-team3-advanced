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
  Users,
  TrendingUp,
} from "lucide-react";
import { api, ApiException } from "@/lib/api";
import type { ReportResponse } from "@/types/api";

const CATEGORIES = [
  { value: "gov", label: "공공기관 사칭", count: 89, icon: "🏛️" },
  { value: "finance", label: "금융/은행 피싱", count: 73, icon: "🏦" },
  { value: "delivery", label: "택배 사기", count: 61, icon: "📦" },
  { value: "event", label: "이벤트/경품 사기", count: 48, icon: "🎁" },
  { value: "loan", label: "대출/투자 사기", count: 37, icon: "💰" },
  { value: "other", label: "기타", count: 22, icon: "⚠️" },
];

const RECENT_REPORTS = [
  { time: "5분 전", category: "공공기관 사칭", preview: "【국민건강보험】미납보험료 즉시납부...", votes: 12 },
  { time: "23분 전", category: "택배 사기", preview: "[CJ대한통운] 주소불명 반송 예정...", votes: 8 },
  { time: "1시간 전", category: "금융/은행 피싱", preview: "【KB국민은행】비정상 접근 감지...", votes: 19 },
  { time: "2시간 전", category: "이벤트/경품 사기", preview: "갤럭시S24 특별 추첨 당첨! 48시간...", votes: 5 },
];

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
        // eslint-disable-next-line no-alert
        alert(`신고 접수 실패: ${e.message}`);
      } else {
        // eslint-disable-next-line no-alert
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
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Flag size={14} className="text-rose-600 dark:text-rose-400" />
          <span className="text-xs text-rose-600 dark:text-rose-400 tracking-widest uppercase">커뮤니티 기여</span>
        </div>
        <h1 className="text-slate-900 dark:text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>피싱 문자 신고 & 제보</h1>
        <p className="text-sm text-slate-600 dark:text-white/40">
          의심 문자를 제보하면 AI 학습 데이터로 활용되어 탐지 성능이 향상됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
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
                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-white/40 mb-3">
                    <Tag size={11} /> 피싱 유형 선택 <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCatOpen(!catOpen)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-[#0b1120] border border-white/10 rounded-lg text-sm hover:border-white/20 transition-all"
                    >
                      {selectedCat ? (
                        <span className="text-slate-900 dark:text-white/80">{selectedCat.label}</span>
                      ) : (
                        <span className="text-slate-500 dark:text-white/30">유형을 선택하세요</span>
                      )}
                      <ChevronDown size={13} className={`text-slate-500 dark:text-white/30 transition-transform ${catOpen ? "rotate-180" : ""}`} />
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
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${category === cat.value ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-white/60"}`}
                            >
                              <span>{cat.label}</span>
                              <span className="text-[11px] text-slate-400 dark:text-white/25">{cat.count}건 등록</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sender */}
                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-white/40 mb-2">
                    <Phone size={11} /> 발신자 번호 / 이름 (선택)
                  </label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="예: 010-1234-5678 또는 국민건강보험공단"
                    className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
                  />
                </div>

                {/* Message */}
                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-white/40 mb-2">
                    <FileText size={11} /> 문자 내용 <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="피싱으로 의심되는 문자 내용을 그대로 붙여넣어 주세요..."
                    rows={5}
                    className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none resize-none"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-[11px] text-white/25">{messageText.length}자</span>
                    {messageText.length < 10 && messageText.length > 0 && (
                      <span className="text-[11px] text-rose-400">최소 10자 이상 입력하세요</span>
                    )}
                  </div>
                </div>

                {/* URL toggle */}
                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs text-white/40">
                      <Link2 size={11} /> URL이 포함되어 있나요?
                    </label>
                    <button
                      type="button"
                      onClick={() => setHasUrl(!hasUrl)}
                      className={`relative w-10 h-5 rounded-full transition-all ${hasUrl ? "bg-rose-500/40" : "bg-white/10"}`}
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
                          className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none font-mono"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notes */}
                <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-xs text-white/40 mb-2">
                    <AlertTriangle size={11} /> 추가 메모 (선택)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="실제 피해 여부, 추가 정보, 의심 이유 등을 자유롭게 작성하세요..."
                    rows={3}
                    className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none resize-none"
                  />
                </div>

                {/* Consent */}
                <div
                  onClick={() => setAgreeShare(!agreeShare)}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${agreeShare ? "bg-rose-500/5 border-rose-500/20" : "bg-white/2 border-white/8 hover:border-white/15"}`}
                >
                  <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${agreeShare ? "bg-rose-500 border-rose-500" : "border-white/20"}`}>
                    {agreeShare && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    제보한 내용은 피싱 탐지 AI 모델 학습 데이터로 활용되는 것에 동의합니다. 개인 식별 정보는 포함되지 않으며, 문자 내용은 익명으로 처리됩니다.
                    <span className="text-rose-400"> *</span>
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
                className="bg-[#111c30] border border-emerald-500/20 rounded-2xl p-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </motion.div>
                <h2 className="text-white mb-2" style={{ fontWeight: 700 }}>제보 완료!</h2>
                <p className="text-sm text-white/50 mb-1">소중한 제보 감사합니다.</p>
                <p className="text-xs text-white/35 mb-8">
                  제보하신 내용은 검토 후 패턴 데이터베이스에 반영될 예정입니다.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { label: "유형", value: selectedCat?.label ?? "-" },
                    { label: "발신자", value: sender || "미입력" },
                    { label: "상태", value: "검토 중" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/3 rounded-lg p-3">
                      <p className="text-[11px] text-white/30 mb-1">{s.label}</p>
                      <p className="text-xs text-white/70">{s.value}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
                >
                  추가 제보하기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={13} className="text-rose-400" />
              <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>제보 현황</p>
            </div>
            <div className="space-y-2">
              {CATEGORIES.slice(0, 5).map((cat) => (
                <div key={cat.value} className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500/60 rounded-full" style={{ width: `${(cat.count / 89) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-white/35 w-6 text-right">{cat.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent reports */}
          <div className="bg-[#111c30] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={13} className="text-white/40" />
              <p className="text-sm text-white/70" style={{ fontWeight: 500 }}>최근 제보</p>
            </div>
            <div className="space-y-3">
              {RECENT_REPORTS.map((r, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/3 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20">{r.category}</span>
                    <span className="text-[10px] text-white/25">{r.time}</span>
                  </div>
                  <p className="text-xs text-white/50 truncate">{r.preview}</p>
                  <p className="text-[10px] text-white/25 mt-1">{r.votes}명이 동일 제보</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guide */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <p className="text-[11px] text-blue-300/60 leading-relaxed">
              <strong className="text-blue-300/80">제보 가이드:</strong> 개인정보(주민번호, 계좌번호 등)가 포함된 경우 반드시 삭제 후 제보해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
