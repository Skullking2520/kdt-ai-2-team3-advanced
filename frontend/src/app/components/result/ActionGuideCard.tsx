import { motion } from "motion/react";
import { CheckCircle2, Phone } from "lucide-react";

interface ActionGuideCardProps {
  actionGuide: string[];
  riskLevel: "danger" | "warning" | "normal";
}

const emergencyContacts = [
  { name: "경찰청 사이버범죄", number: "182", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { name: "금융감독원", number: "1332", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { name: "한국인터넷진흥원", number: "118", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
];

export function ActionGuideCard({ actionGuide, riskLevel }: ActionGuideCardProps) {
  const showEmergency = riskLevel === "danger" || riskLevel === "warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-[#111c30] border border-gray-200 dark:border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-base text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>
          대응 가이드
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
        {riskLevel === "danger"
          ? "지금 즉시 다음 조치를 취하세요."
          : riskLevel === "warning"
          ? "다음 사항을 주의하세요."
          : "안전하지만 다음 사항을 기억하세요."}
      </p>

      <div className="space-y-3 mb-5">
        {actionGuide.map((action, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-start gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-blue-600 dark:text-blue-400" style={{ fontWeight: 600 }}>
                {index + 1}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed flex-1">{action}</p>
          </motion.div>
        ))}
      </div>

      {showEmergency && (
        <div className="pt-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Phone size={14} className="text-gray-500 dark:text-white/50" />
            <p className="text-xs text-gray-600 dark:text-white/60" style={{ fontWeight: 600 }}>
              긴급 연락처
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {emergencyContacts.map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className={`p-2.5 rounded-lg ${contact.bg} border border-gray-200 dark:border-white/10 hover:opacity-80 transition-opacity cursor-pointer`}
              >
                <p className="text-[10px] text-gray-500 dark:text-white/50 mb-0.5">{contact.name}</p>
                <p className={`text-sm ${contact.color}`} style={{ fontWeight: 700 }}>
                  {contact.number}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
