export const CHECK_PAGE_TEXT = {
  ariaLabel: "의심가는 메시지를 입력하세요",
  compactPlaceholder: "의심가는 메시지를 입력하세요",
  compactAnalyzeButton: "분석하기",
  compactAnalyzingButton: "분석 중입니다",
  pasteButton: "붙여넣기",
  examplePrompt: "예시 메시지",
  eyebrow: "Message Analysis",
  sectionTitle: "의심가는 메시지를 입력하세요",
  sectionDescription: "문자, 카카오톡, 택배 안내, 환급금 안내 등 의심되는 내용을 붙여넣어 분석할 수 있습니다.",
  messageLabel: "의심가는 메시지를 입력하세요",
  messagePlaceholder: "문자, 카카오톡, 택배 안내, 환급금 안내 등 의심되는 내용을 붙여넣어 분석할 수 있습니다.",
  tooShortMessage: "분석할 내용이 부족합니다.",
  serverErrorMessage: "분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
  trainingConsentCompact: "선택 동의: 분석 정확도 개선을 위해 입력한 메시지를 개인정보 제거 후 학습 데이터로 활용할 수 있습니다. 동의하지 않아도 메시지 분석 기능은 이용할 수 있습니다.",
  trainingConsentTitle: "선택 동의: 분석 정확도 개선을 위해 입력한 메시지를 개인정보 제거 후 학습 데이터로 활용할 수 있습니다. 동의하지 않아도 메시지 분석 기능은 이용할 수 있습니다.",
  trainingConsentDescription: "",
  analyzingButton: "분석 중입니다",
  analyzeButton: "분석하기",
};

export const FORM_LIMITS = {
  messageMaxLength: 2000,
  messageMinLength: 5,
};

export const RESULT_PAGE_TEXT = {
  reportEyebrow: "분석 리포트",
  reportTitle: "스미싱 문자 판별 결과",
  targetMessageTitle: "분석 대상 메시지",
  tableHeaderItem: "항목",
  tableHeaderContent: "내용",
  riskScoreLabel: "위험 점수",
  riskLevelLabel: "위험 단계",
  riskLevelPrefix: "위험도",
  categoriesLabel: "탐지 분류",
  evidenceTitle: "의심 근거",
  summaryTitle: "분석 요약",
  categoriesTitle: "탐지 분류",
  recommendationsTitle: "권장 조치",

  totalScoreTitle: "종합 점수",
  quickActionsTitle: "빠른 작업",
  reportButton: "신고하기",
  copyDoneButton: "복사 완료",
  shareButton: "공유하기",
  retryButton: "다시 검사",
  copyFailedMessage: "클립보드 복사 권한을 확인해주세요.",
  feedbackTitle: "이 분석이 맞나요?",
  feedbackAgreeButton: "맞아요",
  feedbackDisagreeButton: "아니에요",
  feedbackOptions: [
    "정상 메시지인데 위험하다고 나왔어요",
    "위험한 메시지인데 정상으로 나왔어요",
    "판단 근거가 이상해요",
    "기타",
  ],
  feedbackThanks: "피드백이 기록되었습니다.",
  aiDisclaimer: "AI 판단 결과는 완벽하지 않을 수 있습니다. 조금이라도 의심되면 해당 기관이나 업체의 공식 앱, 공식 홈페이지, 대표 고객센터처럼 직접 확인할 수 있는 채널을 이용하세요.",
};

export const HEADER_TEXT = {
  brand: "문자안심",
  checkNav: "검사하기",
  casesNav: "피해사례",
  guideNav: "예방법",
  modernMode: "일반",
  warmMode: "쉬운모드",
  reportNav: "신고하기",
  warmBadge: "쉬운모드 스미싱 검사기",
  heroTitlePrefix: "의심가는 ",
  heroTitleHighlight: "메시지",
  heroTitleSuffix: "를 물어보세요",
  warmHeroTitle: "의심가는 메시지를 물어보세요",
  heroDescription: "받은 문자가 수상하다면 그대로 붙여넣고 바로 확인하세요.",
};

export const REPORT_PAGE_TEXT = {
  subtitle: "Report",
  title: "스미싱 신고 안내",
  description: "새로 발견한 의심 문자를 정리해 신고할 수 있도록 돕는 화면입니다. 신고 API가 연결되면 이 화면에서 서버로 전송합니다.",
  typeLabel: "신고 유형",
  messageLabel: "의심 문자 내용",
  messagePlaceholder: "받으신 문자 내용을 입력해주세요.",
  submitButton: "신고 API 연결 후 전송",
};

export const REPORT_TYPES = [
  "택배 사칭형",
  "가족 사칭형",
  "기관/금융 사칭형",
  "금융기관 사칭형",
  "정부기관 사칭형",
  "개인정보 탈취형",
  "정상 문자 가능성",
  "기타",
];

export const RISK_VISUAL_TEXT = {
  dangerHeadline: "스미싱 가능성이 높아요",
  warningHeadline: "주의가 필요해요",
  lowSuspicionHeadline: "낮은 의심이 있어요",
  normalHeadline: "정상 가능성이 높아요",
  emptyMessage: "먼저 문자를 검사해 주세요.",
  emptyButton: "검사 화면으로 이동",
};

export const RISK_LEVEL_TEXT = {
  danger: "위험",
  warning: "주의",
  lowSuspicion: "낮은 의심",
  normal: "정상 가능성 높음",
};

export const EXAMPLE_MESSAGES = [
  {
    label: "정상 예시",
    text: "[택배] 고객님의 상품이 배송 완료되었습니다. 자세한 내용은 공식 앱에서 확인해주세요.",
  },
  {
    label: "스미싱 의심 예시",
    text: "[택배] 배송지 오류로 반송 예정입니다. 주소를 확인해주세요. http://...",
  },
];

export const API_ERROR_MESSAGES = {
  requestFailed: "분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
  invalidJson: "분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
};
