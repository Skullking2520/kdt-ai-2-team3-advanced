import {useNavigate} from "react-router";
import {motion} from "motion/react";
import {
Inbox,
Search,
FileText,
Users,
AlertTriangle,
TrendingUp,
History,
} from "lucide-react";

/* ────────────────────────── 데이터 없는 상태 (공통) ────────────────────────── */

const ICONS = {
  history: History,
  cases: FileText,
  search: Search,
  inbox: Inbox,
  users: Users,
  alert: AlertTriangle,
  trend: TrendingUp,
} as const;

export type EmptyIcon = keyof typeof ICONS;

export interface EmptyStateProps {
  icon?: EmptyIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  size?: "sm" | "md" | "lg";
}

/**
 * 빈 상태 UI — 데이터가 없을 때 사용
 * - History: 검사 이력 0건
 * - Cases: 사례 0건
 * - Quiz: 결과 0건
 * - Trend: 차트 데이터 없음
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  size = "md",
}: EmptyStateProps) {
  const nav = useNavigate();
  const Icon = ICONS[icon];

  const sizes = {
    sm: { wrap: "py-8", iconBox: "w-12 h-12", iconSize: 20, title: "text-sm" },
    md: { wrap: "py-12", iconBox: "w-16 h-16", iconSize: 28, title: "text-base" },
    lg: { wrap: "py-16", iconBox: "w-20 h-20", iconSize: 36, title: "text-lg" },
  }[size];

  const handleAction = () => {
    if (action?.onClick) action.onClick();
    else if (action?.to) nav(action.to);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center text-center ${sizes.wrap}`}
    >
      <div className={`${sizes.iconBox} rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4`}>
        <Icon size={sizes.iconSize} className="text-white/40" />
      </div>
      <h3 className={`${sizes.title} text-white/80 mb-1.5`} style={{ fontWeight: 600 }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-white/40 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={handleAction}
          className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          style={{ fontWeight: 600 }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
