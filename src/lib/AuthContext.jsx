import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

// Nur diese E-Mail-Domains dürfen sich per Microsoft anmelden.
export const ALLOWED_EMAIL_DOMAINS = ["galeria.de", "everstore.cloud", "atos.de"];

function isAllowedEmail(email) {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    // Prüft die Domain bei OAuth-Logins (Microsoft) und meldet unerlaubte
    // Nutzer sofort wieder ab. Gibt true zurück, wenn die Session gültig ist.
    async function enforceDomain(s) {
      const provider = s?.user?.app_metadata?.provider;
      if (provider === "azure" && !isAllowedEmail(s.user.email)) {
        setAuthError(
          "Anmeldung nur mit einer E-Mail-Adresse der Domains " +
            ALLOWED_EMAIL_DOMAINS.map((d) => "@" + d).join(", ") +
            " möglich."
        );
        await supabase.auth.signOut();
        setSession(null);
        return false;
      }
      return true;
    }

    // Bestehende Session laden
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && (await enforceDomain(data.session))) {
        setSession(data.session);
      }
      setLoading(false);
    });
    // Auf Änderungen (Login/Logout/Token-Refresh) hören
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s && event === "SIGNED_IN" && !(await enforceDomain(s))) return;
      setSession(s);
      if (s) setAuthError("");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    authError,
    clearAuthError: () => setAuthError(""),
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signInWithMicrosoft: () =>
      supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email openid profile",
          redirectTo: window.location.origin,
        },
      }),
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
    resetPassword: (email) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset",
      }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  return ctx;
}
