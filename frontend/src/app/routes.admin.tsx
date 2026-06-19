/**
 * Admin / Research / Developer Routes — DEV 빌드에서만 등록
 *
 * 실서비스에서는 접근 불가. 클라이언트 사이드 비밀번호도 폐기 —
 * 본 라우트들은 import.meta.env.DEV 일 때만 router 에 합쳐져서,
 * vite build 시점에 DEV === false 로 인라인되어 dead code 로 제거됨.
 *
 * 단, 정적 import 자체는 build 에 남을 수 있으므로, 본 라우트에
 * 민감 정보(키, 비밀번호 등)를 두지 말 것.
 *
 * 각 Admin 페이지는 React.lazy 로 동적 import → 첫 페이지 로드 시
 * prod 번들에서 제외되어 초기 번들 크기 감소.
 *
 * 라우트 정리 (6/19):
 *   - 24개 라우트 → 5개로 축소 (실제 사용 라우트만 유지)
 *   - 유지: dashboard, compare, benchmark, ab-test, health
 *   - 제거 (dead 컴포넌트 16개 + 라우트 19개):
 *     simulator, live-feed, export, attention, bulk, patterns,
 *     dataset, model, zero-day, api, settings, admin, error-analysis,
 *     redteam, audit, feature-importance, ioc, feedback
 */
import { lazy } from "react";
import type { RouteObject } from "react-router";

const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })));
const Benchmark = lazy(() => import("./components/Benchmark").then((m) => ({ default: m.Benchmark })));
const CompareAnalysis = lazy(() => import("./components/CompareAnalysis").then((m) => ({ default: m.CompareAnalysis })));
const ABTest = lazy(() => import("./components/ABTest").then((m) => ({ default: m.ABTest })));
const SystemHealth = lazy(() => import("./components/SystemHealth").then((m) => ({ default: m.SystemHealth })));

/**
 * DEV-only 라우트. vite build 시 import.meta.env.DEV === false 로
 * 인라인되어 이 라우트들은 router 에 포함되지 않음.
 *
 * 라우트 가드: nb_admin_auth(localStorage) 체크 → 권한 없으면 "/" redirect.
 * Dashboard는 자체 LoginGate를 가지므로 별도 가드 없이 진입 가능.
 */
const STORAGE_KEY = "nb_admin_auth";

function adminGuard({ request }: { request: Request }) {
  if (import.meta.env.DEV) {
    const isAdmin = localStorage.getItem(STORAGE_KEY) === "true";
    if (!isAdmin) {
      return Response.redirect(new URL("/", request.url), 302);
    }
  }
  return null;
}

export const adminRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: "compare", Component: CompareAnalysis, loader: adminGuard },
      { path: "dashboard", Component: Dashboard },
      { path: "benchmark", Component: Benchmark, loader: adminGuard },
      { path: "ab-test", Component: ABTest, loader: adminGuard },
      { path: "health", Component: SystemHealth, loader: adminGuard },
    ]
  : [];