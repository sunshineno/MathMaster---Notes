import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import AuthScreen from "./AuthScreen";
import { isSupabaseConfigured, supabase } from "../supabase";

interface AuthContextValue {
  user: User;
  session: Session;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth doit être utilisé dans AuthProvider.");
  }

  return value;
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        console.error("Impossible de lire la session Supabase :", error);
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue | null>(() => {
    if (!session?.user) return null;

    return {
      user: session.user,
      session,
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    };
  }, [session]);

  if (!isSupabaseConfigured) {
    return <AuthScreen configurationMissing />;
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Vérification de la session…</p>
      </div>
    );
  }

  if (!value) {
    return <AuthScreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
