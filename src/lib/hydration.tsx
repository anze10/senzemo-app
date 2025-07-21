import React from "react";
import { useEffect, useState } from "react";

/**
 * Hook to safely use Zustand stores that persist to localStorage
 * This prevents hydration mismatches by ensuring the store is only used on the client
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Higher-order component to wrap components that use persisted Zustand stores
 * This prevents SSR issues by only rendering the component on the client
 */
export function withHydration<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ComponentType<T> | React.ReactNode,
) {
  const WrappedComponent = (props: T) => {
    const isHydrated = useHydrated();

    if (!isHydrated) {
      if (fallback) {
        return typeof fallback === "function" ? (
          React.createElement(fallback, props)
        ) : (
          <>{fallback}</>
        );
      }
      return null;
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withHydration(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
