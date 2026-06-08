import { motion } from "motion/react";
import { Shield, CheckCircle2, XCircle } from "lucide-react";

interface Criterion {
  label: string;
  detected: boolean;
}

interface GovernmentCriteriaCardProps {
  riskLevel: "danger" | "warning" | "normal";
  hasUrl: boolean;
  hasImpersonation: boolean;
  hasPaymentRequest: boolean;
  hasPersonalInfoRequest: boolean;
}

export function GovernmentCriteriaCard({
  riskLevel,
  hasUrl,
  hasImpersonation,
  hasPaymentRequest,
  hasPersonalInfoRequest,
}: GovernmentCriteriaCardProps) {
  const criteria: Criterion[] = [
    { label: "URL 포함 여부", detected: hasUrl },
    { label: "기관 사칭 여부", detected: hasImpersonation },
    { label: "금전 요구 여부", detected: hasPaymentRequest },
    { label: "개인정보 요구 여부", detected: hasPersonalInfoRequest },
  ];

  const detectedCount = criteria.filter((c) => c.detected).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} className="text-gray-600 dark:text-white/60" />
        <h3 className="text-base text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
          정부기관 기준
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
        과학기술정보통신부 및 금융감독원 기준 {detectedCount}개 항목 해당
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {criteria.map((criterion, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.05 }}
            className={`p-3 rounded-xl border ${
              criterion.detected
                ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700/30"
                : "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {criterion.detected ? (
                <XCircle size={14} className="text-red-600 dark:text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <span
                className={`text-xs ${
                  criterion.detected
                    ? "text-red-700 dark:text-red-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
                style={{ fontWeight: 600 }}
              >
                {criterion.detected ? "감지됨" : "감지 안됨"}
              </span>
            </div>
            <p className="text-xs text-gray-700 dark:text-white/70 break-words">{criterion.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
