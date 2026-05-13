export const appName = "Aslaaa PT";
export const organizationName = "ASLAAA ESPORTS";

export const roleValues = ["ADMIN", "PT_MAKER"] as const;
export type UserRole = (typeof roleValues)[number];

export interface ProtectedRouteContractShape {
  description: string;
  label: string;
  path: string;
  roles: readonly UserRole[];
}

export const protectedRouteContracts: readonly ProtectedRouteContractShape[] = [
  {
    description: "Operational summary, live standings, activity, and execution health.",
    label: "Dashboard",
    path: "/dashboard",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Dynamic scrim workspace for tiers, groups, lobbies, autosave scoring, and presets.",
    label: "Scrims",
    path: "/scrims",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Weekly and tournament archive timelines built from immutable daily snapshots.",
    label: "Tournaments",
    path: "/tournaments",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Custom and favorite merge standings with realtime recalculation and persistence.",
    label: "Merges",
    path: "/merges",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Excel workbook exports for live standings, merges, archives, and registries.",
    label: "Exports",
    path: "/exports",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Admin-only unique team registry with strict parsing, dedupe reporting, and exports.",
    label: "Unique Teams",
    path: "/unique-teams",
    roles: ["ADMIN"],
  },
  {
    description: "Internal submission workflow for ideas, bugs, and workflow improvements.",
    label: "Suggestions",
    path: "/suggestions",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Milestone timeline combining manual achievements with system-generated highlights.",
    label: "Achievements",
    path: "/achievements",
    roles: ["ADMIN", "PT_MAKER"],
  },
  {
    description: "Admin control center for scoring rules, automation, resets, and platform operations.",
    label: "Settings",
    path: "/settings",
    roles: ["ADMIN"],
  },
  {
    description: "Admin-only user lifecycle management for internal account access.",
    label: "Users",
    path: "/users",
    roles: ["ADMIN"],
  },
] as const;

export type ProtectedAppRoute = (typeof protectedRouteContracts)[number]["path"];
export type ProtectedRouteContract = (typeof protectedRouteContracts)[number];

export function getAccessibleRoutesForRole(role: UserRole): ProtectedAppRoute[] {
  return protectedRouteContracts
    .filter((route) => route.roles.includes(role))
    .map((route) => route.path);
}

export function canRoleAccessRoute(role: UserRole, route: ProtectedAppRoute): boolean {
  return protectedRouteContracts.some((definition) => definition.path === route && definition.roles.includes(role));
}

export function getRouteContract(path: string): ProtectedRouteContract | undefined {
  return protectedRouteContracts.find((route) => route.path === path);
}

export function isProtectedAppRoute(path: string): path is ProtectedAppRoute {
  return protectedRouteContracts.some((route) => route.path === path);
}
