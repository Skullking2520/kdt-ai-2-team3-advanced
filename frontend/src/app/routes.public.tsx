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
import { SenderLookup } from "./components/SenderLookup";
import { History } from "./components/History";
import { CaseStudies } from "./components/CaseStudies";
import { TrendReport } from "./components/TrendReport";
import { Quiz } from "./components/Quiz";
import { VulnerableGuide } from "./components/VulnerableGuide";
import { PhishingGallery } from "./components/PhishingGallery";
import { ReportPage } from "./components/ReportPage";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { AnalysisResult } from "./components/AnalysisResult";
import { Changelog } from "./components/Changelog";
import { EasyCheck } from "./components/EasyCheck";
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
  { path: "sender", Component: SenderLookup },
  { path: "history", Component: History },
  { path: "cases", Component: CaseStudies },
  { path: "trend", Component: TrendReport },
  { path: "quiz", Component: Quiz },
  { path: "guide", Component: VulnerableGuide },
  { path: "gallery", Component: PhishingGallery },
  { path: "report", Component: ReportPage },
  { path: "changelog", Component: Changelog },
  { path: "easy", Component: EasyCheck },
  { path: "emergency", Component: Emergency },
  { path: "senior-home", Component: SeniorHome },
];
