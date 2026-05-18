import { REPORT_API_URL } from "./API_URL";
import getCookie from "./getCookie";

const crsfToken = getCookie("csrftoken");

// 컴포넌트의 상태값들을 매개변수로 받도록 수정
const handleReportSubmit = async (e, reportText, reportType, setReportText) => {
  e.preventDefault(); // 페이지 새로고침 방지

  if (!reportText.trim()) return; // 빈 메시지는 전송 안 함

  try {
    // 서버로 유형과 내용을 함께 전송
    const response = await fetch(REPORT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": crsfToken, // 이 헤더 이름으로 토큰을 담아 보냅니다.
      },
      credentials: "include",
      body: JSON.stringify({
        type: reportType,
        text: reportText,
      }),
    });

    if (response.ok) {
      setReportText(""); // 전송 성공 후 입력창 초기화
      //console.log("신고 완료!");
    } else {
      throw new Error(`handle API failed: ${response.status}`);
    }
  } catch (error) {
    console.error("네트워크 에러:", error);
  }
};

export default handleReportSubmit;
