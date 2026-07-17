import {
  ArrowLeft,
  BookOpen,
  KeyRound,
  Link2,
  LockKeyhole,
  Mail,
  UserPlus
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "../supabase";
import { VERSION_LABEL } from "../version";

type AuthMode = "signin" | "signup" | "magic" | "reset";

interface AuthScreenProps {
  configurationMissing?: boolean;
}

function friendlyError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Adresse email ou mot de passe incorrect.";
  }

  if (lower.includes("email not confirmed")) {
    return "Confirme d’abord ton adresse email grâce au message reçu.";
  }

  if (lower.includes("user already registered")) {
    return "Un compte existe déjà avec cette adresse email.";
  }

  if (lower.includes("password")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }

  return message;
}

export default function AuthScreen({
  configurationMissing = false
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;

  const resetFeedback = () => {
    setMessage("");
    setErrorMessage("");
  };

  const changeMode = (nextMode: AuthMode) => {
    resetFeedback();
    setMode(nextMode);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    resetFeedback();
    setBusy(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) throw error;

        if (data.session) {
          setMessage("Compte créé. Tu es maintenant connecté.");
        } else {
          setMessage(
            "Compte créé. Ouvre le message reçu pour confirmer ton adresse email."
          );
        }
        return;
      }

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) throw error;

        setMessage(
          "Lien de connexion envoyé. Vérifie ta boîte mail et tes courriers indésirables."
        );
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: redirectUrl
        }
      );
      if (error) throw error;

      setMessage(
        "Message de réinitialisation envoyé. Vérifie ta boîte mail."
      );
    } catch (error) {
      setErrorMessage(
        friendlyError(
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  if (configurationMissing) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-config-card">
          <div className="auth-brand">
            <span className="auth-logo">
              <BookOpen size={30} />
            </span>
            <div>
              <h1>MathMaster Notes</h1>
              <span>{VERSION_LABEL}</span>
            </div>
          </div>

          <div className="auth-config-warning">
            <LockKeyhole size={25} />
            <div>
              <h2>Connexion non configurée</h2>
              <p>
                Ajoute les variables Supabase dans un fichier <code>.env.local</code>
                avant de lancer l’application.
              </p>
            </div>
          </div>

          <pre>{`VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>

          <p className="auth-small">
            Le site public restera verrouillé tant que ces variables ne seront
            pas définies pendant la compilation.
          </p>
        </section>
      </main>
    );
  }

  const descriptions: Record<AuthMode, string> = {
    signin: "Connecte-toi pour ouvrir ton cahier.",
    signup: "Crée ton compte MathMaster Notes.",
    magic: "Reçois un lien de connexion par email.",
    reset: "Reçois un lien pour modifier ton mot de passe."
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">
            <BookOpen size={30} />
          </span>
          <div>
            <h1>MathMaster Notes</h1>
            <span>{VERSION_LABEL}</span>
          </div>
        </div>

        <div className="auth-heading">
          <h2>
            {mode === "signin" && "Connexion"}
            {mode === "signup" && "Créer un compte"}
            {mode === "magic" && "Lien magique"}
            {mode === "reset" && "Mot de passe oublié"}
          </h2>
          <p>{descriptions[mode]}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Adresse email
            <span className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="nom@exemple.fr"
              />
            </span>
          </label>

          {(mode === "signin" || mode === "signup") && (
            <label>
              Mot de passe
              <span className="auth-input">
                <KeyRound size={18} />
                <input
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={6}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="6 caractères minimum"
                />
              </span>
            </label>
          )}

          {errorMessage && (
            <div className="auth-feedback auth-error">{errorMessage}</div>
          )}

          {message && (
            <div className="auth-feedback auth-success">{message}</div>
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {mode === "signin" && <LockKeyhole size={18} />}
            {mode === "signup" && <UserPlus size={18} />}
            {mode === "magic" && <Link2 size={18} />}
            {mode === "reset" && <Mail size={18} />}
            {busy
              ? "Patiente…"
              : mode === "signin"
                ? "Se connecter"
                : mode === "signup"
                  ? "Créer mon compte"
                  : mode === "magic"
                    ? "Envoyer le lien"
                    : "Réinitialiser"}
          </button>
        </form>

        {mode === "signin" ? (
          <>
            <div className="auth-secondary-actions">
              <button onClick={() => changeMode("signup")}>
                Créer un compte
              </button>
              <button onClick={() => changeMode("reset")}>
                Mot de passe oublié
              </button>
            </div>

            <button
              className="auth-magic-button"
              onClick={() => changeMode("magic")}
            >
              <Link2 size={17} />
              Se connecter sans mot de passe
            </button>
          </>
        ) : (
          <button
            className="auth-back"
            onClick={() => changeMode("signin")}
          >
            <ArrowLeft size={17} />
            Retour à la connexion
          </button>
        )}

        <p className="auth-privacy">
          La session est mémorisée sur cet appareil. Les notes restent
          actuellement enregistrées localement dans ton navigateur.
        </p>
      </section>
    </main>
  );
}
