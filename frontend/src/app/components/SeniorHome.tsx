import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import {
  ShieldAlert, MessageSquareWarning, Link2, Phone, Flag, Heart,
  Trophy, BookMarked, Volume2, VolumeX, ArrowRight, ArrowLeft, Home,
  ZoomIn, ZoomOut, AlertTriangle, PhoneCall, Users, HelpCircle,
} from "lucide-react";

const BIG_ACTIONS = [
  { icon: Link2, title: "링크(주소) 검사", sub: "의심스러운 인터넷 주소 확인", to: "/url", color: "from-amber-500 to-orange-600", glow: "shadow-amber-500/25" },
  { icon: Phone, title: "전화번호 조회", sub: "이 번호가 위험한지 확인", to: "/sender", color: "from-sky-500 to-blue-500", glow: "shadow-sky-500/25" },
  { icon: Flag, title: "신고하기", sub: "피해·의심 문자 신고", to: "/report", color: "from-red-500 to-rose-600", glow: "shadow-red-500/25" },
];

const SUB_ACTIONS = [
  { icon: Heart, title: "안전 사용 가이드", sub: "꼭 알아야 할 7가지 수칙", to: "/guide", iconColor: "text-rose-400" },
  { icon: BookMarked, title: "실제 피해 사례", sub: "다른 분들의 경험 보기", to: "/cases", iconColor: "text-indigo-400" },
  { icon: Trophy, title: "스미싱 퀴즈", sub: "재미있게 안목 키우기", to: "/quiz", iconColor: "text-fuchsia-400" },
];

// 실제 정부·공공기관 신고/도움 전화번호
const EMERGENCY = [
  { num: "112", label: "경찰 신고", sub: "긴급 사기 피해", color: "from-red-600 to-red-700", icon: AlertTriangle },
  { num: "1332", label: "금감원 보이스피싱", sub: "금융 사기 상담", color: "from-amber-600 to-orange-700", icon: PhoneCall },
  { num: "118", label: "사이버 신고센터", sub: "인터넷·문자 신고", color: "from-blue-600 to-indigo-700", icon: ShieldAlert },
];

