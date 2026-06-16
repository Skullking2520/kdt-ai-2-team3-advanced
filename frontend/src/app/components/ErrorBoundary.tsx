import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Link } from "react-router";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** fallback 만 다른 케이스(라우팅별)로 쓰고 싶을 때 확장 여지 */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 전역 ErrorBoundary — 자식 트리에서 throw 된 에러를 잡아서
 * 한국어 fallback UI 로 사용자에게 보여주고, 콘솔에 로깅.
 *
 * 라우트 단위로 감싸면 페이지 단위 복구가 가능. App.tsx 에서
 * RouterProvider 바깥쪽을 한 번 더 감싸면 라우터 자체 에러도 커버.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 콘솔 로깅 — Sentry 같은 외부 로거 도입 시 여기서 전송
    console.error("[ErrorBoundary] caught:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700/30 mb-6">
            <AlertTriangle size={36} className="text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>
            일시적인 오류가 발생했어요
          </h1>
          <p className="text-sm text-gray-600 dark:text-white/60 mb-6 leading-relaxed">
            화면을 불러오는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.
            <br />
            문제가 계속되면 관리자에게 문의해 주세요.
          </p>
          {this.state.error && (
            <pre className="text-left text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 mb-6 overflow-x-auto text-gray-600 dark:text-white/50">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={14} />
              다시 시도
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#2563EB", fontWeight: 600 }}
            >
              <Home size={14} />
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
