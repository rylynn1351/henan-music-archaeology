"use client";

import { Component, type ReactNode } from "react";

type ModuleErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type ModuleErrorBoundaryState = {
  hasError: boolean;
};

export default class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ModuleErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
