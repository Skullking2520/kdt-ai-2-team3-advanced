import { Link, useNavigate } from "react-router";
import { Home, Search, ArrowLeft, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

export function NotFound() {
  const nav = useNavigate();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-xl w-full text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/30 mb-6">
          <ShieldAlert size={36} className="text-amber-500 dark:text-amber-400" />
        </div>

        <p className="text-7xl mb-2 text-amber-500 dark:text-amber-400" style={{ fontWeight: 800 }}>
          404
        </p>
        <h1 className="text-2xl text-gray-900 dark:text-white mb-2" style={{ fontWeight: 700 }}>
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-gray-600 dark:text-white/60 mb-8 leading-relaxed">
          요청하신 주소가 잘못되었거나, 더 이상 제공하지 않는 페이지일 수 있어요.
          <br />
          스미싱·피싱 분석은 홈에서 다시 시작하실 수 있습니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={() => nav(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={14} />
            이전 페이지
          </button>
          <Link
            to="/analyze"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-blue-200 dark:border-blue-500/30 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Search size={14} />
            문자 검사하기
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#2563EB", fontWeight: 600 }}
          >
            <Home size={14} />
            홈으로
          </Link>
        </div>

        <p className="text-xs text-gray-400 dark:text-white/30 mt-8">
          문제가 계속되면{" "}
          <Link to="/report" className="underline hover:text-blue-500">
            신고하기
          </Link>
          로 알려주세요.
        </p>
      </motion.div>
    </div>
  );
}
