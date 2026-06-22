import {Outlet, NavLink, useLocation, useNavigate} from "react-router";
import {
  ShieldCheck, Menu, X, MessageSquareWarning, Link2, ImageIcon,
  Flag, ChevronDown, Bell, Search, Sun, Moon, BookOpen,
  Zap, Type,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import {useState, useEffect, useRef} from "react";
import {useAdmin} from "../context/AdminContext";
import {useSenior} from "../context/SeniorContext";
import {SeniorBottomBar} from "./senior/SeniorBottomBar";
import {motion, AnimatePresence} from "motion/react";

const TREND_ALERT = "이번 주 택배·공공기관 사칭 스미싱 급증 — 링크 클릭 전 꼭 확인하세요";

const ADMIN_PATH_PREFIXES = ["/dashboard", "/compare", "/health"];

/* ─── 실시간 검사 드롭다운 ─── */
const SCAN_ITEMS = [
  {
    to: "/analyze",
    icon: MessageSquareWarning,
    label: "문자 검사",
    desc: "받은 문자를 그대로 붙여넣어 AI 분석",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    tag: "가장 많이 사용",
    tagColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    to: "/url",
    icon: Link2,
    label: "URL 검사",
    desc: "의심스러운 링크 주소를 직접 입력해 분석",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    tag: null,
    tagColor: "",
  },
  {
    to: "/image",
    icon: ImageIcon,
    label: "이미지 검사",
    desc: "스크린샷 업로드 후 텍스트 추출 분석",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    tag: null,
    tagColor: "",
  },
];

/* ─── 피해 사례 드롭다운 (전부 cleanup되어 빈 배열 — 헤더 자동 숨김) ─── */
const CASES_ITEMS: DropItem[] = [];

/* ─── 안전 가이드 드롭다운 ─── */
const GUIDE_ITEMS = [
  {
    to: "/guide",
    icon: BookOpen,
    label: "스미싱 예방법 총정리",
    desc: "유형별 대응법을 한눈에 정리",
  },
];

/* ─── 공통 드롭다운 컴포넌트 ─── */
interface DropItem {
  to: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  color?: string;
  bg?: string;
  tag?: string | null;
  tagColor?: string;
}

function NavDropdown({
  label,
  items,
  isActive,
  triggerIcon,
}: {
  label: string;
  items: DropItem[];
  isActive: boolean;
  triggerIcon?: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hoverOpen = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    timer.current = setTimeout(() => setOpen(false), 130);
  };

  const TIcon = triggerIcon;

  const navCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
      active
        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold"
        : "text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
    }`;

  return (
    <div
      className="relative"
      onMouseEnter={hoverOpen}
      onMouseLeave={hoverClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={navCls(isActive)}
      >
        {TIcon && <TIcon size={14} />}
        {label}
        <ChevronDown
          size={12}
          className={`opacity-50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.13 }}
            onMouseEnter={hoverOpen}
            onMouseLeave={hoverClose}
            className="absolute left-0 top-full pt-2 z-50"
            style={{ minWidth: "15rem" }}
          >
            <div className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-black/40 overflow-hidden py-1.5">
              {items.map(({ to, icon: Icon, label: itemLabel, desc, color, bg, tag, tagColor }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive: ia }) =>
                    `flex items-center gap-3 mx-1.5 px-3 py-2.5 rounded-xl transition-colors group ${
                      ia
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }`
                  }
                >
                  {bg ? (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>
                  ) : (
                    <Icon size={15} className="text-gray-400 dark:text-white/35 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
                        {itemLabel}
                      </span>
                      {tag && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${tagColor}`}
                          style={{ fontWeight: 600 }}
                        >
                          {tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("nb-theme") === "dark";
    } catch {
      return false; // private mode / quota / 비활성 환경 모두 라이트로 fallback
    }
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, logout } = useAdmin();
  const { senior: seniorMode, toggle: setSeniorMode, setSenior } = useSenior();

  // 어드민 라우트 정의 (시니어/다크 모드 useEffect에서 공통 사용)
  const isAdminRoute = ADMIN_PATH_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  // 시니어 모드 또는 어드민 라우트 = 다크 강제 (둘 다 다크 전용 디자인)
  // 일반 사용자 = 라이트. 어드민 진입 시 seniorMode가 false여도 다크로 강제.
  useEffect(() => {
    if (seniorMode || isAdminRoute) {
      setIsDark(true);
    } else {
      setIsDark(false);
    }
  }, [seniorMode, isAdminRoute]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("nb-theme", isDark ? "dark" : "light");
    } catch {
      /* localStorage 사용 불가 환경 무시 (private mode / quota 초과) */
    }
  }, [isDark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // 어드민 라우트 진입 시 시니어 모드 자동 해제 (admin UI는 senior-mode CSS 무효화)
  useEffect(() => {
    if (isAdminRoute && seniorMode) {
      setSenior(false);
    }
  }, [isAdminRoute, seniorMode, setSenior]);

  const scanPaths = SCAN_ITEMS.map((s) => s.to);
  const isScanActive = scanPaths.includes(location.pathname);
  const casesPaths = CASES_ITEMS.map((s) => s.to);
  const isCasesActive = casesPaths.includes(location.pathname);
  const guidePaths = GUIDE_ITEMS.map((s) => s.to);
  const isGuideActive = guidePaths.includes(location.pathname);

  const navCls = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
      isActive
        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold"
        : "text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
    }`;

  return (
    <div
      className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0b1120]"
      style={seniorMode && !isAdminRoute ? { paddingBottom: "84px" } : undefined}
    >

      {/* 알림 배너 */}
      <AnimatePresence>
        {alertVisible && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden bg-amber-50 dark:bg-amber-900/15 border-b border-amber-200 dark:border-amber-700/30"
          >
            <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Bell size={12} className="text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="flex-1">{TREND_ALERT}</span>
              <button onClick={() => setAlertVisible(false)} className="text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 transition-colors">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 헤더 */}
      <header className="bg-white dark:bg-[#0d1526] border-b border-gray-200 dark:border-white/10 sticky top-0 z-50 shadow-sm shadow-black/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center h-16 gap-8">

            {/* 로고 — 클릭 가능 명시 + 시니어 모드 시 senior-home으로 이동 */}
            <button
              type="button"
              onClick={() => navigate(seniorMode ? "/senior-home" : "/", { replace: false })}
              aria-label="NewBiz Shield 홈으로 이동"
              title="홈으로"
              className="flex items-center gap-2.5 shrink-0 cursor-pointer rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2563EB" }}>
                <ShieldCheck size={16} style={{ color: "white" }} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm text-gray-900 dark:text-white leading-none" style={{ fontWeight: 700 }}>NewBiz Shield</p>
                <p className="text-[10px] text-gray-400 dark:text-white/40 leading-none mt-0.5">스미싱 예방 플랫폼</p>
              </div>
            </button>

            {/* 데스크톱 GNB — 시니어 ON 시 메뉴 압축 (검사/신고/도움 4개) */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1">

              <NavLink to={seniorMode ? "/senior-home" : "/"} end className={({ isActive }) => navCls(isActive)}>홈</NavLink>

              {seniorMode ? (
                <>
                  <NavLink to="/senior-analyze" className={({ isActive }) => navCls(isActive)}>
                    <MessageSquareWarning size={14} />
                    문자 검사하기
                  </NavLink>
                  <NavLink to="/url" className={({ isActive }) => navCls(isActive)}>
                    <Link2 size={14} />
                    링크 검사하기
                  </NavLink>
                  <NavLink to="/senior-image" className={({ isActive }) => navCls(isActive)}>
                    <ImageIcon size={14} />
                    사진으로 검사하기
                  </NavLink>
                  <NavLink to="/report" className={({ isActive }) => navCls(isActive)}>
                    <Flag size={14} />
                    신고하기
                  </NavLink>
                  <NavLink to="/guide" className={({ isActive }) => navCls(isActive)}>
                    <BookOpen size={14} />
                    도움말
                  </NavLink>
                </>
              ) : (
                <>
                  <NavDropdown
                    label="실시간 검사"
                    items={SCAN_ITEMS}
                    isActive={isScanActive}
                    triggerIcon={Zap}
                  />

                  {CASES_ITEMS.length > 0 && (
                    <NavDropdown
                      label="피해 사례"
                      items={CASES_ITEMS}
                      isActive={isCasesActive}
                    />
                  )}

                  <NavDropdown
                    label="안전 가이드"
                    items={GUIDE_ITEMS}
                    isActive={isGuideActive}
                  />

                  <NavLink to="/report" className={({ isActive }) => navCls(isActive)}>
                    <Flag size={14} />
                    신고하기
                  </NavLink>

                  {/* 어드민 메뉴 — isAdmin일 때만 표시 */}
                  {isAdmin && (
                    <>
                      <div className="w-px h-5 bg-white/15 mx-1" />
                      <NavDropdown
                        label="운영 도구"
                        isActive={ADMIN_PATH_PREFIXES.some((p: string) => location.pathname === p || location.pathname.startsWith(p + "/"))}
                        triggerIcon={LayoutDashboard}
                        items={[
                          { to: "/dashboard", icon: LayoutDashboard, label: "대시보드", desc: "탐지 현황 대시보드" },
                        ]}
                      />
                      <button
                        type="button"
                        onClick={() => { logout(); navigate("/"); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-amber-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all ml-1 border border-amber-500/20 hover:border-red-500/30"
                        title="어드민 모드 해제"
                      >
                        <LogOut size={12} />
                        종료
                      </button>
                    </>
                  )}
                </>
              )}

            </nav>

            {/* 우측 고정 액션 */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              {isAdmin && (
                <span className="hidden sm:inline-flex text-xs px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400 mr-1">
                  관리자
                </span>
              )}

              {/* 시니어 모드 토글 — OFF면 ON + SeniorHome, ON이면 OFF + / */}
              <button
                type="button"
                onClick={() => {
                  if (seniorMode) {
                    setSenior(false);
                    navigate("/");
                  } else {
                    setSeniorMode();
                    navigate("/senior-home");
                  }
                }}
                title={seniorMode ? "시니어 모드 끄기 (일반 모드로)" : "시니어 모드 켜기 (큰 글씨 페이지)"}
                aria-label={seniorMode ? "시니어 모드 끄고 일반 페이지로 이동" : "시니어 모드 켜고 시니어 페이지로 이동"}
                aria-pressed={seniorMode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                  seniorMode
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                } cursor-pointer`}
                style={{ fontWeight: 500 }}
              >
                <Type size={14} />
                <span className="text-xs">{seniorMode ? "일반" : "시니어"}</span>
              </button>

              {/* 다크/라이트 토글 — 시니어 모드일 때는 다크 고정 (SeniorHome/SeniorAnalyzer 다크 전용 디자인) */}
              {!seniorMode && (
                <button
                  onClick={() => setIsDark((v) => !v)}
                  className="p-2 rounded-lg text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}

              {/* 세로 구분선 */}
              <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-white/10 mx-2" />

              {/* CTA */}
              <button
                onClick={() => navigate("/analyze")}
                className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-lg text-sm transition-opacity hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#2563EB", fontWeight: 600, color: "white" }}
              >
                <Search size={14} style={{ color: "white" }} />
                검사 시작
              </button>

              {/* 모바일 햄버거 */}
              <button
                className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 dark:border-white/8 overflow-hidden bg-white dark:bg-[#0d1526]"
            >
              <div className="px-4 py-3 space-y-0.5">

                <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                  홈
                </NavLink>

                {seniorMode ? (
                  <>
                    {/* 시니어 모드: 4개 메뉴만 */}
                    <NavLink to="/senior-analyze" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                      <MessageSquareWarning size={14} className="shrink-0" />
검사하기
                    </NavLink>
                    <NavLink to="/report" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                      <Flag size={14} className="shrink-0" />
                      신고하기
                    </NavLink>
                    <NavLink to="/guide" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                      <BookOpen size={14} className="shrink-0" />
                      도움말
                    </NavLink>
                  </>
                ) : (
                  <>
                    {/* 실시간 검사 */}
                    <div className="px-3 pt-3">
                      <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1.5" style={{ fontWeight: 600 }}>실시간 검사</p>
                    </div>
                    {SCAN_ITEMS.map(({ to, icon: Icon, label, color, bg }) => (
                      <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                          <Icon size={13} className={color} />
                        </div>
                        {label}
                      </NavLink>
                    ))}

                    {/* 피해 사례 (cleanup으로 빈 배열 — 섹션 자동 숨김) */}
                    {CASES_ITEMS.length > 0 && (
                      <>
                        <div className="px-3 pt-3">
                          <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1.5" style={{ fontWeight: 600 }}>피해 사례</p>
                        </div>
                        {CASES_ITEMS.map(({ to, icon: Icon, label }) => (
                          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                            <Icon size={14} className="text-gray-400 dark:text-white/35 shrink-0" />
                            {label}
                          </NavLink>
                        ))}
                      </>
                    )}

                    {/* 안전 가이드 */}
                    <div className="px-3 pt-3">
                      <p className="text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1.5" style={{ fontWeight: 600 }}>안전 가이드</p>
                    </div>
                    {GUIDE_ITEMS.map(({ to, icon: Icon, label }) => (
                      <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold" : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                        <Icon size={14} className="text-gray-400 dark:text-white/35 shrink-0" />
                        {label}
                      </NavLink>
                    ))}
                  </>
                )}

                {/* 시니어 모드 토글 */}
                <div className="pt-1 border-t border-gray-100 dark:border-white/8 mt-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (seniorMode) {
                        setSenior(false);
                        navigate("/");
                      } else {
                        setSeniorMode();
                        navigate("/senior-home");
                      }
                    }}
                    aria-pressed={seniorMode}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      seniorMode
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                        : "text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Type size={14} className="shrink-0" />
                    {seniorMode ? "일반 모드로 전환" : "시니어 모드 (큰 글씨)"}
                  </button>
                </div>

                <div className="pt-3 pb-1">
                  <button
                    onClick={() => navigate("/analyze")}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                    style={{ backgroundColor: "#2563EB", fontWeight: 600, color: "white" }}
                  >
                    <Search size={15} style={{ color: "white" }} />
                    검사 시작
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 콘텐츠 */}
      <main className="flex-1"><Outlet /></main>

      {/* 시니어 모드 고정 바 (어디서든 뒤로/처음/도움).
          단, /senior-home·/senior-analyze 자체에는 이미 Senior 헤더 nav(문자/신고/도움)와
          자체 뒤로/처음 컨트롤이 있어 SeniorBottomBar가 보조 버튼을 가리므로 숨김. */}
      {seniorMode && !isAdminRoute
        && location.pathname !== "/senior-home"
        && location.pathname !== "/senior-analyze"
        && <SeniorBottomBar />}

      {/* 푸터 */}
      <footer className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d1526] mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: "#2563EB" }}>
              <ShieldCheck size={12} style={{ color: "white" }} />
            </div>
            <span className="text-sm text-gray-500 dark:text-white/40">NewBiz Shield · 뉴비즈팀 · 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-white/30">
            <NavLink to="/guide"     className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">안전 가이드</NavLink>
            <span>·</span>
            <NavLink to="/report"    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">신고하기</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
