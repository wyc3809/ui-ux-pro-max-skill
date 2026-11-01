import { Redirect } from "expo-router";

/**
 * vcseed://auth-callback: where Apple and Google send people back after native sign-in. The auth session
 * reads the code itself (src/api/remote.ts); if the system also opens this route, it simply returns home.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
