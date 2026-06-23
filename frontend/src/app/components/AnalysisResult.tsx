import {useState, useEffect} from "react";
import {useParams, useSearchParams, useNavigate} from "react-router";
import {motion, AnimatePresence} from "motion/react";
import {ThumbsUp, ThumbsDown, Flag, Share2, RotateCcw, Home, CheckCircle, Send, ShieldCheck} from "lucide-react";
import {RiskLevelCard} from "./result/RiskLevelCard";
import {DetectionReasonsCard} from "./result/DetectionReasonsCard";
import {DamageScenarioCard} from "./result/DamageScenarioCard";
import {ActionGuideCard} from "./result/ActionGuideCard";
import {toLegacyRiskLevel} from "@/lib/smsAnalysis";
import {api, ApiException} from "@/lib/api";
import {ErrorState, type ErrorType} from "./ErrorState";
import type {SmsAnalysisResult, ReportResponse} from "@/types/api";

interface AnalysisResult {
  risk_level: "danger" | "warning" | "normal";
  risk_score: number;
  smishing_type: string;
  reasons: string[];
  action_guide: string[];
  has_url: boolean;
  has_impersonation: boolean;
  has_payment_request: boolean;
  has_personal_info_request: boolean;
}

// 분석 로직은 src/lib/smsAnalysis.ts 의 analyzeSms 사용 (API Contract RiskLevel 통일)
// 레거시 키(danger/warning/normal) 호환을 위해 toLegacyRiskLevel 어댑터 적용.

