import { useEffect, useMemo, useState } from "react";
import { Header, IntroPage } from "./components/layout/Header";
import { MVP_TABS } from "./data/mvpTabs";
import { predictSmishing } from "./services/smishingService";
import { CheckForm } from "./pages/CheckPage";
import { ResultPage } from "./pages/ResultPage";
import { CasesPage } from "./pages/CasesPage";
import { ReportPage } from "./pages/ReportPage";
import { GuidePage } from "./pages/GuidePage";
import { CHECK_PAGE_TEXT, FORM_LIMITS } from "./constants.js";
import { HOME_URL } from "./utils/API_URL"

function App() {
  const tabIds = useMemo(() => MVP_TABS.map((tab) => tab.id), []);
  const getInitialTab = () => {
    const hash = window.location.hash.replace("#", "");
    return tabIds.includes(hash) ? hash : "check";
  };
  const [mode, setMode] = useState("modern");
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [message, setMessage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [allowTrainingUse, setAllowTrainingUse] = useState(true);
  const [pasteState, setPasteState] = useState("idle");
  const [copyState, setCopyState] = useState("idle");
  const [reportText, setReportText] = useState("");
  const [reportType, setReportType] = useState("택배 사칭형");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const result = analysisResult;
  const hasResult = Boolean(result);
  const warm = mode === "warm";

  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (tabIds.includes(hash)) setActiveTab(hash);
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, [tabIds]);

  const changeTab = (tabId) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#${tabId}`);
  };

  const analyze = async () => {
    // 최종 판정은 백엔드가 담당하므로 프론트는 입력 검증 후 API 응답만 사용합니다.
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isAnalyzing) return;
    if (trimmedMessage.length < FORM_LIMITS.messageMinLength) {
      setAnalysisError(CHECK_PAGE_TEXT.tooShortMessage);
      return;
    }
    setIsAnalyzing(true);
    setSubmittedMessage(message);
    setAnalysisError("");
    try {
      const nextResult = await predictSmishing({ message: trimmedMessage, allowTrainingUse });
      setAnalysisResult(nextResult);
      changeTab("result");
      setPasteState("idle");
      setCopyState("idle");
    } catch (error) {
      setAnalysisResult(null);
      setAnalysisError(CHECK_PAGE_TEXT.serverErrorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const paste = async () => {
    // 브라우저 권한 정책상 클립보드 접근이 막히면 안내 상태만 표시합니다.
    if (!navigator.clipboard?.readText) {
      setPasteState("failed");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteState("empty");
        return;
      }
      setMessage(text);
      setPasteState("pasted");
    } catch {
      setPasteState("failed");
    }
  };

  const copyShare = async () => {
    // 공유 문구는 백엔드 결과의 요약과 근거 일부만 담아 과도한 원문 노출을 줄입니다.
    if (!result) {
      setCopyState("failed");
      return;
    }
    const shareText = [
      `문자안심 체크 결과: ${result.riskLevel} (${result.riskScore}/100)`,
      result.summary,
      `판단 근거: ${(result.reasons ?? []).slice(0, 2).join(", ")}`,
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const reportResult = () => {
    // 신고 화면에는 사용자가 검사한 원문과 백엔드가 분류한 첫 카테고리를 넘깁니다.
    setReportText(submittedMessage);
    setReportType(result?.categories?.[0] ?? "기타");
    changeTab("report");
  };

  const useExample = (text) => {
    if (isAnalyzing) return;
    setMessage(text);
    setAnalysisError("");
  };

  const checkForm = (
    <CheckForm
      allowTrainingUse={allowTrainingUse}
      analysisError={analysisError}
      compact
      isAnalyzing={isAnalyzing}
      message={message}
      onAllowTrainingUseChange={setAllowTrainingUse}
      onAnalyze={analyze}
      onExample={useExample}
      onMessageChange={setMessage}
      onPaste={paste}
      pasteState={pasteState}
      warm={warm}
    />
  );

  return (
    <main
      className={
        warm
          ? "min-h-screen bg-[#fff7ed] text-slate-950"
          : "min-h-screen bg-slate-50 text-slate-950"
      }
    >
      <Header mode={mode} setMode={setMode} warm={warm} />
      {activeTab === "check" ? (
        <IntroPage checkForm={checkForm} warm={warm} />
      ) : (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div>
            {activeTab === "result" && (
              <ResultPage
                copyState={copyState}
                hasResult={hasResult}
                onBack={() => changeTab("check")}
                onCopy={copyShare}
                onReport={reportResult}
                message={submittedMessage}
                result={result}
                warm={warm}
              />
            )}
            {activeTab === "cases" && <CasesPage warm={warm} />}
            {activeTab === "report" && (
              <ReportPage
                reportText={reportText}
                reportType={reportType}
                setReportText={setReportText}
                setReportType={setReportType}
                warm={warm}
              />
            )}
            {activeTab === "guide" && <GuidePage warm={warm} />}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
