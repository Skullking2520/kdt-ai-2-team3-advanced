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
 */
import { lazy } from "react";
import type { RouteObject } from "react-router";

const AdminPanel = lazy(() => import("./components/AdminPanel").then((m) => ({ default: m.AdminPanel })));
const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })));
const SMSSimulator = lazy(() => import("./components/SMSSimulator").then((m) => ({ default: m.SMSSimulator })));
const LiveFeed = lazy(() => import("./components/LiveFeed").then((m) => ({ default: m.LiveFeed })));
const ReportExport = lazy(() => import("./components/ReportExport").then((m) => ({ default: m.ReportExport })));
const AttentionViz = lazy(() => import("./components/AttentionViz").then((m) => ({ default: m.AttentionViz })));
const ModelArchitecture = lazy(() => import("./components/ModelArchitecture").then((m) => ({ default: m.ModelArchitecture })));
const APIExplorer = lazy(() => import("./components/APIExplorer").then((m) => ({ default: m.APIExplorer })));
const Settings = lazy(() => import("./components/Settings").then((m) => ({ default: m.Settings })));
const Benchmark = lazy(() => import("./components/Benchmark").then((m) => ({ default: m.Benchmark })));
const DatasetStats = lazy(() => import("./components/DatasetStats").then((m) => ({ default: m.DatasetStats })));
const PatternDB = lazy(() => import("./components/PatternDB").then((m) => ({ default: m.PatternDB })));
const ZeroDayExplainer = lazy(() => import("./components/ZeroDayExplainer").then((m) => ({ default: m.ZeroDayExplainer })));
const ErrorAnalysis = lazy(() => import("./components/ErrorAnalysis").then((m) => ({ default: m.ErrorAnalysis })));
const RedTeam = lazy(() => import("./components/RedTeam").then((m) => ({ default: m.RedTeam })));
const BulkAnalysis = lazy(() => import("./components/BulkAnalysis").then((m) => ({ default: m.BulkAnalysis })));
const CompareAnalysis = lazy(() => import("./components/CompareAnalysis").then((m) => ({ default: m.CompareAnalysis })));
const AuditLog = lazy(() => import("./components/AuditLog").then((m) => ({ default: m.AuditLog })));
const ABTest = lazy(() => import("./components/ABTest").then((m) => ({ default: m.ABTest })));
const FeatureImportance = lazy(() => import("./components/FeatureImportance").then((m) => ({ default: m.FeatureImportance })));
const IOCList = lazy(() => import("./components/IOCList").then((m) => ({ default: m.IOCList })));
const SystemHealth = lazy(() => import("./components/SystemHealth").then((m) => ({ default: m.SystemHealth })));

/**
 * DEV-only 라우트. vite build 시 import.meta.env.DEV === false 로
 * 인라인되어 이 라우트들은 router 에 포함되지 않음.
 */
export const adminRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: "simulator", Component: SMSSimulator },
      { path: "live-feed", Component: LiveFeed },
      { path: "export", Component: ReportExport },
      { path: "attention", Component: AttentionViz },
      { path: "bulk", Component: BulkAnalysis },
      { path: "compare", Component: CompareAnalysis },
      { path: "dashboard", Component: Dashboard },
      { path: "patterns", Component: PatternDB },
      { path: "benchmark", Component: Benchmark },
      { path: "dataset", Component: DatasetStats },
      { path: "model", Component: ModelArchitecture },
      { path: "zero-day", Component: ZeroDayExplainer },
      { path: "api", Component: APIExplorer },
      { path: "settings", Component: Settings },
      { path: "admin", Component: AdminPanel },
      { path: "error-analysis", Component: ErrorAnalysis },
      { path: "redteam", Component: RedTeam },
      { path: "audit", Component: AuditLog },
      { path: "ab-test", Component: ABTest },
      { path: "feature-importance", Component: FeatureImportance },
      { path: "ioc", Component: IOCList },
      { path: "health", Component: SystemHealth },
    ]
  : [];
