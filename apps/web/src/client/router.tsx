import { Spinner } from "@yapmate/components/ui/spinner";
import { useEffect, useState } from "react";
import { useUser } from "./contexts/user-context";
import { ChatLayout } from "./pages/chat-layout";
import { LoginPage } from "./pages/login";
import { MobileAuthPage } from "./pages/mobile-auth";
import { NotFoundPage } from "./pages/not-found";

/**
 * Loading component shown during auth check
 */
const AuthLoading = () => (
  <div className="flex min-h-svh items-center justify-center">
    <Spinner className="size-8" />
  </div>
);

/**
 * Client-side router with authentication guard
 * Redirects unauthenticated users to login before showing protected routes
 */
export const Router = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
  const { user, isLoading } = useUser();

  useEffect(() => {
    const handleNavigation = () => {
      setPathname(window.location.pathname);
    };

    // Handle browser back/forward
    window.addEventListener("popstate", handleNavigation);

    // Handle custom navigation events
    window.addEventListener("chatUrlChange", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("chatUrlChange", handleNavigation);
    };
  }, []);

  /**
   * Redirect to login if not authenticated and trying to access protected route
   */
  useEffect(() => {
    if (!(isLoading || user)) {
      const isProtectedRoute = pathname === "/" || pathname.startsWith("/chat");
      if (isProtectedRoute) {
        window.history.pushState(null, "", "/login");
        setPathname("/login");
      }
    }
  }, [isLoading, user, pathname]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return <AuthLoading />;
  }

  // Auth routes (public)
  if (pathname === "/login") {
    return <LoginPage />;
  }

  if (pathname === "/auth/mobile") {
    return <MobileAuthPage />;
  }

  // Protected routes - only render if authenticated
  if (pathname === "/" || pathname.startsWith("/chat")) {
    if (!user) {
      // Still checking or redirecting, show loading
      return <AuthLoading />;
    }
    return <ChatLayout />;
  }

  return <NotFoundPage />;
};

/**
 * Programmatic navigation helper
 */
export const navigate = (to: string) => {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
