import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary captured an unhandled client error.", error, info);
  }

  override render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <Panel className="w-full max-w-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">Application Error</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-white">The client hit an unrecoverable error</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">{this.state.error.message}</p>
          <Button className="mt-6 sm:w-auto" onClick={() => window.location.reload()}>
            Reload App
          </Button>
        </Panel>
      </main>
    );
  }
}
