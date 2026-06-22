/**
 * Public Routes — 실서비스 빌드에 항상 포함되는 라우트
 * 일반 사용자가 접근 가능한 페이지들.
 */
import { Landing } from "./components/Landing";
import { Analyzer } from "./components/Analyzer";
import { SeniorAnalyzer } from "./components/SeniorAnalyzer";
import { SeniorHome } from "./components/SeniorHome";
import { URLAnalyzer } from "./components/URLAnalyzer";
import { ImageAnalyzer } from "./components/ImageAnalyzer";
import { SeniorImageAnalyzer } from "./components/SeniorImageAnalyzer";
import { VulnerableGuide } from "./components/VulnerableGuide";
import { ReportPage } from "./components/ReportPage";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { AnalysisResult } from "./components/AnalysisResult";
import { Emergency } from "./components/Emergency";

import type { RouteObject } from "react-router";

export const publicRoutes: RouteObject[] = [
  { index: true, Component: Landing },
  { path: "analyze", Component: Analyzer },
  { path: "analyze/progress", Component: AnalysisProgress },
  { path: "analyze/result/:id", Component: AnalysisResult },
  { path: "senior-home", Component: SeniorHome },
  { path: "senior-analyze", Component: SeniorAnalyzer },
  { path: "url", Component: URLAnalyzer },
  { path: "image", Component: ImageAnalyzer },
  { path: "senior-image", Component: SeniorImageAnalyzer },
  { path: "guide", Component: VulnerableGuide },
  { path: "report", Component: ReportPage },
  { path: "emergency", Component: Emergency },
];
