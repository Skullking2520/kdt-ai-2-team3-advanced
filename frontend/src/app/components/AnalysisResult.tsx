import {useState, useEffect} from "react";
import {useParams, useSearchParams, useNavigate} from "react-router";
import {motion} from "motion/react";
import {ThumbsUp, ThumbsDown, Flag, Share2, RotateCcw, Home} from "lucide-react";
import {RiskLevelCard} from "./result/RiskLevelCard";
import {DetectionReasonsCard} from "./result/DetectionReasonsCard";
import {SimilarCasesCard} from "./result/SimilarCasesCard";
import {DamageScenarioCard} from "./result/DamageScenarioCard";
import {ActionGuideCard} from "./result/ActionGuideCard";
import {GovernmentCriteriaCard} from "./result/GovernmentCriteriaCard";
import {analyzeSms, toLegacyRiskLevel} from "@/lib/smsAnalysis";

interface AnalysisResult {
  risk_level: "danger" | "warning" | "normal";
  risk_score: number;
  smishing_type: string;
  reasons: string[];
  action_guide: string[];
  similar_cases: { title: string; similarity: number; year: string }[];
  has_url: boolean;
  has_impersonation: boolean;
  has_payment_request: boolean;
  has_personal_info_request: boolean;
}

// 분석 로직은 src/lib/smsAnalysis.ts 의 analyzeSms 사용 (API Contract RiskLevel 통일)
// 레거시 키(danger/warning/normal) 호환을 위해 toLegacyRiskLevel 어댑터 적용.

export function AnalysisResult() {
  const { _id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const text = searchParams.get("text") || "";
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  useEffect(() => {
    if (text) {
      const sms = analyzeSms(text);
      setResult({
        risk_level: toLegacyRiskLevel(sms.risk_level),
        risk_score: sms.risk_score,
        smishing_type: sms.smishing_type,
        reasons: sms.reasons,
        action_guide: sms.action_guide,
        similar_cases: sms.similar_cases,
        has_url: sms.has_url,
        has_impersonation: sms.has_impersonation,
        has_payment_request: sms.has_payment_request,
        has_personal_info_request: sms.has_personal_info_request,
      });
    }
  }, [text]);

  const handleFeedback = (isCorrect: boolean) => {
    setFeedback(isCorrect ? "correct" : "incorrect");
    // 실제로는 API로 피드백 전송
  };

  const handleShare = () => {
    // 공유 기능
    alert("결과 공유 기능 (향후 구현)");
  };

  const handleReport = () => {
    navigate(`/report?text=${encodeURIComponent(text)}`);
  };

  const handleReAnalyze = () => {
    navigate("/analyze");
  };

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

        {/* 3. 유사 사례 카드 */}
        {result.similar_cases.length > 0 && <SimilarCasesCard cases={result.similar_cases} />}

        {/* 4. 예상 피해 시나리오 카드 */}
        <DamageScenarioCard riskLevel={result.risk_level} />

        {/* 5. 대응 가이드 카드 */}
        <ActionGuideCard actionGuide={result.action_guide} riskLevel={result.risk_level} />

        {/* 6. 정부기관 기준 카드 */}
        <GovernmentCriteriaCard
          riskLevel={result.risk_level}
          hasUrl={result.has_url}
          hasImpersonation={result.has_impersonation}
          hasPaymentRequest={result.has_payment_request}
          hasPersonalInfoRequest={result.has_personal_info_request}
        />
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
          onClick={handleReport}
          className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-700/30 min-h-[80px]"
        >
          <Flag size={18} />
          <span className="text-xs" style={{ fontWeight: 600 }}>신고하기</span>
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
    </div>
  );
}
