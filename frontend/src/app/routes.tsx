import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { NotFound } from "./components/NotFound";
import { publicRoutes } from "./routes.public";
import { adminRoutes } from "./routes.admin";

/**
 * Public + Admin 라우트를 합쳐서 router 생성.
 * - public: 실서비스 빌드에 항상 포함
 * - admin: DEV에서만 등록 (routes.admin.tsx의 import.meta.env.DEV 가드)
 *   → vite build 시 adminRoutes === [] 이므로 Vite의 dead code elimination으로
 *     admin 컴포넌트들의 import 자체도 bundle에서 빠질 수 있음
 *   → 실제 빠지는지는 `npm run build` 후 dist/ 번들 grep으로 확인
 *
 * 마지막 catch-all (*)은 404 페이지.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      ...publicRoutes,
      ...adminRoutes,
    ],
  },
  { path: "*", Component: NotFound },
]);
