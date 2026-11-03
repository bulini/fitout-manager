"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, LayersIcon, ListIcon, MapIcon } from "./Icons";

const ITEMS = [
  { href: "/", label: "Mappa", Icon: MapIcon },
  { href: "/tasks", label: "Da fare", Icon: ListIcon },
  { href: "/templates", label: "Template", Icon: LayersIcon },
  { href: "/settings", label: "Notifiche", Icon: BellIcon },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/stores");
  return path.startsWith(href);
}

/** Barra in basso (mobile) */
export function TabBar() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1100] border-t border-stone-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="grid h-[var(--tabbar-h)] grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? "text-brand-600" : "text-stone-500"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Link in alto (desktop) */
export function TopLinks() {
  const path = usePathname();
  return (
    <nav className="ml-4 hidden gap-1 md:flex">
      {ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`btn-ghost ${isActive(path, href) ? "bg-stone-100 text-stone-900" : ""}`}
        >
          {label === "Da fare" ? "Cose da fare" : label}
        </Link>
      ))}
    </nav>
  );
}
