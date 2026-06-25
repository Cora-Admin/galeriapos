import { useEffect, useState } from "react";
import { getUsers, createUserAccount, deleteUserAccount, setUserPassword, updateUser } from "../lib/data.js";

const ROLLEN = ["Admin", "ATOS Ingenieur", "Projektleitung", "Mitglied"];
const EMPTY = { email: "", name: "", rolle: "Mitglied", password: "" };

function generatePassword(len = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export default function Users() {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [neu, setNeu] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setUsers(await getUsers()); }
    catch (e) { setErr(e.message); }
  }

  function flash(msg) { setInfo(msg); setTimeout(() => setInfo(""), 2500); }

  async function run(fn) {
    setErr(""); setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function anlegen(e) {
    e.preventDefault();
    const email = neu.email.trim();
    if (!email || neu.password.length < 8) {
      setErr("E-Mail und Passwort (mindestens 8 Zeichen) erforderlich.");
      return;
    }
    setErr(""); setBusy(true);
    try {
      await createUserAccount({
        email, password: neu.password,
        name: neu.name.trim() || null, rolle: neu.rolle,
      });
      await load();
      setNeu(EMPTY);
      flash(`User „${email}" in Supabase angelegt.`);
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  if (err && !users) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!users) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Userverwaltung</div>
        <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 640 }}>
          Beim Anlegen wird ein echter Supabase-Login (E-Mail + Passwort) erstellt – der User
          kann sich sofort anmelden. Angelegte User stehen zudem als ATOS-Rollout-Ingenieure
          zur Auswahl.
        </div>
      </div>

      {err && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {info && <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}>{info}</div>}

      <form className="panel" onSubmit={anlegen}
        style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ flex: "1 1 200px" }}>
          <div className="label">E-Mail</div>
          <input className="input" type="email" required placeholder="name@galeria.de"
            value={neu.email} onChange={(e) => setNeu({ ...neu, email: e.target.value })} />
        </label>
        <label style={{ flex: "1 1 150px" }}>
          <div className="label">Name</div>
          <input className="input" placeholder="Vorname Nachname"
            value={neu.name} onChange={(e) => setNeu({ ...neu, name: e.target.value })} />
        </label>
        <label style={{ flex: "0 0 160px" }}>
          <div className="label">Rolle</div>
          <select className="input" value={neu.rolle}
            onChange={(e) => setNeu({ ...neu, rolle: e.target.value })}>
            {ROLLEN.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label style={{ flex: "1 1 200px" }}>
          <div className="label">Passwort (min. 8 Zeichen)</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="input" required minLength={8}
              style={{ fontFamily: "ui-monospace, monospace" }}
              placeholder="Passwort"
              value={neu.password} onChange={(e) => setNeu({ ...neu, password: e.target.value })} />
            <button type="button" className="btn" title="Zufälliges Passwort erzeugen"
              onClick={() => setNeu({ ...neu, password: generatePassword() })}>🎲</button>
          </div>
        </label>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Lege an…" : "+ User anlegen"}
        </button>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Login</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} busy={busy} onRun={run} onFlash={flash} rollen={ROLLEN} />
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--dim)" }}>Noch keine User.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, busy, onRun, onFlash, rollen }) {
  const [name, setName] = useState(user.name || "");
  const hatLogin = !!user.auth_user_id;

  function passwortAendern() {
    const pw = window.prompt(`Neues Passwort für ${user.email} (mindestens 8 Zeichen):`);
    if (pw == null) return;
    if (pw.length < 8) { onFlash(""); alert("Passwort muss mindestens 8 Zeichen haben."); return; }
    onRun(() => setUserPassword(user, pw)).then(() => onFlash("Passwort geändert."));
  }

  return (
    <tr>
      <td>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if ((name || "") !== (user.name || ""))
              onRun(() => updateUser(user.id, { name: name || null })).then(() => onFlash("Gespeichert."));
          }} />
      </td>
      <td style={{ color: "var(--dim)" }}>{user.email}</td>
      <td>
        <select className="input" value={user.rolle}
          onChange={(e) => onRun(() => updateUser(user.id, { rolle: e.target.value }))}>
          {rollen.map((r) => <option key={r}>{r}</option>)}
        </select>
      </td>
      <td>
        {hatLogin ? (
          <span className="badge" style={{ background: "color-mix(in srgb, var(--fertig) 15%, transparent)",
            color: "var(--fertig)" }}>✓ aktiv</span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--dim)" }}>kein Login</span>
        )}
      </td>
      <td>
        <button className="btn btn-ghost" disabled={busy}
          style={{ color: user.aktiv ? "var(--fertig)" : "var(--dim)" }}
          onClick={() => onRun(() => updateUser(user.id, { aktiv: !user.aktiv }))}>
          {user.aktiv ? "● aktiv" : "○ inaktiv"}
        </button>
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {hatLogin && (
          <button className="btn btn-ghost" disabled={busy} onClick={passwortAendern}
            style={{ marginRight: 4 }}>Passwort</button>
        )}
        <button className="btn btn-danger" disabled={busy}
          onClick={() => {
            if (confirm(`User „${user.name || user.email}" inkl. Supabase-Login löschen?`))
              onRun(() => deleteUserAccount(user));
          }}>✕</button>
      </td>
    </tr>
  );
}