export function AnalysisResult() {
  useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const text = searchParams.get("text") || "";
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>("unknown");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  // 인라인 신고 폼 state (ReportPage /report 라우터 기능을 이 버튼에 통합)
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportCategory, setReportCategory] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportAgree, setReportAgree] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [_reportReceipt, setReportReceipt] = useState<ReportResponse | null>(null);

  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    // 새 분석 시작 시 error/result 초기화
    setError(null);
    setErrorType("unknown");
    setResult(null);
    (async () => {
      try {
        // P0 연동: 백엔드 API 호출 (VITE_USE_MOCK=false 면 실제 fetch, true 면 mock)
        const resp = await api.analyze({ type: "sms", content: text });
        if (cancelled) return;
        if (resp.type === "sms") {
          setResult(adaptSmsResult(resp));
        } else {
          throw new Error("예상하지 못한 응답 타입");
        }
      } catch (e) {
        if (cancelled) return;
        // silent fallback 제거: 백엔드 실패 시 ErrorState로 정직 표시
        if (e instanceof ApiException) {
          setError(e.message);
          if (e.code === "NETWORK") setErrorType("network");
          else if (e.code === "MODEL_TIMEOUT") setErrorType("timeout");
          else if (e.code === "INTERNAL") setErrorType("server");
          else setErrorType("unknown");
        } else {
          setError("분석 중 알 수 없는 오류가 발생했습니다.");
          setErrorType("unknown");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [text]);

  /** api.analyze() SmsAnalysisResult → 컴포넌트 내부 AnalysisResult 어댑터 */
  function adaptSmsResult(resp: SmsAnalysisResult): AnalysisResult {
    return {
      risk_level: toLegacyRiskLevel(resp.riskLevel),
      risk_score: resp.riskScore,
      smishing_type: resp.smishingType,
      reasons: resp.reasons.map((r) => r.label),
      action_guide: resp.actionGuide.map((a) => a.action + (a.detail ? ` — ${a.detail}` : "")),
      has_url: !!resp.extractedUrl,
      has_impersonation: resp.reasons.some((r) => r.code.includes("impersonat") || r.label.includes("사칭")),
      has_payment_request: resp.reasons.some((r) => r.code.includes("payment") || r.label.includes("결제")),
      has_personal_info_request: resp.reasons.some((r) => r.code.includes("personal") || r.label.includes("개인정보")),
    };
  }

  const handleFeedback = (isCorrect: boolean) => {
    setFeedback(isCorrect ? "correct" : "incorrect");
    // 실제로는 API로 피드백 전송
  };

  const handleShare = () => {
    // 공유 기능
    alert("결과 공유 기능 (향후 구현)");
  };

  // 인라인 신고 토글 (ReportPage /report 라우터 기능을 이 버튼에 통합)
  // - 1회만 신고 가능: reportSubmitted=true 면 disabled + "신고 완료" 표시
  const handleReportToggle = () => {
    if (reportSubmitted) return;
    if (!reportOpen) {
      // 분석 결과 카테고리 → 신고 카테고리 자동 매핑
      const autoCategory = result?.has_impersonation ? "공공기관 사칭" : result?.has_payment_request ? "금융 피싱" : result?.has_url ? "기타 사기" : "기타 사기";
      setReportCategory(autoCategory);
      setReportMessage(text);
      setReportOpen(true);
    } else {
      setReportOpen(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportSubmitted || reportSubmitting) return;
    if (!reportCategory || reportMessage.trim().length < 10 || !reportAgree) return;
    setReportSubmitting(true);
    try {
      const resp = await api.submitReport({
        type: "sms",
        content: reportMessage,
        category: reportCategory as never,
        agreeShare: reportAgree,
      });
      setReportReceipt(resp);
      setReportSubmitted(true);
      setReportOpen(false);
    } catch (e) {
      if (e instanceof ApiException) {
        alert(`신고 접수 실패: ${e.message}`);
      } else {
        alert("신고 접수 중 알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleReAnalyze = () => {
    navigate("/analyze");
  };

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto">
        <ErrorState
          type={errorType}
          title={errorType === "unknown" ? "분석에 실패했어요" : undefined}
          description={errorType === "unknown" ? error : undefined}
          onRetry={handleReAnalyze}
          showHome
          onHome={() => navigate("/")}
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-white/60">분석 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>
          분석 결과
        </h1>
        <p className="text-sm text-gray-600 dark:text-white/60">
          입력하신 문자에 대한 종합 분석 결과입니다.
        </p>
      </motion.div>

      {/* 원본 문자 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
      >
        <p className="text-xs text-gray-500 dark:text-white/40 mb-2">검사한 문자</p>
        <div className="max-h-32 overflow-y-auto">
          <p className="text-sm text-gray-800 dark:text-white/80 leading-relaxed whitespace-pre-wrap break-words">
            {text}
          </p>
        </div>
      </motion.div>

      {/* 카드 섹션 */}
      <div className="space-y-4 mb-8">
        {/* 1. 위험도 카드 */}
        <RiskLevelCard
          riskLevel={result.risk_level}
          riskScore={result.risk_score}
          smishingType={result.smishing_type}
        />

        {/* 2. 탐지 근거 카드 */}
        <DetectionReasonsCard reasons={result.reasons} riskLevel={result.risk_level} />

        {/* 4. 예상 피해 시나리오 카드 */}
        <DamageScenarioCard riskLevel={result.risk_level} />

        {/* 5. 대응 가이드 카드 */}
        <ActionGuideCard actionGuide={result.action_guide} riskLevel={result.risk_level} />
      </div>

      {/* 피드백 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-6 p-5 rounded-xl bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10"
      >
        <p className="text-sm text-gray-700 dark:text-white/70 mb-3">이 분석 결과가 도움이 되었나요?</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleFeedback(true)}
            disabled={feedback !== null}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              feedback === "correct"
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30"
                : "bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10"
            }`}
          >
            <ThumbsUp size={14} />
            맞아요
          </button>
          <button
            onClick={() => handleFeedback(false)}
            disabled={feedback !== null}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              feedback === "incorrect"
                ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700/30"
                : "bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/8 border border-gray-200 dark:border-white/10"
            }`}
          >
            <ThumbsDown size={14} />
            틀렸어요
          </button>
        </div>
        {feedback && (
          <p className="text-xs text-gray-500 dark:text-white/50 mt-3">
            소중한 피드백 감사합니다. 더 나은 서비스를 제공하는 데 활용하겠습니다.
          </p>
        )}
      </motion.div>

      {/* 액션 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
      >
        <button
          onClick={handleReportToggle}
          disabled={reportSubmitted}
          className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl transition-colors border min-h-[80px] ${
            reportSubmitted
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/30 cursor-default"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-700/30"
          }`}
        >
          {reportSubmitted ? <CheckCircle size={18} /> : <Flag size={18} />}
          <span className="text-xs" style={{ fontWeight: 600 }}>{reportSubmitted ? "신고 완료" : "신고하기"}</span>
        </button>
        <button
          onClick={handleShare}
          className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors border border-gray-200 dark:border-white/10 min-h-[80px]"
        >
          <Share2 size={18} />
          <span className="text-xs" style={{ fontWeight: 600 }}>결과 공유</span>
        </button>
        <button
          onClick={handleReAnalyze}
          className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors border border-gray-200 dark:border-white/10 min-h-[80px]"
        >
          <RotateCcw size={18} />
          <span className="text-xs" style={{ fontWeight: 600 }}>다시 검사</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors border border-gray-200 dark:border-white/10 min-h-[80px]"
        >
          <Home size={18} />
          <span className="text-xs" style={{ fontWeight: 600 }}>홈으로</span>
        </button>
      </motion.div>

      {/* 인라인 신고 폼 — ReportPage /report 라우터 기능을 이 페이지에 통합. 1회만 제출 가능 */}
      <AnimatePresence>
        {reportOpen && !reportSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 overflow-hidden"
          >
            <form
              onSubmit={handleReportSubmit}
              className="p-5 rounded-2xl bg-white dark:bg-[#111c30] border border-red-200 dark:border-red-700/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <Flag size={14} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">스미싱 신고</span>
                <span className="text-[10px] text-gray-500 dark:text-white/40 ml-1">1회만 신고 가능</span>
              </div>

              <label className="block mb-2">
                <span className="text-xs text-gray-600 dark:text-white/60">신고 유형 (자동 추천)</span>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d1526] text-gray-900 dark:text-white"
                >
                  <option value="">선택하세요</option>
                  <option value="공공기관 사칭">공공기관 사칭</option>
                  <option value="금융 피싱">금융 피싱</option>
                  <option value="택배 사기">택배 사기</option>
                  <option value="이벤트 사기">이벤트/경품 사기</option>
                  <option value="대출 사기">대출/투자 사기</option>
                  <option value="기타 사기">기타</option>
                </select>
              </label>

              <label className="block mb-2">
                <span className="text-xs text-gray-600 dark:text-white/60">신고할 메시지 내용 (10자 이상)</span>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d1526] text-gray-900 dark:text-white resize-none"
                />
                <span className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5 block">{reportMessage.trim().length}자</span>
              </label>

              <label className="flex items-start gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportAgree}
                  onChange={(e) => setReportAgree(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11px] text-gray-600 dark:text-white/60 leading-relaxed">
                  신고 내용이 <strong className="text-gray-800 dark:text-white/80">마스킹·익명화 처리</strong>되어
                  {" "}<strong className="text-gray-800 dark:text-white/80">AI 모델 학습 데이터</strong>로 활용되는 것에 동의합니다.
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!reportCategory || reportMessage.trim().length < 10 || !reportAgree || reportSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white text-sm transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  <Send size={14} />
                  {reportSubmitting ? "신고 접수 중..." : "신고 접수"}
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70 text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          </motion.div>
        )}
        {reportSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/30 flex items-center gap-3"
          >
            <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">신고가 접수되었습니다</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                신고 내용은 마스킹 처리되어 KISA·경찰청 사이버범죄 통계에 자동 적재됩니다.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 정직한 데이터 처리 안내 — 검사 결과 박스 하단 */}
      <div className="mt-6 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
        <ShieldCheck size={13} className="text-gray-400 dark:text-white/40 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 dark:text-white/50 leading-relaxed">
          <strong className="text-gray-700 dark:text-white/70">개인정보(전화번호, 이름, 계좌번호 등)는 자동으로 마스킹 처리된 후에만 데이터 품질 개선 목적</strong>으로 활용됩니다.
          원본 문자는 저장되지 않으며, 해당 기능은 관리자 승인 후에만 활성화됩니다.
        </p>
      </div>
    </div>
  );
}
