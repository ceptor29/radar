export type Role = "admin" | "compliance_lead" | "control_owner" | "risk_owner" | "auditor" | "viewer";
export type Resource = "risk" | "control" | "evidence" | "framework" | "dashboard" | "activity" | "admin";
export type Action = "view" | "edit" | "approve" | "export";

export const ALL_ROLES: Role[] = [
  "admin",
  "compliance_lead",
  "control_owner",
  "risk_owner",
  "auditor",
  "viewer",
];

const EVERYONE: Role[] = ALL_ROLES;

export const PERMISSIONS: Record<Resource, Partial<Record<Action, Role[]>>> = {
  risk: {
    view: EVERYONE,
    edit: ["admin", "compliance_lead", "risk_owner"],
    approve: ["admin", "compliance_lead"],
    export: ["admin", "compliance_lead", "auditor"],
  },
  control: {
    view: EVERYONE,
    edit: ["admin", "compliance_lead", "control_owner"],
    approve: ["admin", "compliance_lead"],
    export: ["admin", "compliance_lead", "auditor"],
  },
  evidence: {
    view: EVERYONE,
    edit: ["admin", "compliance_lead", "control_owner"],
    approve: ["admin", "compliance_lead"],
    export: ["admin", "compliance_lead", "auditor"],
  },
  framework: {
    view: EVERYONE,
    edit: ["admin", "compliance_lead"],
    export: ["admin", "compliance_lead", "auditor"],
  },
  dashboard: {
    view: EVERYONE,
  },
  activity: {
    view: ["admin", "compliance_lead", "auditor"],
  },
  admin: {
    view: ["admin"],
    edit: ["admin"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSIONS[resource][action]?.includes(role) ?? false;
}

export function requireRole(roles: Role[], resource: Resource, action: Action): boolean {
  return roles.some((r) => can(r, resource, action));
}
