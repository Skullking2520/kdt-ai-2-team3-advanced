import { useEffect, useMemo, useState } from "react";
import { Header, IntroPage } from "./components/layout/Header";
import { MVP_TABS } from "./data/mvpTabs";
import { predictSmishing } from "./services/smishingService";
import { analyzeSmishing } from "./utils/analyzeSmishing";
import { CheckForm } from "./pages/CheckPage";
import { ResultPage } from "./pages/ResultPage";
import { CasesPage } from "./pages/CasesPage";
import { ReportPage } from "./pages/ReportPage";
import { GuidePage } from "./pages/GuidePage";
import { HOME_URL } from "./utils/API_URL";

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
  const fallbackResult = useMemo(
    () => analyzeSmishing(submittedMessage),
    [submittedMessage],
  );
  const result = analysisResult ?? fallbackResult;
  const hasResult = submittedMessage.trim().length > 0;
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
    if (!message.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setSubmittedMessage(message);
    try {
      const nextResult = await predictSmishing({ message, allowTrainingUse });
      setAnalysisResult(nextResult);
      changeTab("result");
      setPasteState("idle");
      setCopyState("idle");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const paste = async () => {
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
    if (!result) {
      setCopyState("failed");
      return;
    }
    const shareText = [
      `문자안심 체크 결과: ${result.riskLevel} (${result.riskScore}/100)`,
      `사칭 유형: ${result.impersonationType}`,
      `의심 근거: ${result.suspiciousEvidence.slice(0, 2).join(", ")}`,
      result.familyCheckMessage,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const reportResult = () => {
    setReportText(submittedMessage);
    setReportType(result.impersonationType);
    changeTab("report");
  };

  const useExample = async (text) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setMessage(text);
    setSubmittedMessage(text);
    try {
      const nextResult = await predictSmishing({
        message: text,
        allowTrainingUse,
      });
      setAnalysisResult(nextResult);
      changeTab("result");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkForm = (
    <CheckForm
      allowTrainingUse={allowTrainingUse}
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
