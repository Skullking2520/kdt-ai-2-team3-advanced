export function PrototypeTabs({ onSelect, prototypes, selectedPrototype }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label="검사 화면 전환">
      {prototypes.map((prototype) => {
        const Icon = prototype.icon;
        const isSelected = selectedPrototype === prototype.id;

        return (
          <button
            aria-selected={isSelected}
            className={`min-h-14 rounded-lg border p-3 text-left transition ${
              isSelected
                ? prototype.tabClass
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
            }`}
            key={prototype.id}
            onClick={() => onSelect(prototype.id)}
            role="tab"
            type="button"
          >
            <span className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-md ${
                  isSelected ? prototype.iconClass : "bg-white text-slate-600"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-base font-black">{prototype.label}</span>
            </span>
            <span className="mt-2 hidden text-xs font-bold leading-5 opacity-80 sm:block">
              {prototype.summary}
            </span>
          </button>
        );
      })}
    </div>
  );
}

