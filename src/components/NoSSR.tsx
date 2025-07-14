"use client";
import { useEffect, useState } from "react";

interface NoSSRProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * NoSSR component to prevent server-side rendering of child components
 * This is useful for components that use browser-only APIs or localStorage
 */
export function NoSSR({ children, fallback = null }: NoSSRProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default NoSSR;
