/**
 * Admin / Research / Developer Routes — DEV 빌드에서만 등록
 *
 * 실서비스에서는 접근 불가. 클라이언트 사이드 비밀번호도 폐기 —
 * 본 라우트들은 import.meta.env.DEV 일 때만 router 에 합쳐져서,
 * vite build 시점에 DEV === false 로 인라인되어 dead code 로 제거됨.
 *
 * 단, 정적 import 자체는 build 에 남을 수 있으므로, 본 라우트에
 * 민감 정보(키, 비밀번호 등)를 두지 말 것.
 */
import { AdminPanel } from "./components/AdminPanel";
import { Dashboard } from "./components/Dashboard";
import { SMSSimulator } from "./components/SMSSimulator";
import { LiveFeed } from "./components/LiveFeed";
import { ReportExport } from "./components/ReportExport";
import { AttentionViz } from "./components/AttentionViz";
import { ModelArchitecture } from "./components/ModelArchitecture";
import { APIExplorer } from "./components/APIExplorer";
import { Settings } from "./components/Settings";
import { Benchmark } from "./components/Benchmark";
import { DatasetStats } from "./components/DatasetStats";
import { PatternDB } from "./components/PatternDB";
import { ZeroDayExplainer } from "./components/ZeroDayExplainer";
import { ErrorAnalysis } from "./components/ErrorAnalysis";
import { RedTeam } from "./components/RedTeam";
import { BulkAnalysis } from "./components/BulkAnalysis";
import { CompareAnalysis } from "./components/CompareAnalysis";
import { AuditLog } from "./components/AuditLog";
import { ABTest } from "./components/ABTest";
import { FeatureImportance } from "./components/FeatureImportance";
import { IOCList } from "./components/IOCList";
import { SystemHealth } from "./components/SystemHealth";

import type { RouteObject } from "react-router";

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
