export const memberRoles = ["owner", "admin", "expert", "financial", "assistant", "viewer"] as const;

export type MemberRole = (typeof memberRoles)[number];

export type Permission =
  | "dashboard:view"
  | "processes:view"
  | "processes:write"
  | "processes:delete"
  | "templates:view"
  | "templates:write"
  | "documents:view"
  | "documents:write"
  | "reports:view"
  | "reports:write"
  | "reports:delete"
  | "calendar:view"
  | "calendar:write"
  | "calendar:delete"
  | "alerts:view"
  | "finance:view"
  | "finance:write"
  | "finance:delete"
  | "settings:view"
  | "settings:write"
  | "users:manage";

const permissionsByRole: Record<MemberRole, Permission[]> = {
  owner: [
    "dashboard:view",
    "processes:view",
    "processes:write",
    "processes:delete",
    "templates:view",
    "templates:write",
    "documents:view",
    "documents:write",
    "reports:view",
    "reports:write",
    "reports:delete",
    "calendar:view",
    "calendar:write",
    "calendar:delete",
    "alerts:view",
    "finance:view",
    "finance:write",
    "finance:delete",
    "settings:view",
    "settings:write",
    "users:manage",
  ],
  admin: [
    "dashboard:view",
    "processes:view",
    "processes:write",
    "processes:delete",
    "templates:view",
    "templates:write",
    "documents:view",
    "documents:write",
    "reports:view",
    "reports:write",
    "reports:delete",
    "calendar:view",
    "calendar:write",
    "calendar:delete",
    "alerts:view",
    "finance:view",
    "finance:write",
    "finance:delete",
    "settings:view",
    "settings:write",
    "users:manage",
  ],
  expert: [
    "dashboard:view",
    "processes:view",
    "processes:write",
    "templates:view",
    "templates:write",
    "documents:view",
    "documents:write",
    "reports:view",
    "reports:write",
    "calendar:view",
    "calendar:write",
    "alerts:view",
    "finance:view",
    "finance:write",
  ],
  financial: [
    "dashboard:view",
    "processes:view",
    "alerts:view",
    "finance:view",
    "finance:write",
  ],
  assistant: [
    "dashboard:view",
    "processes:view",
    "templates:view",
    "documents:view",
    "documents:write",
    "reports:view",
    "reports:write",
    "calendar:view",
    "calendar:write",
    "alerts:view",
  ],
  viewer: [
    "dashboard:view",
    "processes:view",
    "templates:view",
    "documents:view",
    "reports:view",
    "calendar:view",
    "alerts:view",
  ],
};

export const roleLabels: Record<MemberRole, string> = {
  owner: "Proprietario",
  admin: "Administrador",
  expert: "Perito",
  financial: "Financeiro",
  assistant: "Assistente tecnico",
  viewer: "Consulta",
};

export function hasPermission(role: MemberRole, permission: Permission) {
  return permissionsByRole[role]?.includes(permission) ?? false;
}

export function canManageRole(actorRole: MemberRole, targetRole: MemberRole) {
  if (!hasPermission(actorRole, "users:manage")) return false;
  if (targetRole === "owner") return actorRole === "owner";
  return actorRole === "owner" || actorRole === "admin";
}

export function isMemberRole(value: string): value is MemberRole {
  return memberRoles.includes(value as MemberRole);
}
