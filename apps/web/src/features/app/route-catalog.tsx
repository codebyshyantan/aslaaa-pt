import { Suspense, lazy } from "react";

import type { ProtectedAppRoute, ProtectedRouteContract } from "@contracts/app-contract";
import { protectedRouteContracts } from "@contracts/app-contract";

import { Panel } from "@/components/ui/panel";

const AchievementsPage = lazy(() => import("@/features/achievements/AchievementsPage").then((module) => ({ default: module.AchievementsPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const ExportsPage = lazy(() => import("@/features/exports/ExportsPage").then((module) => ({ default: module.ExportsPage })));
const MergesPage = lazy(() => import("@/features/merges/MergesPage").then((module) => ({ default: module.MergesPage })));
const ScrimsPage = lazy(() => import("@/features/scrims/ScrimsPage").then((module) => ({ default: module.ScrimsPage })));
const SettingsFoundationPage = lazy(() =>
  import("@/features/settings/SettingsFoundationPage").then((module) => ({ default: module.SettingsFoundationPage })),
);
const SuggestionsPage = lazy(() => import("@/features/suggestions/SuggestionsPage").then((module) => ({ default: module.SuggestionsPage })));
const UniqueTeamsPage = lazy(() => import("@/features/teams/UniqueTeamsPage").then((module) => ({ default: module.UniqueTeamsPage })));
const TournamentsPage = lazy(() => import("@/features/tournaments/TournamentsPage").then((module) => ({ default: module.TournamentsPage })));
const UsersPage = lazy(() => import("@/features/users/UsersPage").then((module) => ({ default: module.UsersPage })));

export interface AppRouteDefinition {
  description: string;
  element: JSX.Element;
  label: string;
  path: ProtectedAppRoute;
}

function RouteLoadingState() {
  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Loading</p>
        <p className="mt-2 font-display text-3xl font-semibold text-white">Preparing module</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          The requested workspace is being loaded.
        </p>
      </Panel>
    </section>
  );
}

function withLazyBoundary(component: JSX.Element) {
  return <Suspense fallback={<RouteLoadingState />}>{component}</Suspense>;
}

const routeElements: Record<ProtectedAppRoute, JSX.Element> = {
  "/achievements": withLazyBoundary(<AchievementsPage />),
  "/dashboard": withLazyBoundary(<DashboardPage />),
  "/exports": withLazyBoundary(<ExportsPage />),
  "/merges": withLazyBoundary(<MergesPage />),
  "/scrims": withLazyBoundary(<ScrimsPage />),
  "/settings": withLazyBoundary(<SettingsFoundationPage />),
  "/suggestions": withLazyBoundary(<SuggestionsPage />),
  "/tournaments": withLazyBoundary(<TournamentsPage />),
  "/unique-teams": withLazyBoundary(<UniqueTeamsPage />),
  "/users": withLazyBoundary(<UsersPage />),
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
