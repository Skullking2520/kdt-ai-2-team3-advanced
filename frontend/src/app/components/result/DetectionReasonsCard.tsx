import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface DetectionReasonsCardProps {
  reasons: string[];
  riskLevel: "danger" | "warning" | "normal";
}

export function DetectionReasonsCard({ reasons, riskLevel }: DetectionReasonsCardProps) {
  const isDanger = riskLevel === "danger";
  const isWarning = riskLevel === "warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={18} className="text-gray-600 dark:text-white/60" />
        <h3 className="text-base text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
          탐지 근거
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
        다음과 같은 이유로 {isDanger ? "위험" : isWarning ? "주의" : "정상"} 판정되었습니다.
      </p>

      <div className="space-y-3">
        {reasons.map((reason, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5"
          >
            <div className="shrink-0 mt-0.5">
              {isDanger || isWarning ? (
                <XCircle size={16} className="text-red-500 dark:text-red-400" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">{reason}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
