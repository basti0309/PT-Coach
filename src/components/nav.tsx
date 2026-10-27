"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  exact?: boolean;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Untere Navigationsleiste (Kundenbereich, mobil). */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center text-[11px] font-medium ${
                  active ? "text-brand-600" : "text-slate-500"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Horizontale Tab-Leiste (Coach-Bereich, Kunden-Unterseiten). */
export function TabNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium ${
                  active ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
