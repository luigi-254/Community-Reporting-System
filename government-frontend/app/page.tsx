import HomeRedirect from "./HomeRedirect";

/**
 * The root route forwards to the government dashboard. The session gate lives
 * in the AuthProvider, so this segment is withheld from the static shell;
 * opt it out of instant-navigation validation.
 */
export const instant = false;

export default function HomePage() {
  return <HomeRedirect />;
}
