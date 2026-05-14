import { MVP_TABS } from "../../data/mvpTabs";

export function MvpTabs({ activeTab, onChange, warm }) {
  return (
    <div className={`rounded-3xl border p-2 ${warm ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7">
        {MVP_TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button className={`min-h-16 rounded-2xl px-3 py-2 text-left transition ${selected ? (warm ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-indigo-600 text-white shadow-lg shadow-indigo-200") : (warm ? "bg-white text-amber-950 hover:bg-amber-50" : "bg-white text-slate-700 hover:bg-indigo-50")}`} key={tab.id} onClick={() => onChange(tab.id)} type="button">
              <Icon className="mb-1 h-4 w-4" />
              <span className="block text-sm font-black leading-5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
