import { BottomNav } from "@/components/nav";
import { requireClient } from "@/lib/auth";

const ITEMS = [
  { href: "/kunde", label: "Heute", icon: "◎", exact: true },
  { href: "/kunde/plan", label: "Plan", icon: "▦" },
  { href: "/kunde/training", label: "Training", icon: "✓" },
  { href: "/kunde/fortschritt", label: "Fortschritt", icon: "↗" },
  { href: "/kunde/chat", label: "Chat", icon: "✉" },
  { href: "/kunde/profil", label: "Profil", icon: "☺" },
];

export default async function KundeLayout({ children }: LayoutProps<"/kunde">) {
  await requireClient();
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-24 pt-4">
      {children}
      <BottomNav items={ITEMS} />
    </div>
  );
}
