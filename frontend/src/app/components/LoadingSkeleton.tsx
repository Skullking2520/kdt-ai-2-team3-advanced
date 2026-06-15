import { Skeleton } from "./ui/Primitives";

/* ────────────────────────── 로딩 스켈레톤 (공통) ────────────────────────── */

export interface LoadingSkeletonProps {
  variant?: "card" | "list" | "detail" | "row";
  count?: number;
  className?: string;
}

/**
 * 로딩 상태 UI — 모든 비동기 데이터 fetch 시 사용
 * - variant="card": 카드 1개 (제목 + 본문 3줄)
 * - variant="list": N개 row (이력/사례 리스트)
 * - variant="detail": 분석 결과 화면 (큰 영역)
 * - variant="row": 단일 row
 */
export function LoadingSkeleton({
  variant = "card",
  count = 1,
  className = "",
}: LoadingSkeletonProps) {
  if (variant === "list") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-[#111c30] border border-white/10 rounded-2xl p-4 flex items-center gap-3"
          >
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="w-12 h-5 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* 위험도 카드 */}
        <div className="bg-[#111c30] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        {/* 본문 카드 1 */}
        <div className="bg-[#111c30] border border-white/10 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        {/* 본문 카드 2 */}
        <div className="bg-[#111c30] border border-white/10 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div
        className={`bg-[#111c30] border border-white/10 rounded-2xl p-4 flex items-center gap-3 ${className}`}
      >
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
    );
  }

  // default: card
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#111c30] border border-white/10 rounded-2xl p-5 space-y-3"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}
