import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { memberRoles, roleLabels, canManageRole, type MemberRole } from "@/lib/permissions";
import { formatDateTimeInBrasilia } from "@/lib/datetime";
import {
  inviteOrganizationMemberAction,
  removeOrganizationMemberAction,
  resendOrganizationInviteAction,
  updateOrganizationMemberRoleAction,
} from "@/app/actions/users";

type UsersPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

type MemberRow = {
  user_id: string | null;
  invited_email: string | null;
  invited_name: string | null;
  role: MemberRole;
  invitation_status: string | null;
  invited_at: string | null;
  joined_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function formatDate(value?: string | null) {
  return formatDateTimeInBrasilia(value, "-");
}

function statusLabel(member: MemberRow) {
  if (member.user_id && member.joined_at) return "Ativo";
  if (member.user_id) return "Conta criada";
  if (member.invitation_status === "sent") return "Convite enviado";
  return "Convite pendente";
}

function statusClass(member: MemberRow) {
  if (member.user_id && member.joined_at) return "users-status-active";
  if (member.user_id) return "users-status-created";
  if (member.invitation_status === "sent") return "users-status-sent";
  return "users-status-pending";
}

export default async function OrganizationUsersPage({ searchParams }: UsersPageProps) {
  const query = await searchParams;
  const organization = await requireCurrentOrganization("users:manage");
  const supabase = await createClient();

  const { data: membersData, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id, invited_email, invited_name, role, invitation_status, invited_at, joined_at, last_seen_at, created_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  const members = (membersData ?? []) as MemberRow[];
  const userIds = members.map((member) => member.user_id).filter(Boolean) as string[];

  let profiles: ProfileRow[] = [];
  let profilesError: { message?: string } | null = null;

  if (userIds.length) {
    const profilesResult = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
    profiles = (profilesResult.data ?? []) as ProfileRow[];
    profilesError = profilesResult.error;
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const loadError = membersError?.message || profilesError?.message;
  const activeCount = members.filter((member) => member.user_id).length;
  const inviteCount = members.filter((member) => !member.user_id).length;
  const managerCount = members.filter((member) => ["owner", "admin"].includes(member.role)).length;
  const financeCount = members.filter((member) => ["owner", "admin", "expert", "financial"].includes(member.role)).length;

  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Configuracoes</p>
          <h1>Usuarios e acesso</h1>
          <p>Convide usuarios, defina niveis fixos e controle quem acessa financeiro, laudos e configuracoes.</p>
        </div>
        <Link className="button button-secondary" href="/configuracoes">Voltar</Link>
      </div>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}
      {loadError && (
        <div className="notice notice-error">
          Nao foi possivel carregar a equipe. Confirme se a migracao 010_role_based_access_control.sql
          foi executada no Supabase. Detalhe: {loadError}
        </div>
      )}

      <section className="users-summary-grid">
        <article className="card users-summary-card"><span>Ativos</span><strong>{activeCount}</strong><small>Contas com acesso ao escritorio</small></article>
        <article className="card users-summary-card"><span>Convites</span><strong>{inviteCount}</strong><small>Pendentes ou enviados</small></article>
        <article className="card users-summary-card"><span>Gestores</span><strong>{managerCount}</strong><small>Proprietario e administradores</small></article>
        <article className="card users-summary-card"><span>Financeiro</span><strong>{financeCount}</strong><small>Perfis com acesso financeiro</small></article>
      </section>

      <section className="users-admin-grid">
        <div className="card panel users-invite-card">
          <div className="panel-header">
            <div>
              <h2>Convidar usuario</h2>
              <p>O convite sera enviado para o e-mail informado.</p>
            </div>
          </div>
          <form action={inviteOrganizationMemberAction} className="users-invite-form">
            <label className="field">
              <span>Nome completo</span>
              <input className="input" name="full_name" placeholder="Ex.: Maria Oliveira" required />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input className="input" name="email" type="email" placeholder="usuario@email.com" required />
            </label>
            <label className="field">
              <span>Nivel de acesso</span>
              <select className="select" name="role" defaultValue="assistant">
                {memberRoles.filter((role) => role !== "owner").map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </label>
            <div className="users-invite-actions">
              <button className="button button-primary" type="submit">Enviar convite</button>
            </div>
          </form>
        </div>

        <aside className="card panel users-role-card">
          <div className="panel-header">
            <div>
              <h2>Niveis principais</h2>
              <p>Resumo rapido das permissoes.</p>
            </div>
          </div>
          <div className="users-role-list">
            <div><strong>Proprietario / Administrador</strong><span>Acesso total e gestao de usuarios.</span></div>
            <div><strong>Perito</strong><span>Operacional completo e financeiro liberado.</span></div>
            <div><strong>Financeiro</strong><span>Honorarios, despesas e consulta de processos.</span></div>
            <div><strong>Assistente / Consulta</strong><span>Sem acesso ao financeiro.</span></div>
          </div>
        </aside>
      </section>

      <div className="table-card users-table-card">
        <div className="table-header">
          <div>
            <h2>Equipe do escritorio</h2>
            <p>{members.length} usuario(s) e convite(s) vinculados.</p>
          </div>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Nivel</th>
                <th>Situacao</th>
                <th>Ultimo acesso</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const profile = member.user_id ? profileById.get(member.user_id) : null;
                const displayName = profile?.full_name || member.invited_name || "Usuario";
                const displayEmail = profile?.email || member.invited_email || "-";
                const canEdit = member.role !== "owner" && canManageRole(organization.role, member.role);

                return (
                  <tr key={member.user_id || member.invited_email || member.created_at}>
                    <td><strong className="users-name">{displayName}</strong></td>
                    <td><span className="users-email">{displayEmail}</span></td>
                    <td>
                      {canEdit ? (
                        <form action={updateOrganizationMemberRoleAction} className="inline-form">
                          <input type="hidden" name="user_id" value={member.user_id || ""} />
                          <input type="hidden" name="invited_email" value={member.invited_email || ""} />
                          <input type="hidden" name="current_role" value={member.role} />
                          <select className="select select-small" name="role" defaultValue={member.role}>
                            {memberRoles.filter((role) => role !== "owner").map((role) => (
                              <option key={role} value={role}>{roleLabels[role]}</option>
                            ))}
                          </select>
                          <button className="button button-secondary button-small" type="submit">Salvar</button>
                        </form>
                      ) : (
                        <span className="users-role-badge">{roleLabels[member.role]}</span>
                      )}
                    </td>
                    <td><span className={`users-status ${statusClass(member)}`}>{statusLabel(member)}</span></td>
                    <td>{formatDate(member.last_seen_at || member.joined_at)}</td>
                    <td>
                      {canEdit ? (
                        <div className="inline-actions">
                          {member.invited_email && (
                            <form action={resendOrganizationInviteAction}>
                              <input type="hidden" name="invited_email" value={member.invited_email} />
                              <input type="hidden" name="current_role" value={member.role} />
                              <button className="button button-secondary button-small" type="submit">Reenviar</button>
                            </form>
                          )}
                          <form action={removeOrganizationMemberAction}>
                            <input type="hidden" name="user_id" value={member.user_id || ""} />
                            <input type="hidden" name="invited_email" value={member.invited_email || ""} />
                            <input type="hidden" name="current_role" value={member.role} />
                            <button className="button button-danger button-small" type="submit">Remover</button>
                          </form>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
