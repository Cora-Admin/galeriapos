import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../lib/data.js";
import { useAuth } from "../lib/AuthContext.jsx";

// Schlüssel in `app_settings`, die auf dieser Seite gepflegt werden.
const LEER = {
  problem_mail_aktiv: "false",
  problem_mail_empfaenger: "",
  problem_mail_absender: "",
  problem_mail_app_url: "",
};

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState(LEER);
  const [geladen, setGeladen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const s = await getSettings();
      setForm({ ...LEER, ...s });
      setGeladen(true);
    } catch (e) { setErr(e.message); }
  }

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setGespeichert(false);
  }

  async function speichern() {
    setSpeichert(true);
    setErr("");
    try {
      await saveSettings(form, user?.email);
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 2500);
    } catch (e) { setErr(e.message); }
    setSpeichert(false);
  }

  const aktiv = form.problem_mail_aktiv === "true";
  const ohneEmpfaenger = aktiv && !form.problem_mail_empfaenger.trim();

  if (err && !geladen) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!geladen) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Einstellungen</div>
        <div style={{ fontSize: 12, color: "var(--dim)" }}>
          Gelten für alle Nutzer des Cockpits
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 680 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
          Benachrichtigung bei Rollout-Problemen
        </div>
        <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 20 }}>
          Sobald in einer Kassen-Checkliste ein Problem gemeldet wird, geht eine
          E-Mail an die hinterlegte Adresse. Im Betreff stehen Filiale, Kasse und
          ein Kurztitel, im Text die vollständige Problembeschreibung.
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20,
          cursor: "pointer" }}>
          <input type="checkbox" checked={aktiv} style={{ marginTop: 3, width: 16, height: 16 }}
            onChange={(e) => set("problem_mail_aktiv", e.target.checked ? "true" : "false")} />
          <span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>E-Mail-Versand aktiv</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--dim)" }}>
              Ist der Haken nicht gesetzt, wird nichts verschickt – gemeldet wird
              das Problem im Cockpit trotzdem.
            </span>
          </span>
        </label>

        <div style={{ marginBottom: 16 }}>
          <div className="label">Empfänger</div>
          <input className="input" type="text" value={form.problem_mail_empfaenger}
            placeholder="rollout@everstore.consulting"
            onChange={(e) => set("problem_mail_empfaenger", e.target.value)} />
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5 }}>
            Mehrere Adressen mit Komma trennen.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="label">Absender</div>
          <input className="input" type="text" value={form.problem_mail_absender}
            placeholder="POS Migration Cockpit &lt;cockpit@everstore.consulting&gt;"
            onChange={(e) => set("problem_mail_absender", e.target.value)} />
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5 }}>
            Die Domain muss in Resend verifiziert sein. Zum Testen funktioniert
            <code style={{ margin: "0 4px" }}>onboarding@resend.dev</code>
            ohne eigene Domain.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="label">Adresse des Cockpits</div>
          <input className="input" type="text" value={form.problem_mail_app_url}
            placeholder="https://galeria.everstore.consulting"
            onChange={(e) => set("problem_mail_app_url", e.target.value)} />
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 5 }}>
            Wird für den „Im Cockpit öffnen“-Link in der Mail verwendet.
          </div>
        </div>

        {ohneEmpfaenger && (
          <div style={{ fontSize: 13, color: "var(--coral)", marginBottom: 14 }}>
            Der Versand ist aktiv, aber es ist kein Empfänger hinterlegt – es geht
            keine Mail raus.
          </div>
        )}
        {err && (
          <div style={{ fontSize: 13, color: "var(--coral)", marginBottom: 14 }}>
            Fehler: {err}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={speichern} disabled={speichert}>
            {speichert ? "Speichert…" : "Speichern"}
          </button>
          {gespeichert && (
            <span style={{ fontSize: 13, color: "var(--fertig)" }}>Gespeichert</span>
          )}
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 680, marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Einmalige Einrichtung</div>
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          Der Versand läuft über Resend. Der API-Key liegt nicht hier, sondern als
          Secret <code>RESEND_API_KEY</code> im Supabase-Dashboard unter
          Edge Functions → Secrets. Ohne diesen Key meldet der Versand einen Fehler.
        </div>
      </div>
    </div>
  );
}
