import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { memberRoles, roleLabels, canManageRole, type MemberRole } from "@/lib/permissions";
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
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(member: MemberRow) {
  if (member.user_id && member.joined_at) return "Ativo";
  if (member.user_id) return "Conta criada";
  if (member.invitation_status === "sent") return "Convite enviado";
  return "Convite pendente";
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

      <div className="form-card">
        <h2>Convidar usuario</h2>
        <form action={inviteOrganizationMemberAction} className="form-grid">
          <label>
            Nome
            <input name="full_name" placeholder="Nome completo" required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" placeholder="usuario@email.com" required />
          </label>
          <label>
            Nivel de acesso
            <select name="role" defaultValue="assistant">
              {memberRoles.filter((role) => role !== "owner").map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button className="button button-primary" type="submit">Enviar convite</button>
          </div>
        </form>
      </div>

      <div className="table-card">
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
                    <td>{displayName}</td>
                    <td>{displayEmail}</td>
                    <td>
                      {canEdit ? (
                        <form action={updateOrganizationMemberRoleAction} className="inline-form">
                          <input type="hidden" name="user_id" value={member.user_id || ""} />
                          <input type="hidden" name="invited_email" value={member.invited_email || ""} />
                          <input type="hidden" name="current_role" value={member.role} />
                          <select name="role" defaultValue={member.role}>
                            {memberRoles.filter((role) => role !== "owner").map((role) => (
                              <option key={role} value={role}>{roleLabels[role]}</option>
                            ))}
                          </select>
                          <button className="button button-secondary" type="submit">Salvar</button>
                        </form>
                      ) : (
                        roleLabels[member.role]
                      )}
                    </td>
                    <td>{statusLabel(member)}</td>
                    <td>{formatDate(member.last_seen_at || member.joined_at)}</td>
                    <td>
                      {canEdit ? (
                        <div className="inline-actions">
                          {member.invited_email && (
                            <form action={resendOrganizationInviteAction}>
                              <input type="hidden" name="invited_email" value={member.invited_email} />
                              <input type="hidden" name="current_role" value={member.role} />
                              <button className="button button-secondary" type="submit">Reenviar</button>
                            </form>
                          )}
                          <form action={removeOrganizationMemberAction}>
                            <input type="hidden" name="user_id" value={member.user_id || ""} />
                            <input type="hidden" name="invited_email" value={member.invited_email || ""} />
                            <input type="hidden" name="current_role" value={member.role} />
                            <button className="button button-danger" type="submit">Remover</button>
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
