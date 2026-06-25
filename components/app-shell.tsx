import Link from "next/link";
import { Logo } from "@/components/logo";
import { signOutAction } from "@/app/actions/auth";
import type { CurrentOrganization } from "@/lib/current-organization";

const navItems = [
  ["/dashboard", "Visão geral", "⌂"],
  ["/processos", "Processos", "▣"],
  ["/biblioteca", "Biblioteca técnica", "▤"],
  ["/honorarios", "Honorários", "◇"],
  ["/configuracoes", "Configurações", "⚙"],
] as const;

export function AppShell({ organization, userEmail, children }: { organization: CurrentOrganization; userEmail: string; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top"><Logo /></div>
        <nav className="sidebar-nav" aria-label="Navegação do sistema">
          {navItems.map(([href, label, icon]) => (
            <Link key={href} href={href} className="sidebar-link">
              <span aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="organization-chip">
            <small>ESCRITÓRIO</small>
            <strong>{organization.name}</strong>
            <span>{userEmail}</span>
          </div>
          <form action={signOutAction}><button className="button button-ghost button-full" type="submit">Sair</button></form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
