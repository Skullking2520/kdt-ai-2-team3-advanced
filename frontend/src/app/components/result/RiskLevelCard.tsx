import { motion } from "motion/react";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";

interface RiskLevelCardProps {
  riskLevel: "danger" | "warning" | "normal";
  riskScore: number;
  smishingType: string;
}

const riskConfig = {
  danger: {
    label: "위험",
    sublabel: "스미싱 가능성 매우 높음",
    badge: "즉시 삭제 권장",
    icon: ShieldAlert,
    bgClass: "bg-red-50 dark:bg-red-900/15",
    borderClass: "border-red-200 dark:border-red-700/30",
    textClass: "text-red-700 dark:text-red-400",
    iconBgClass: "bg-red-100 dark:bg-red-900/30",
    badgeBgClass: "bg-red-100 dark:bg-red-900/30",
    scoreColor: "#EF4444",
  },
  warning: {
    label: "주의",
    sublabel: "의심스러운 요소 있음",
    badge: "주의 필요",
    icon: AlertTriangle,
    bgClass: "bg-amber-50 dark:bg-amber-900/15",
    borderClass: "border-amber-200 dark:border-amber-700/30",
    textClass: "text-amber-700 dark:text-amber-400",
    iconBgClass: "bg-amber-100 dark:bg-amber-900/30",
    badgeBgClass: "bg-amber-100 dark:bg-amber-900/30",
    scoreColor: "#F59E0B",
  },
  normal: {
    label: "정상",
    sublabel: "위험 요소 없음",
    badge: "안전",
    icon: ShieldCheck,
    bgClass: "bg-emerald-50 dark:bg-emerald-900/15",
    borderClass: "border-emerald-200 dark:border-emerald-700/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
    iconBgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeBgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    scoreColor: "#22C55E",
  },
};

export function RiskLevelCard({ riskLevel, riskScore, smishingType }: RiskLevelCardProps) {
  const config = riskConfig[riskLevel];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-6 ${config.bgClass} ${config.borderClass}`}
    >
      {/* 상단: 배지 */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-xs px-3 py-1 rounded-full ${config.badgeBgClass} ${config.textClass}`}
          style={{ fontWeight: 600 }}
        >
          {config.badge}
        </span>
      </div>

      {/* 중앙: 아이콘 + 레벨 */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${config.iconBgClass}`}>
          <Icon size={28} className={`sm:w-8 sm:h-8 ${config.textClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl sm:text-2xl mb-1 ${config.textClass}`} style={{ fontWeight: 700 }}>
            {config.label}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-white/50">{config.sublabel}</p>
        </div>
      </div>

      {/* 점수 표시 */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/40 mb-1">
            <span>위험도 점수</span>
            <span style={{ fontWeight: 600 }}>{riskScore} / 100</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${riskScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: config.scoreColor }}
            />
          </div>
        </div>
      </div>

      {/* 공격 유형 */}
      <div className="pt-3 border-t border-gray-200 dark:border-white/10">
        <p className="text-xs text-gray-500 dark:text-white/40 mb-1">공격 유형</p>
        <p className={`text-sm ${config.textClass}`} style={{ fontWeight: 600 }}>
          {smishingType}
        </p>
      </div>
    </motion.div>
  );
}
