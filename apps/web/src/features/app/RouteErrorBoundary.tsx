import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

function resolveErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return error.data?.message ?? error.statusText;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected route error occurred.";
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = resolveErrorMessage(error);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Panel className="w-full max-w-2xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">Route Error</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white">Application state could not be restored</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">{message}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="sm:w-auto" onClick={() => window.location.reload()}>
            Reload App
          </Button>
          <Link className="sm:w-auto" to="/login">
            <Button className="sm:w-auto" variant="secondary">
              Return To Login
            </Button>
          </Link>
        </div>
      </Panel>
    </main>
  );
}
