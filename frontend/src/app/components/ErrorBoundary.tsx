import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * 최상위 에러 캐치용. 어딘가에서 동적 import/이전 module reference로 ErrorBoundary.tsx를
 * 찾는 Vite HMR이 있을 때 404 throw → 페이지 전체가 빈 화면이 되는 현상 방지용 stub.
 * 실제 import는 라우트에 없음 (grep 0개). 안전망으로만 존재.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0a0f1c]">
          <div className="max-w-md text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              오류가 발생했습니다
            </p>
            <p className="text-sm text-gray-500 dark:text-white/60 mb-4">
              페이지를 다시 불러와 주세요.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
