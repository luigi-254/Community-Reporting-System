import GovernmentDashboardClient from "./GovernmentDashboardClient";

/**
 * The session gate lives in the AuthProvider, so the server render of this
 * segment is the session-loading screen rather than the dashboard. Opt the
 * segment out of instant-navigation validation, which cannot be satisfied
 * when the page is intentionally withheld until the session resolves.
 */
export const instant = false;

export default function GovernmentDashboardPage() {
  return <GovernmentDashboardClient />;
}
