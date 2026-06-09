import {motion} from "motion/react";
import {
AlertTriangle,
WifiOff,
Clock,
ServerCrash,
RefreshCw,
Home,
} from "lucide-react";

/* ────────────────────────── 에러 상태 (공통) ────────────────────────── */

const ERROR_TYPES = {
  network: {
    icon: WifiOff,
    title: "인터넷 연결을 확인해주세요",
    description: "네트워크가 불안정합니다. 잠시 후 다시 시도해주세요.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  timeout: {
    icon: Clock,
    title: "요청 시간이 초과됐어요",
    description: "서버 응답이 늦고 있습니다. 잠시 후 다시 시도해주세요.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  server: {
    icon: ServerCrash,
    title: "서버에 일시적인 문제가 발생했어요",
    description: "잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터에 문의해주세요.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  unknown: {
    icon: AlertTriangle,
    title: "알 수 없는 오류가 발생했어요",
    description: "잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터에 문의해주세요.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  ocr: {
    icon: AlertTriangle,
    title: "이미지에서 텍스트를 찾을 수 없어요",
    description: "선명한 이미지를 사용하거나, 직접 입력해보세요.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
} as const;

export type ErrorType = keyof typeof ERROR_TYPES;

export interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onHome?: () => void;
  showHome?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * 에러 상태 UI — 모든 API 실패/예외 상황에서 사용
 * - type="network": fetch 실패 / 오프라인
 * - type="timeout": 타임아웃
 * - type="server": 5xx 서버 에러
 * - type="unknown": 4xx 클라이언트 에러 / 기타
 * - type="ocr": OCR 결과 없음
 */
export function ErrorState({
  type = "unknown",
  title,
  description,
  onRetry,
  retryLabel = "다시 시도",
  onHome,
  showHome = true,
  size = "md",
}: ErrorStateProps) {
  const cfg = ERROR_TYPES[type];
  const Icon = cfg.icon;

  const sizes = {
    sm: { wrap: "py-8", iconBox: "w-12 h-12", iconSize: 20, title: "text-sm" },
    md: { wrap: "py-12", iconBox: "w-16 h-16", iconSize: 28, title: "text-base" },
    lg: { wrap: "py-16", iconBox: "w-20 h-20", iconSize: 36, title: "text-lg" },
  }[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center text-center ${sizes.wrap}`}
    >
      <div
        className={`${sizes.iconBox} rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center mb-4`}
      >
        <Icon size={sizes.iconSize} className={cfg.color} />
      </div>
      <h3 className={`${sizes.title} text-white/80 mb-1.5`} style={{ fontWeight: 600 }}>
        {title ?? cfg.title}
      </h3>
      <p className="text-sm text-white/40 max-w-sm mb-5 leading-relaxed">
        {description ?? cfg.description}
      </p>
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            style={{ fontWeight: 600 }}
          >
            <RefreshCw size={14} />
            {retryLabel}
          </button>
        )}
        {showHome && onHome && (
          <button
            onClick={onHome}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            <Home size={14} />
            홈으로
          </button>
        )}
      </div>
    </motion.div>
  );
}
