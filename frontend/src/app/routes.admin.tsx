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
 * 라우트 정리 (6/19, 6/22, 6/23):
 *   - 24개 라우트 → 2개로 축소 (실제 사용 라우트만 유지)
 *   - 유지: admin (AdminLogin), compare
 *   - 6/23 추가 제거: dashboard, health (mock 가짜 데이터 페이지)
 *   - 제거 (dead 컴포넌트 20개 + 라우트 23개):
 *     dashboard, health, simulator, live-feed, export, attention, bulk,
 *     patterns, dataset, model, zero-day, api, settings, error-analysis,
 *     redteam, audit, feature-importance, ioc, feedback,
 *     benchmark, ab-test
 */
import { lazy } from "react";
import { redirect, type RouteObject } from "react-router";

const AdminLogin = lazy(() => import("./components/AdminLogin").then((m) => ({ default: m.AdminLogin })));
const CompareAnalysis = lazy(() => import("./components/CompareAnalysis").then((m) => ({ default: m.CompareAnalysis })));

/**
 * DEV-only 라우트. vite build 시 import.meta.env.DEV === false 로
 * 인라인되어 이 라우트들은 router 에 포함되지 않음.
 *
 * 라우트 가드: nb_admin_auth(localStorage) 체크 → 권한 없으면 "/" redirect.
 * React Router 7는 Response.redirect 대신 throw redirect(...) 사용.
 */
const STORAGE_KEY = "nb_admin_auth";

function adminGuard() {
  if (import.meta.env.DEV) {
    const isAdmin = localStorage.getItem(STORAGE_KEY) === "true";
    if (!isAdmin) {
      throw redirect("/");
    }
  }
  return null;
}

export const adminRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: "admin", Component: AdminLogin },
      { path: "compare", Component: CompareAnalysis, loader: adminGuard },
    ]
  : [];
