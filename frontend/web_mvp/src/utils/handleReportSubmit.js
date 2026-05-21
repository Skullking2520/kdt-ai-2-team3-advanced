import { REPORT_API_URL } from "./API_URL";

const handleReportSubmit = async (
  e,
  reportText,
  reportType,
  setReportText,
  setIsSuccess,
) => {
  e.preventDefault();

  if (!reportText.trim()) return;

  try {
    const response = await fetch(REPORT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        type: reportType,
        text: reportText,
      }),
    });

    if (response.ok) {
      setReportText("");

      // 1. 성공 상태를 true로 변경
      if (setIsSuccess) setIsSuccess(true);

      // 2. 5초(5000ms) 뒤에 성공 상태를 다시 false로 변경
      setTimeout(() => {
        if (setIsSuccess) setIsSuccess(false);
      }, 5000);
    } else {
      throw new Error(`handle API failed: ${response.status}`);
    }
  } catch (error) {
    console.error("네트워크 에러:", error);
  }
};

export default handleReportSubmit;
