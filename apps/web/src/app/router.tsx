import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLoaderData,
  useRouteLoaderData,
} from "react-router-dom";

import { ProtectedAppLayout } from "@/features/app/ProtectedAppLayout";
import { RouteErrorBoundary } from "@/features/app/RouteErrorBoundary";
import { appRouteDefinitions, getDefaultProtectedRoute } from "@/features/app/route-catalog";
import { AuthPage } from "@/features/auth/AuthPage";
import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { sessionLoader, type SessionLoaderData } from "@/features/auth/loaders/session-loader";
import { ProtectedRoute } from "@/features/auth/routes/ProtectedRoute";

function AppBootstrap() {
  const { session } = useLoaderData() as SessionLoaderData;

  return (
    <AuthProvider initialSession={session}>
      <Outlet />
    </AuthProvider>
  );
}

function IndexRedirect() {
  const loaderData = useRouteLoaderData("root") as SessionLoaderData | undefined;

  if (!loaderData?.session) {
    return <Navigate replace to="/login" />;
  }

  return <Navigate replace to={getDefaultProtectedRoute(loaderData.session.accessibleRoutes)} />;
}

export const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    loader: sessionLoader,
    element: <AppBootstrap />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <IndexRedirect />,
      },
      {
        path: "login",
        element: <AuthPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <ProtectedAppLayout />,
            children: appRouteDefinitions.map((route) => ({
              path: route.path.slice(1),
              element: <ProtectedRoute requiredRoute={route.path}>{route.element}</ProtectedRoute>,
            })),
          },
        ],
      },
      {
        path: "*",
        element: <Navigate replace to="/" />,
      },
    ],
  },
]);
