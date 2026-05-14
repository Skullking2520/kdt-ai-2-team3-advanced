import {
  LayoutDashboard,
  MessageCircleQuestion,
  Smartphone,
  Users,
} from "lucide-react";

export const PROTOTYPES = [
  {
    id: "basic",
    label: "빠른검사",
    name: "기본 웹 검사형",
    title: "검사부터 가족 확인, 상세 분석까지 이어서 확인하세요",
    summary: "문자를 검사한 뒤 가족 확인 문구와 위험 요인 점수를 함께 보여줍니다.",
    icon: MessageCircleQuestion,
    tabClass: "border-blue-700 bg-blue-700 text-white",
    iconClass: "bg-blue-700 text-white",
  },
  {
    id: "senior",
    label: "큰글씨",
    name: "고령층 친화 앱형",
    title: "큰 글씨로 천천히 확인하세요",
    summary: "쉬운 안내와 큰 버튼으로 다음 행동을 알려줍니다.",
    icon: Smartphone,
    tabClass: "border-emerald-700 bg-emerald-700 text-white",
    iconClass: "bg-emerald-700 text-white",
  },
  {
    id: "family",
    label: "가족확인",
    name: "가족 보호자 연계형",
    title: "혼자 판단하지 말고 함께 확인하세요",
    summary: "가족이나 보호자에게 보낼 확인 문구를 준비합니다.",
    icon: Users,
    tabClass: "border-violet-700 bg-violet-700 text-white",
    iconClass: "bg-violet-700 text-white",
  },
  {
    id: "dashboard",
    label: "상세분석",
    name: "보안 대시보드형",
    title: "위험 요인과 점수 근거를 자세히 표시",
    summary: "감지된 표현과 요인별 점수를 함께 확인합니다.",
    icon: LayoutDashboard,
    tabClass: "border-slate-800 bg-slate-800 text-white",
    iconClass: "bg-slate-800 text-white",
  },
];
