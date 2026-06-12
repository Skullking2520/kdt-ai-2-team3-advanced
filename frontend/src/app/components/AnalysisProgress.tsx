import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, FileText, Search, Database, Sparkles, X } from "lucide-react";

interface AnalysisStep {
  id: number;
  icon: React.ElementType;
  label: string;
  duration: number; // milliseconds
}

const STEPS: AnalysisStep[] = [
  { id: 1, icon: FileText, label: "입력 확인 중", duration: 500 },
  { id: 2, icon: Search, label: "문자 분석 중", duration: 1000 },
  { id: 3, icon: Database, label: "유사 사례 검색 중", duration: 1000 },
  { id: 4, icon: Sparkles, label: "결과 생성 중", duration: 700 },
];

export function AnalysisProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const text = searchParams.get("text") || "";
  const type = searchParams.get("type") || "sms"; // sms, url, image

  useEffect(() => {
    if (currentStep >= STEPS.length) {
      // 모든 단계 완료 - 결과 페이지로 이동 (preloadedResult state 그대로 전달)
      const resultId = `result-${Date.now()}`;
      navigate(`/analyze/result/${resultId}?text=${encodeURIComponent(text)}&type=${type}`, { state });
      return;
    }

    const step = STEPS[currentStep];
    const startTime = Date.now();
    const interval = 50; // 50ms마다 진행률 업데이트

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const stepProgress = Math.min((elapsed / step.duration) * 100, 100);

      // 전체 진행률: (완료된 단계 + 현재 단계 진행률) / 전체 단계
      const totalProgress = ((currentStep + stepProgress / 100) / STEPS.length) * 100;
      setProgress(totalProgress);

      if (elapsed >= step.duration) {
        clearInterval(timer);
        setCurrentStep((prev) => prev + 1);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentStep, navigate, text, type]);

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-lg dark:shadow-black/20">

          {/* 헤더 */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"
            >
              <Loader2 size={28} className="text-blue-600 dark:text-blue-400" />
            </motion.div>
            <h2 className="text-xl text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>
              분석 진행 중
            </h2>
            <p className="text-sm text-gray-500 dark:text-white/40">
              잠시만 기다려주세요
            </p>
          </div>

          {/* 진행 바 */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/40 mb-2">
              <span>진행률</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* 단계 리스트 */}
          <div className="space-y-3 mb-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isPending = index > currentStep;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCurrent
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30"
                      : isCompleted
                      ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/20"
                      : "bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-gray-100 dark:bg-white/5"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2
                        size={16}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      >
                        <Icon size={16} className="text-blue-600 dark:text-blue-400" />
                      </motion.div>
                    ) : (
                      <Icon size={16} className="text-gray-400 dark:text-white/30" />
                    )}
                  </div>
                  <span
                    className={`text-sm flex-1 ${
                      isCurrent
                        ? "text-blue-700 dark:text-blue-400 font-medium"
                        : isCompleted
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-gray-500 dark:text-white/40"
                    }`}
                  >
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* 취소 버튼 */}
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-gray-200 dark:border-white/10"
          >
            <X size={14} />
            취소
          </button>
        </div>
      </motion.div>
    </div>
  );
}
