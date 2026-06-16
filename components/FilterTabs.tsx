"use client";

interface FilterTabsProps<T extends string> {
  tabs: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}

export function FilterTabs<T extends string>({
  tabs,
  active,
  onChange,
}: FilterTabsProps<T>) {
  return (
    <div className="no-scrollbar flex flex-wrap items-center gap-sm overflow-x-auto border-b border-outline-variant pb-xs">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`rounded px-md py-sm font-label-caps text-label-caps uppercase tracking-wider transition-all ${
              isActive
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
