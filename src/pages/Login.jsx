import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Login() {
  const { signIn, resetPassword } = useAuth();
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

  async function handleReset() {
    if (!email) { setError("Bitte zuerst E-Mail eingeben."); return; }
    setError(""); setBusy(true);
    const { error } = await resetPassword(email);
    setBusy(false);
    if (error) setError(error.message);
    else setInfo("Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen versendet.");
  }

  return (
    <div className="center-screen">
      <form onSubmit={handleLogin} className="panel" style={{ width: 360, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, var(--accent), var(--blue))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, color: "#fff" }}>P</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>POS Migration Cockpit</div>
            <div style={{ fontSize: 12, color: "var(--dim)" }}>GALERIA Rollout</div>
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
      </form>
    </div>
  );
}
