import { TabNav } from "@/components/nav";
import { loadClient } from "@/lib/data/clients";

export default async function ClientLayout({ children, params }: LayoutProps<"/coach/kunden/[clientId]">) {
  const { clientId } = await params;
  const client = await loadClient(clientId);
  const base = `/coach/kunden/${clientId}`;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1">
          {client.full_name} <span className="badge bg-slate-100 align-middle text-slate-700">{client.short_code}</span>
        </h1>
        <p className="muted">{client.email}</p>
      </div>
      <TabNav
        items={[
          { href: base, label: "Übersicht", exact: true },
          { href: `${base}/profil`, label: "Profil" },
          { href: `${base}/plan`, label: "Plan" },
          { href: `${base}/training`, label: "Training" },
          { href: `${base}/fortschritt`, label: "Fortschritt" },
          { href: `${base}/chat`, label: "Chat" },
        ]}
      />
      {children}
    </div>
  );
}
