import {useState} from "react";
import {useNavigate} from "react-router";
import {motion, AnimatePresence} from "motion/react";
import {

MousePointerClick,
PencilLine,
Download,
Settings,
Wifi,

KeyRound,
Ban,
Phone,
HardDriveDownload,
CreditCard,

ShieldAlert,

Trash2,
CheckCircle2,
ChevronRight,
ChevronLeft,
Home,
Volume2,
type LucideIcon,
} from "lucide-react";

/* ────────────────────────── 카피 모음 (디자인 변경 시 여기만 수정) ────────────────────────── */

const COPY = {
  pageBadge: "응급 대응",
  pageTitle: "어디까지 진행하셨어요?",
  pageSubtitle: "상황에 맞는 절차를 안내해드릴게요",

  /* 시나리오 선택 (4종) */
  scenarios: [
    {
      id: "clicked-only",
      icon: MousePointerClick,
      label: "링크만 클릭",
      sub: "아무것도 입력 안 함",
      color: "from-emerald-500 to-teal-500",
      urgency: "낮음",
      urgencyColor: "text-emerald-400",
      desc: "단순 접속은 보통 안전해요. 그래도 1분 확인 권장",
    },
    {
      id: "entered-info",
      icon: PencilLine,
      label: "정보를 입력",
      sub: "비번·주민번호·카드번호 등",
      color: "from-amber-500 to-orange-500",
      urgency: "긴급",
      urgencyColor: "text-amber-400",
      desc: "계정이 탈취됐을 수 있어요. 5분 안에 즉시 대응",
    },
    {
      id: "apk-install",
      icon: Download,
      label: "APK 설치",
      sub: "안드로이드 · 출처 불명 앱",
      color: "from-orange-600 to-red-600",
      urgency: "매우 긴급",
      urgencyColor: "text-red-400",
      desc: "좀비 폰 가능성. 즉시 비행기모드 + 통신사 차단",
    },
    {
      id: "ios-profile",
      icon: Settings,
      label: "iOS 프로파일 설치",
      sub: "iPhone · VPN/관리 프로파일",
      color: "from-red-600 to-rose-700",
      urgency: "매우 긴급",
      urgencyColor: "text-red-400",
      desc: "모든 트래픽이 공격자 서버 경유. 프로파일 즉시 삭제",
    },
  ] as const,

  /* 시나리오별 5단계 */
  stepsByScenario: {
    "clicked-only": [
      { icon: Wifi, title: "브라우저 닫기", sub: "피싱 사이트 닫기 (쿠키 차단)", detail: "단순 접속은 보통 안전해요. 정보를 입력하지 않았다면 추가 피해 가능성 낮음" },
      { icon: ShieldAlert, title: "문자 캡처본 보존", sub: "신고용 증거 저장", detail: "스크린샷 저장 + 발신번호 메모. 182 신고 시 필요" },
      { icon: Trash2, title: "문자 스팸 신고 + 차단", sub: "같은 발신번호 재발송 방지", detail: "문자 앱 → 해당 문자 → 스팸 신고 / 발신번호 차단" },
      { icon: MousePointerClick, title: "URL 평판 조회 (선택)", sub: "우리 서비스에서 검사해보기", detail: "이미 클릭한 URL도 검사하면 '어떤 종류의 사기였는지' 확인 가능" },
      { icon: Phone, title: "이상하면 182 상담", sub: "혹시 모를 잔여 피해 확인", detail: "피해가 없어도 추후 문의 시 도움됨. 24시간 운영" },
    ],
    "entered-info": [
      { icon: Wifi, title: "인터넷 즉시 끊기", sub: "Wi-Fi 끄기 · 비행기 모드", detail: "악성 앱이 추가 데이터를 다운로드하거나 명령을 받는 것을 차단" },
      { icon: KeyRound, title: "비밀번호 즉시 변경", sub: "해당 사이트 + 같은 비번 쓰는 모든 곳", detail: "PC에서도 변경. 비밀번호 관리자 사용 권장" },
      { icon: Ban, title: "계좌 지급 정지", sub: "은행 고객센터 또는 1588-9999", detail: "이체·결제 차단. 피해 시작 전이면 결제 막을 수 있음" },
      { icon: CreditCard, title: "카드 정지 + 재발급", sub: "카드사 고객센터 (앱/카드 뒤 1588)", detail: "미사용 승인 건도 확인. 의심 거래 모니터링" },
      { icon: Phone, title: "경찰청 182 신고", sub: "사이버범죄 신고", detail: "피해금 환급 절차 + 수사에 필요. 접수번호 보관" },
    ],
    "apk-install": [
      { icon: Wifi, title: "즉시 비행기모드 켜기", sub: "Wi-Fi + 데이터 동시 차단", detail: "악성 앱이 서버와 통신 못하게 즉시 차단" },
      { icon: Ban, title: "설치한 앱 삭제 시도", sub: "설정 → 앱 → 해당 앱 → 삭제", detail: "관리자 권한 뺏지 못했으면 삭제 가능. 권한 뺏었으면 통신사 차단부터" },
      { icon: Phone, title: "통신사 악성앱 차단 요청", sub: "SKT 114 / KT 114 / LGU+ 114", detail: "통신사에서 원격으로 악성 앱 비활성화. 다른 단말기에 영향 차단" },
      { icon: HardDriveDownload, title: "공장초기화 (최후수단)", sub: "백업 후 초기화 권장", detail: "악성 앱이 시스템 깊숙이 숨어있을 수 있어요. 클라우드 백업으로 사진/연락처 복원 가능" },
      { icon: Phone, title: "경찰청 182 신고", sub: "악성 앱 + 피해 신고", detail: "앱 파일 보존 (apk 그대로). 수사 단서 + 피해금 환급 근거" },
    ],
    "ios-profile": [
      { icon: Settings, title: "설정 → 일반 → VPN 및 기기 관리", sub: "설치된 프로파일 확인", detail: "'프로파일 다운로드됨' 또는 '기기 관리' 항목에서 위장 프로파일 선택" },
      { icon: Trash2, title: "프로파일 삭제", sub: "'프로파일 제거' 버튼", detail: "삭제 시 입력했던 비밀번호가 공격자에게 갈 수 있으니 '비밀번호 변경' 단계와 동시 진행" },
      { icon: Wifi, title: "Wi-Fi 끄고 데이터 OFF", sub: "비행기모드", detail: "프로파일이 모든 트래픽 가로채는 중. 즉시 끊기" },
      { icon: KeyRound, title: "Apple ID + 모든 비번 변경", sub: "iCloud, 메일, 은행 등", detail: "Apple ID는 다른 기기에서도 사용. 다른 기기에서도 로그아웃" },
      { icon: Phone, title: "경찰청 182 신고", sub: "프로파일 파일 보존 + 신고", detail: "iPhone 설정 → 일반 → 정보 → AppleCare 지원에서 프로파일 백업 가능" },
    ],
  } as const,

  contacts: [
    { num: "112", label: "경찰 신고", sub: "긴급 사기 피해", color: "from-red-600 to-red-700" },
    { num: "182", label: "사이버범죄", sub: "경찰청 사이버수사대", color: "from-orange-600 to-red-600" },
    { num: "1332", label: "금감원", sub: "금융 사기 상담", color: "from-amber-600 to-orange-700" },
    { num: "118", label: "KISA 신고", sub: "인터넷·문자 신고", color: "from-blue-600 to-indigo-700" },
  ] as const,

  guideSection: "의심 문자를 더 분석하고 싶으세요?",
  guideCta: "의심 문자 검사하러 가기",
  stepDone: "완료",
  back: "다른 상황 선택",
  home: "홈으로",
  voice: "다시 듣기",
} as const;

