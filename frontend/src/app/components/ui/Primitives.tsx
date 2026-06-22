import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

/* ─────────────────────────── Card ─────────────────────────── */
export function Card({ children, className = "", padding = "p-5" }: {
  children: React.ReactNode; className?: string; padding?: string;
}) {
  return (
    <div className={`bg-[#111c30] border border-white/10 rounded-2xl ${padding} ${className}`}>
      {children}
    </div>
  );
}

/* ───────────────────────── 큰 메트릭 카드 (애니메이션 카운터) ───────────────────────── */
export function MetricBig({
  value, label, sublabel, icon: Icon, accent = "cyan", trend,
}: {
  value: number;
  label: string;
  sublabel?: string;
  icon?: LucideIcon;
  accent?: "cyan" | "red" | "emerald" | "amber";
  trend?: { value: number; label: string };
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 1200;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(value * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const palette = {
    cyan: { from: "from-cyan-500/15", border: "border-cyan-500/25", text: "text-cyan-300", bg: "bg-cyan-500/10" },
    red: { from: "from-red-500/15", border: "border-red-500/25", text: "text-red-300", bg: "bg-red-500/10" },
    emerald: { from: "from-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-300", bg: "bg-emerald-500/10" },
    amber: { from: "from-amber-500/15", border: "border-amber-500/25", text: "text-amber-300", bg: "bg-amber-500/10" },
  }[accent];

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${palette.from} to-transparent ${palette.border} p-6`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-white/55 mb-1">{label}</p>
          {sublabel && <p className="text-[10px] text-white/30">{sublabel}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${palette.bg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={palette.text} />
          </div>
        )}
      </div>
      <p className={palette.text} style={{ fontWeight: 800, fontSize: "2.2rem", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {display.toLocaleString("ko-KR")}
        <span className="text-base text-white/40 ml-1" style={{ fontWeight: 500 }}>건</span>
      </p>
      {trend && (
        <p className="text-[11px] text-white/40 mt-2">
          <span className={trend.value >= 0 ? "text-red-300" : "text-emerald-300"}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>{" "}
          {trend.label}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── 섹션 헤더 ───────────────────────── */
export function SectionHeader({ title, action, sub }: {
  title: string; action?: { label: string; onClick: () => void }; sub?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-3 px-1">
      <div>
        <h2 className="text-white text-base" style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
        {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="flex items-center gap-0.5 text-[11px] text-white/45 hover:text-white/80 transition-all">
          {action.label} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── 라이브 피드 아이템 ───────────────────────── */
export function FeedItem({
  level, sender, preview, time, onClick,
}: {
  level: "HIGH" | "MEDIUM" | "LOW";
  sender: string;
  preview: string;
  time: string;
  onClick?: () => void;
}) {
  const cfg = {
    HIGH: { dot: "bg-red-500", text: "text-red-300", bg: "bg-red-500/8", label: "위험" },
    MEDIUM: { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/8", label: "주의" },
    LOW: { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/8", label: "안전" },
  }[level];

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border border-white/8 ${cfg.bg} hover:border-white/20 transition-all`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
        <span className={`text-[10px] ${cfg.text}`} style={{ fontWeight: 700 }}>{cfg.label}</span>
        <span className="text-[10px] text-white/30 truncate">· {sender}</span>
        <span className="ml-auto text-[10px] text-white/30 shrink-0">{time}</span>
      </div>
      <p className="text-xs text-white/70 truncate">{preview}</p>
    </motion.button>
  );
}


