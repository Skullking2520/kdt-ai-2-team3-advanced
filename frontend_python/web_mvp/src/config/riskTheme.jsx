import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const RISK_THEME = {
  낮음: {
    label: "낮음",
    headline: "스미싱이 아닐 가능성이 높아요.",
    panel: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    bar: "bg-emerald-600",
    icon: CheckCircle2,
  },
  주의: {
    label: "주의",
    headline: "문자 안의 링크나 입력 요청은 진행하지 마세요.",
    panel: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-950 ring-amber-200",
    bar: "bg-amber-500",
    icon: AlertTriangle,
  },
  위험: {
    label: "위험",
    headline: "스미싱 가능성이 높아요. 바로 행동하지 마세요.",
    panel: "border-rose-200 bg-rose-50",
    badge: "bg-rose-100 text-rose-900 ring-rose-200",
    bar: "bg-rose-600",
    icon: AlertTriangle,
  },
};

