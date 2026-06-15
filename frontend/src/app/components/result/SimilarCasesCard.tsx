import { motion } from "motion/react";
import { FileText, TrendingUp, ChevronRight } from "lucide-react";

interface SimilarCase {
  title: string;
  similarity: number;
  year: string;
}

interface SimilarCasesCardProps {
  cases: SimilarCase[];
}

export function SimilarCasesCard({ cases }: SimilarCasesCardProps) {
  if (cases.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} className="text-gray-600 dark:text-white/60" />
        <h3 className="text-base text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
          유사 사례
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
        최근 신고된 유사한 스미싱 사례입니다.
      </p>

      <div className="space-y-2">
        {cases.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors cursor-pointer group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-white/80 mb-1 leading-snug truncate">
                {item.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/40">
                <TrendingUp size={12} />
                <span>유사도 {item.similarity}%</span>
                <span>·</span>
                <span>{item.year}년</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/50 transition-colors shrink-0" />
          </motion.div>
        ))}
      </div>

      <button className="w-full mt-3 py-2 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1">
        더 많은 사례 보기
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}
