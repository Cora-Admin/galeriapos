import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import BrandMark from "../components/BrandMark.jsx";

export default function Login() {
  const { signIn, resetPassword, signInWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setInfo(""); setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError("Anmeldung fehlgeschlagen: " + error.message);
    else navigate("/");
  }

  async function handleMicrosoft() {
    setError(""); setInfo(""); setBusy(true);
    const { error } = await signInWithMicrosoft();
    // Bei Erfolg leitet Supabase zum Microsoft-Login weiter; nur Fehler behandeln.
    if (error) {
      setBusy(false);
      setError("Microsoft-Anmeldung fehlgeschlagen: " + error.message);
    }
  }

  async function handleReset() {
    if (!email) { setError("Bitte zuerst E-Mail eingeben."); return; }
    setError(""); setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) setError(error.message);
    else setInfo("Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen versendet.");
  }

  return (
    <div className="center-screen" style={{
      backgroundImage: "url(/galeria-bg.svg)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}>
      <form onSubmit={handleLogin} className="panel" style={{ width: 372, padding: 30,
        boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <BrandMark size={42} rounded={12} />
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.01em" }}>POS Migration Cockpit</div>
            <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: ".08em" }}>GALERIA Rollout</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="label">E-Mail</div>
          <input className="input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="label">Passwort</div>
          <input className="input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>

        {error && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {info && <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}>{info}</div>}

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Anmelden…" : "Anmelden"}
        </button>
        <button type="button" className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }}
          onClick={handleReset} disabled={busy}>
          Passwort vergessen?
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border, rgba(0,0,0,.12))" }} />
          <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: ".06em" }}>oder</div>
          <div style={{ flex: 1, height: 1, background: "var(--border, rgba(0,0,0,.12))" }} />
        </div>

        <button type="button" className="btn btn-ghost"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          onClick={handleMicrosoft} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Mit Microsoft anmelden
        </button>
      </form>
    </div>
  );
}
