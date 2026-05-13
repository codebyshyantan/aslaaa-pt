import type { ProtectedAppRoute, ProtectedRouteContract } from "@contracts/app-contract";
import { protectedRouteContracts } from "@contracts/app-contract";

import { AchievementsPage } from "@/features/achievements/AchievementsPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ExportsPage } from "@/features/exports/ExportsPage";
import { MergesPage } from "@/features/merges/MergesPage";
import { ScrimsPage } from "@/features/scrims/ScrimsPage";
import { SettingsFoundationPage } from "@/features/settings/SettingsFoundationPage";
import { SuggestionsPage } from "@/features/suggestions/SuggestionsPage";
import { UniqueTeamsPage } from "@/features/teams/UniqueTeamsPage";
import { TournamentsPage } from "@/features/tournaments/TournamentsPage";
import { UsersPage } from "@/features/users/UsersPage";

export interface AppRouteDefinition {
  description: string;
  element: JSX.Element;
  label: string;
  path: ProtectedAppRoute;
}

const routeElements: Record<ProtectedAppRoute, JSX.Element> = {
  "/achievements": <AchievementsPage />,
  "/dashboard": <DashboardPage />,
  "/exports": <ExportsPage />,
  "/merges": <MergesPage />,
  "/scrims": <ScrimsPage />,
  "/settings": <SettingsFoundationPage />,
  "/suggestions": <SuggestionsPage />,
  "/tournaments": <TournamentsPage />,
  "/unique-teams": <UniqueTeamsPage />,
  "/users": <UsersPage />,
};

export const appRouteDefinitions: AppRouteDefinition[] = protectedRouteContracts.map(
  (route: ProtectedRouteContract): AppRouteDefinition => ({
    description: route.description,
    element: routeElements[route.path as ProtectedAppRoute]!,
    label: route.label,
    path: route.path,
  }),
);

export function getDefaultProtectedRoute(accessibleRoutes: ProtectedAppRoute[]): ProtectedAppRoute {
  return appRouteDefinitions.find((route) => accessibleRoutes.includes(route.path))?.path ?? "/dashboard";
}

export function getRouteDefinitionByPath(pathname: string): AppRouteDefinition | ProtectedRouteContract | undefined {
  return appRouteDefinitions.find((route) => route.path === pathname);
}

export function getVisibleRouteDefinitions(accessibleRoutes: ProtectedAppRoute[]) {
  return appRouteDefinitions.filter((route) => accessibleRoutes.includes(route.path));
}
