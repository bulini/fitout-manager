"use client";
import { useState } from "react";

/**
 * Mobile: tab segmentate (una sezione alla volta).
 * Desktop: prima sezione a sinistra, le altre impilate a destra.
 */
export function StoreTabs({ tabs }: { tabs: { key: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const [main, ...side] = tabs;

  return (
    <>
      <div
        className="sticky z-[900] -mx-3 mb-3 bg-stone-50/95 px-3 py-2 backdrop-blur md:hidden"
        style={{ top: "calc(var(--topbar-h) + var(--safe-top))" }}
      >
        <div className="flex rounded-xl bg-stone-200/70 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActive(t.key);
                window.scrollTo({ top: 0 });
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                active === t.key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="md:grid md:grid-cols-[1fr_360px] md:gap-4">
        <section className={active === main.key ? "" : "hidden md:block"}>{main.content}</section>
        <aside className="space-y-4">
          {side.map((t) => (
            <div key={t.key} className={active === t.key ? "" : "hidden md:block"}>
              {t.content}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
