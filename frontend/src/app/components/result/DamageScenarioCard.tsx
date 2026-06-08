import { motion } from "motion/react";
import { TrendingDown, ArrowDown } from "lucide-react";

interface DamageScenarioCardProps {
  riskLevel: "danger" | "warning" | "normal";
}

const damageSteps = {
  danger: [
    { icon: "📱", label: "문자 수신", desc: "스미싱 문자를 받음" },
    { icon: "👆", label: "링크 클릭", desc: "의심 없이 링크를 클릭" },
    { icon: "🌐", label: "가짜 페이지 이동", desc: "공식 사이트처럼 보이는 가짜 페이지" },
    { icon: "🔓", label: "개인정보 입력", desc: "이름, 주민번호, 카드번호 등 입력" },
    { icon: "💰", label: "금전 피해 발생", desc: "계좌에서 돈이 빠져나감" },
  ],
  warning: [
    { icon: "📱", label: "문자 수신", desc: "의심스러운 문자를 받음" },
    { icon: "👆", label: "링크 클릭", desc: "링크를 클릭할 경우" },
    { icon: "🌐", label: "가짜 페이지 이동", desc: "피싱 사이트로 연결될 수 있음" },
    { icon: "⚠️", label: "잠재적 위험", desc: "개인정보 유출 가능성" },
  ],
  normal: [],
};

export function DamageScenarioCard({ riskLevel }: DamageScenarioCardProps) {
  const steps = damageSteps[riskLevel];

  if (steps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/20 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="text-2xl">✅</div>
          <h3 className="text-base text-emerald-700 dark:text-emerald-400" style={{ fontWeight: 600 }}>
            예상 피해 없음
          </h3>
        </div>
        <p className="text-sm text-emerald-600 dark:text-emerald-400/80">
          현재 문자에서는 명백한 위험 요소가 발견되지 않았습니다.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
        <h3 className="text-base text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
          예상 피해 시나리오
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-white/60 mb-5">
        링크를 클릭하면 다음과 같은 피해가 발생할 수 있습니다.
      </p>

      <div className="space-y-0">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <div className="flex items-start gap-4">
              {/* 아이콘 + 세로선 */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-lg shrink-0">
                  {step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-8 bg-gradient-to-b from-red-200 dark:from-red-700/30 to-transparent my-1" />
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 pb-6">
                <p className="text-sm text-gray-900 dark:text-white mb-1" style={{ fontWeight: 600 }}>
                  {step.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-white/50">{step.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {riskLevel === "danger" && (
        <div className="mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-700/30">
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            ⚠️ 이미 링크를 클릭하거나 정보를 입력한 경우, 즉시 해당 기관(은행, 카드사 등)에 연락하여 계좌 지급정지 및 비밀번호 변경을 진행하세요.
          </p>
        </div>
      )}
    </motion.div>
  );
}
