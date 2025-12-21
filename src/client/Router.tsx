import { useEffect, useState } from "react";
import { ChatLayout } from "./pages/ChatLayout";
import { LoginPage } from "./pages/Login";

/**
 * Simple client-side router based on pathname
 */
export const Router = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

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

  // Auth routes
  if (pathname === "/login") {
    return <LoginPage />;
  }

  // Chat routes (protected)
  if (pathname === "/" || pathname.startsWith("/chat")) {
    return <ChatLayout />;
  }

  return <div>404 Not Found</div>;
};

/**
 * Programmatic navigation helper
 */
export const navigate = (to: string) => {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
