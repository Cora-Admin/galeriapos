import { useEffect, useState } from "react";
import { getAuthUsers, deleteUserAccount, setUserPassword, updateUser } from "../lib/data.js";

const ROLLEN = ["Admin", "ATOS Ingenieur", "Projektleitung", "Mitglied"];

export default function Users() {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setUsers(await getAuthUsers()); }
    catch (e) { setErr(e.message); }
  }

  function flash(msg) { setInfo(msg); setTimeout(() => setInfo(""), 2500); }

  async function run(fn) {
    setErr(""); setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (err && !users) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!users) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Userverwaltung</div>
        <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 680 }}>
          Angezeigt werden die in <strong>Supabase Auth</strong> hinterlegten User – die
          zentrale, einheitliche Userverwaltung. Neue User werden ausschließlich in Supabase
          angelegt (Authentication → Users), nicht in dieser App. Rolle, Name und Aktiv-Status
          lassen sich hier pflegen; Nutzer mit passender Rolle stehen zudem als
          ATOS-Rollout-Ingenieure zur Auswahl.
        </div>
      </div>

      {err && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {info && <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}>{info}</div>}

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Letzter Login</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.auth_user_id || u.id} user={u} busy={busy} onRun={run} onFlash={flash} rollen={ROLLEN} />
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--dim)" }}>
                Keine User in Supabase Auth hinterlegt.
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "–"; }
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
      <td style={{ color: "var(--dim)", fontSize: 12, whiteSpace: "nowrap" }}>
        {fmtDate(user.last_sign_in_at)}
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
