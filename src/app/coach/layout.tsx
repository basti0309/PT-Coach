import Link from "next/link";
import { TabNav } from "@/components/nav";
import { requireCoach } from "@/lib/auth";

const ITEMS = [
  { href: "/coach", label: "Übersicht", exact: true },
  { href: "/coach/posteingang", label: "Posteingang" },
  { href: "/coach/kunden", label: "Kunden" },
  { href: "/coach/wissen", label: "Wissensbasis" },
  { href: "/coach/regeln", label: "Eskalationsregeln" },
  { href: "/coach/einrichtung", label: "Einrichtung" },
];

export default async function CoachLayout({ children }: LayoutProps<"/coach">) {
  const viewer = await requireCoach();
  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-16 pt-4">
      <header className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/coach" className="text-lg font-bold">
            PT-Coach <span className="badge bg-brand-50 text-brand-700">Coach</span>
          </Link>
          <form action="/auth/abmelden" method="post">
            <button className="btn-secondary btn-small" title={viewer.email}>
              Abmelden
            </button>
          </form>
        </div>
        <TabNav items={ITEMS} />
      </header>
      {children}
    </div>
  );
}