/* ────────────────────────── 타입 ────────────────────────── */

type ScenarioId = keyof typeof COPY.stepsByScenario;

/* ────────────────────────── 메인 컴포넌트 ────────────────────────── */

export function Emergency() {
  const nav = useNavigate();
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [done, setDone] = useState<boolean[]>([]);

  const selectScenario = (s: ScenarioId) => {
    setScenario(s);
    setDone(COPY.stepsByScenario[s].map(() => false));
  };

  const reset = () => {
    setScenario(null);
    setDone([]);
  };

  const toggle = (i: number) => {
    setDone((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        {scenario === null ? (
          <SelectScenario onSelect={selectScenario} speak={speak} />
        ) : (
          <ScenarioSteps
            scenario={scenario}
            done={done}
            onToggle={toggle}
            onBack={reset}
            speak={speak}
            onHome={() => nav("/")}
            onGoAnalyze={() => nav("/analyze")}
          />
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── 1단계: 시나리오 선택 ────────────────────────── */

function SelectScenario({ onSelect, speak }: { onSelect: (s: ScenarioId) => void; speak: (t: string) => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/15 border border-red-500/25 mb-4">
          <ShieldAlert size={36} className="text-red-400" />
        </div>
        <p className="text-xs text-red-400 tracking-widest uppercase mb-2" style={{ fontWeight: 600 }}>
          {COPY.pageBadge}
        </p>
        <h1 className="text-2xl sm:text-3xl text-white mb-2" style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
          {COPY.pageTitle}
        </h1>
        <p className="text-base text-white/60 leading-relaxed">
          {COPY.pageSubtitle}
        </p>
        <button
          onClick={() => speak(COPY.pageSubtitle)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 transition-colors"
          title={COPY.voice}
        >
          <Volume2 size={12} />
          {COPY.voice}
        </button>
      </motion.div>

      <div className="space-y-3">
        {COPY.scenarios.map((s) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => onSelect(s.id as ScenarioId)}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br ${s.color} shadow-lg active:scale-[0.98] hover:scale-[1.01] transition-all text-left`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon size={28} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg text-white" style={{ fontWeight: 700 }}>{s.label}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/25 text-white" style={{ fontWeight: 600 }}>
                    {s.urgency}
                  </span>
                </div>
                <p className="text-sm text-white/90 mb-1">{s.sub}</p>
                <p className="text-xs text-white/70 leading-relaxed">{s.desc}</p>
              </div>
              <ChevronRight size={20} className="text-white/70 shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

/* ────────────────────────── 2단계: 상황별 5단계 ────────────────────────── */

function ScenarioSteps({
  scenario, done, onToggle, onBack, speak, onHome, onGoAnalyze,
}: {
  scenario: ScenarioId;
  done: boolean[];
  onToggle: (i: number) => void;
  onBack: () => void;
  speak: (t: string) => void;
  onHome: () => void;
  onGoAnalyze: () => void;
}) {
  const steps = COPY.stepsByScenario[scenario];
  const meta = COPY.scenarios.find((s) => s.id === scenario);
  const MetaIcon = meta?.icon ?? ShieldAlert;
  const allDone = done.every(Boolean);
  const someDone = done.some(Boolean);

  return (
    <>
      {/* 헤더 (시나리오 표시) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-6 bg-gradient-to-br ${meta?.color} mb-6`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <MetaIcon size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg text-white" style={{ fontWeight: 700 }}>{meta?.label}</p>
            <p className="text-xs text-white/85">{meta?.sub}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-white/25 text-white" style={{ fontWeight: 600 }}>
            {meta?.urgency}
          </span>
        </div>
        <p className="text-sm text-white/90 leading-relaxed mt-2">{meta?.desc}</p>
      </motion.div>

      {/* 진행 표시 */}
      <div className="flex items-center justify-between mb-4 px-1">
        <p className="text-xs text-white/40" style={{ fontWeight: 600 }}>
          응급 체크리스트 {someDone && `· ${done.filter(Boolean).length}/${steps.length} 완료`}
        </p>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 text-xs text-emerald-400"
            style={{ fontWeight: 600 }}
          >
            <CheckCircle2 size={12} />
            모두 완료
          </motion.div>
        )}
      </div>

      {/* 5단계 */}
      <div className="space-y-2.5 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon as LucideIcon;
          const checked = done[i];
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onToggle(i)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                checked
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-[#111c30] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all ${
                    checked ? "bg-emerald-500 border-emerald-500" : "border-white/20"
                  }`}
                >
                  <AnimatePresence>
                    {checked && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <CheckCircle2 size={18} className="text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-white/30" style={{ fontWeight: 600 }}>STEP {i + 1}</span>
                    {checked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400" style={{ fontWeight: 600 }}>
                        {COPY.stepDone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon size={18} className={checked ? "text-emerald-400" : "text-white/60"} />
                    <h3 className={`text-base ${checked ? "text-emerald-300" : "text-white"}`} style={{ fontWeight: 600 }}>
                      {s.title}
                    </h3>
                  </div>
                  <p className={`text-sm mt-1 ${checked ? "text-emerald-300/70" : "text-white/55"}`}>
                    {s.sub}
                  </p>
                  {!checked && (
                    <p className="text-xs text-white/35 mt-2 leading-relaxed">
                      💡 {s.detail}
                    </p>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(`${s.title}. ${s.sub}. ${s.detail}`);
                  }}
                  className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors shrink-0"
                  title={COPY.voice}
                >
                  <Volume2 size={16} />
                </button>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 긴급 연락처 */}
      <div className="mb-8">
        <p className="text-xs text-white/40 mb-3 px-1 uppercase tracking-widest" style={{ fontWeight: 600 }}>
          긴급 연락처 (탭하면 전화 걸기)
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {COPY.contacts.map((c) => (
            <a
              key={c.num}
              href={`tel:${c.num}`}
              className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${c.color} shadow-lg active:scale-[0.98] hover:scale-[1.01] transition-all`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Phone size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl text-white" style={{ fontWeight: 800, letterSpacing: "-0.01em" }}>{c.num}</p>
                <p className="text-xs text-white/90" style={{ fontWeight: 600 }}>{c.label}</p>
                <p className="text-[10px] text-white/75 truncate">{c.sub}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="space-y-2">
        <button
          onClick={onGoAnalyze}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          style={{ fontWeight: 600 }}
        >
          {COPY.guideCta}
          <ChevronRight size={16} />
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            <ChevronLeft size={14} />
            {COPY.back}
          </button>
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            <Home size={14} />
            {COPY.home}
          </button>
        </div>
      </div>
    </>
  );
}