export function SeniorHome() {
  const nav = useNavigate();
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return parseFloat(localStorage.getItem("nb_senior_zoom") || "1");
  });
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    localStorage.setItem("nb_senior_zoom", String(zoom));
    document.documentElement.style.setProperty("--senior-zoom", String(zoom));
  }, [zoom]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.85;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <div className="min-h-full" style={{ fontSize: `${zoom}rem` }}>
      {/* 상단 어르신 전용 툴바 (sticky) */}
      <div className="sticky top-0 z-20 bg-[#0b1120]/95 backdrop-blur border-b-2 border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : nav("/")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 transition-all"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={22} /> 뒤로
          </button>
          <button
            onClick={() => nav("/")}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 transition-all"
            style={{ fontSize: "1.05rem", fontWeight: 600 }}
            aria-label="처음 화면"
          >
            <Home size={22} /> 처음
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.85, +(z - 0.1).toFixed(2)))}
              className="w-12 h-12 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 flex items-center justify-center"
              aria-label="글씨 작게"
            >
              <ZoomOut size={22} />
            </button>
            <span className="text-white/70 px-2" style={{ fontSize: "1rem", fontWeight: 600, minWidth: 50, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
              className="w-12 h-12 rounded-xl bg-white/8 border-2 border-white/15 text-white hover:bg-white/15 active:scale-95 flex items-center justify-center"
              aria-label="글씨 크게"
            >
              <ZoomIn size={22} />
            </button>
            <button
              onClick={() => speak("안녕하세요. 이상한 문자를 받으셨나요? 아래 큰 파란 버튼인 문자 검사하기를 누르시면 받은 문자가 안전한지 확인할 수 있어요. 도움이 필요하시면 화면 아래쪽 빨간 버튼을 눌러 가족이나 경찰에게 연락하세요.")}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center active:scale-95 transition-all ${speaking ? "bg-cyan-500/30 border-cyan-400 text-cyan-300" : "bg-white/8 border-white/15 text-white hover:bg-white/15"}`}
              aria-label={speaking ? "음성 멈춤" : "음성 안내"}
            >
              {speaking ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-3xl mx-auto">
        {/* 환영 헤더 - 가이드: 단순하고 직접적으로 */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 items-center justify-center shadow-xl shadow-cyan-500/30 mb-4">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h1 className="text-white mb-3" style={{ fontWeight: 800, fontSize: "2rem", letterSpacing: "-0.02em" }}>
            안녕하세요!
          </h1>
          <p className="text-white/85" style={{ fontSize: "1.25rem", lineHeight: 1.65, fontWeight: 500 }}>
            의심스러운 문자를 받으셨나요?<br />
            아래 큰 파란 버튼을 눌러주세요.
          </p>
        </motion.div>

        {/* 메인 큰 버튼 (문자 검사) - 어르신 전용 페이지로 이동 */}
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => nav("/senior-analyze")}
          className="w-full mb-4 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all p-8 text-left flex items-center gap-5"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <MessageSquareWarning size={40} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.7rem", letterSpacing: "-0.01em" }}>
              문자 검사하기
            </p>
            <p className="text-white/85" style={{ fontSize: "1.1rem" }}>
              받은 문자를 붙여넣으면 위험한지 알려드려요
            </p>
          </div>
          <ArrowRight size={32} className="text-white shrink-0" />
        </motion.button>

        {/* 보조 큰 버튼 3개 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {BIG_ACTIONS.map((a, i) => (
            <motion.button
              key={a.to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => nav(a.to)}
              className={`rounded-2xl bg-gradient-to-br ${a.color} shadow-lg ${a.glow} hover:scale-[1.02] active:scale-[0.98] transition-all p-5 text-left`}
            >
              <a.icon size={28} className="text-white mb-3" />
              <p className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.2rem" }}>{a.title}</p>
              <p className="text-white/85" style={{ fontSize: "0.95rem" }}>{a.sub}</p>
            </motion.button>
          ))}
        </div>

        {/* 🚨 긴급 신고 / 도움 받기 — 중요 추가 */}
        <div className="mb-10">
          <p className="text-white/60 mb-3 flex items-center gap-2" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            <AlertTriangle size={22} className="text-red-400" />
            급할 때 바로 전화하세요
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EMERGENCY.map((e) => (
              <a
                key={e.num}
                href={`tel:${e.num}`}
                className={`rounded-2xl bg-gradient-to-br ${e.color} shadow-lg p-5 text-left flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <e.icon size={26} className="text-white" />
                </div>
                <div>
                  <p className="text-white" style={{ fontWeight: 800, fontSize: "1.5rem" }}>{e.num}</p>
                  <p className="text-white/90" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{e.label}</p>
                  <p className="text-white/70" style={{ fontSize: "0.85rem" }}>{e.sub}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* 가족 도움 요청 */}
        <button
          onClick={() => alert("가족에게 알림을 보내시려면 설정에서 가족 연락처를 먼저 등록해주세요.")}
          className="w-full mb-10 flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-2 border-emerald-500/40 hover:bg-emerald-500/15 active:scale-[0.99] transition-all"
        >
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Users size={26} className="text-emerald-300" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-emerald-200" style={{ fontWeight: 700, fontSize: "1.2rem" }}>가족에게 도움 요청</p>
            <p className="text-emerald-200/70" style={{ fontSize: "0.95rem" }}>등록된 가족에게 의심 문자를 즉시 공유합니다</p>
          </div>
          <ArrowRight size={22} className="text-emerald-300/60 shrink-0" />
        </button>

        {/* 학습/사례 섹션 */}
        <p className="text-white/60 mb-3 flex items-center gap-2" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          <HelpCircle size={22} className="text-cyan-400" />
          천천히 배우고 싶으시다면
        </p>
        <div className="space-y-3 mb-10">
          {SUB_ACTIONS.map((a) => (
            <button
              key={a.to}
              onClick={() => nav(a.to)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[#111c30] border-2 border-white/10 hover:border-white/30 hover:bg-[#162238] active:scale-[0.99] transition-all text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <a.icon size={26} className={a.iconColor} />
              </div>
              <div className="flex-1">
                <p className="text-white" style={{ fontWeight: 600, fontSize: "1.15rem" }}>{a.title}</p>
                <p className="text-white/55 mt-0.5" style={{ fontSize: "0.95rem" }}>{a.sub}</p>
              </div>
              <ArrowRight size={22} className="text-white/30 shrink-0" />
            </button>
          ))}
        </div>

        {/* 사용 안내 카드 - 가이드: 3단계 흐름 강조 */}
        <div className="rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 p-6 mb-6">
          <p className="text-amber-200 mb-4 flex items-center gap-2" style={{ fontWeight: 800, fontSize: "1.3rem" }}>
            이렇게 사용하세요
          </p>
          <ol className="space-y-4 text-white/90" style={{ fontSize: "1.15rem", lineHeight: 1.8, fontWeight: 500 }}>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/30 text-amber-200 flex items-center justify-center" style={{ fontWeight: 800 }}>1</span>
              <span>받은 문자를 <b className="text-white">길게 눌러</b> 복사하세요</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/30 text-amber-200 flex items-center justify-center" style={{ fontWeight: 800 }}>2</span>
              <span>위의 <b className="text-white">"문자 검사하기"</b> 큰 버튼을 누르세요</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-amber-500/30 text-amber-200 flex items-center justify-center" style={{ fontWeight: 800 }}>3</span>
              <span>빈 칸에 <b className="text-white">붙여넣기</b> 하고 검사하기를 누르면 끝!</span>
            </li>
          </ol>
          <div className="mt-5 pt-5 border-t-2 border-amber-500/20">
            <p className="text-rose-200 mb-2" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              절대 하지 마세요!
            </p>
            <ul className="space-y-2 text-white/80" style={{ fontSize: "1.05rem", lineHeight: 1.7 }}>
              <li className="flex items-start gap-2">
                <span className="text-red-400 shrink-0">•</span>
                <span>의심 문자의 <b className="text-red-300">링크(주소)를 누르지 마세요</b></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 shrink-0">•</span>
                <span>개인정보나 비밀번호를 <b className="text-red-300">입력하지 마세요</b></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 shrink-0">•</span>
                <span>상품권을 <b className="text-red-300">구매하지 마세요</b></span>
              </li>
            </ul>
            <p className="text-emerald-300 mt-4 pt-3 border-t border-amber-500/20" style={{ fontSize: "1rem", fontWeight: 600 }}>
              어렵다면 가족이나 자녀에게 도움을 요청하세요
            </p>
          </div>
        </div>

        {/* 일반 모드로 전환 */}
        <button
          onClick={() => {
            localStorage.removeItem("nb_senior");
            window.location.reload();
          }}
          className="w-full mb-6 flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/5 border-2 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 active:scale-[0.99] transition-all"
          style={{ fontSize: "1rem", fontWeight: 600 }}
        >
          일반 모드로 전환하기
        </button>

        <p className="text-center text-white/40 mt-6" style={{ fontSize: "0.95rem" }}>
          화면 위쪽 <b className="text-cyan-400">+/-</b> 버튼으로 글씨 크기를 조절할 수 있어요.
        </p>
      </div>
    </div>
  );
}
