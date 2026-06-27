import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { billingStatusLabels, isOrganizationBillingBlocked, type OrganizationBillingState } from "@/lib/billing";
import type { CurrentOrganization } from "@/lib/current-organization";
import type { Permission } from "@/lib/permissions";
import { hasPermission, roleLabels } from "@/lib/permissions";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: "P", permission: "dashboard:view" },
  { href: "/calculadora-honorarios", label: "Calculadora de Honorarios/Proposta", icon: "H", permission: "finance:view" },
  { href: "/processos", label: "Processos", icon: "#", permission: "processes:view" },
  { href: "/biblioteca", label: "Biblioteca tecnica", icon: "B", permission: "templates:view" },
  { href: "/documentos", label: "Documentos", icon: "D", permission: "documents:view" },
  { href: "/laudos", label: "Laudos", icon: "L", permission: "reports:view" },
  { href: "/financeiro", label: "Financeiro", icon: "$", permission: "finance:view" },
  { href: "/agenda", label: "Agenda", icon: "A", permission: "calendar:view" },
  { href: "/alertas", label: "Alertas", icon: "!", permission: "alerts:view" },
  { href: "/ajuda", label: "Ajuda", icon: "?", permission: "dashboard:view" },
  { href: "/configuracoes", label: "Configuracoes", icon: "*", permission: "settings:view" },
  { href: "/admin", label: "Admin SaaS", icon: "@", platformOnly: true },
] satisfies Array<{ href: string; label: string; icon: string; permission?: Permission; platformOnly?: boolean }>;

export function AppShell({
  organization,
  userEmail,
  isPlatformAdmin = false,
  billingState,
  children,
}: {
  organization: CurrentOrganization;
  userEmail: string;
  isPlatformAdmin?: boolean;
  billingState?: OrganizationBillingState;
  children: React.ReactNode;
}) {
  const visibleNavItems = navItems.filter((item) => {
    if (item.platformOnly) return isPlatformAdmin;
    return item.permission ? hasPermission(organization.role, item.permission) : true;
  });
  const billingStatus = billingState?.billing_status;
  const billingBlocked = isOrganizationBillingBlocked(billingState);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top"><Logo /></div>
        <nav className="sidebar-nav" aria-label="Navegacao do sistema">
          {visibleNavItems.map(({ href, label, icon }) => (
            <Link key={href} href={href} className="sidebar-link">
              <span aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="organization-chip">
            <small>ESCRITORIO</small>
            <strong>{organization.name}</strong>
            <span>{roleLabels[organization.role]}</span>
            <span>{userEmail}</span>
            {billingStatus && (
              <span className={`organization-billing organization-billing-${billingStatus}`}>
                {billingBlocked ? "Assinatura bloqueada" : billingStatusLabels[billingStatus]}
              </span>
            )}
          </div>
          <form action={signOutAction}><button className="button button-ghost button-full" type="submit">Sair</button></form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
