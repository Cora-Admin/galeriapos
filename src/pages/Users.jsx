import { useEffect, useState } from "react";
import { getUsers, addUser, updateUser, deleteUser } from "../lib/data.js";

const ROLLEN = ["Admin", "ATOS Ingenieur", "Projektleitung", "Mitglied"];

export default function Users() {
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [neu, setNeu] = useState({ email: "", name: "", rolle: "Mitglied" });

  useEffect(() => { load(); }, []);

  async function load() {
    try { setUsers(await getUsers()); }
    catch (e) { setErr(e.message); }
  }

  function flash(msg) { setInfo(msg); setTimeout(() => setInfo(""), 1500); }

  async function run(fn) {
    setErr(""); setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function einladen(e) {
    e.preventDefault();
    const email = neu.email.trim();
    if (!email) return;
    await run(() => addUser({ email, name: neu.name.trim() || null, rolle: neu.rolle }));
    setNeu({ email: "", name: "", rolle: "Mitglied" });
    flash("User hinzugefügt");
  }

  if (err && !users) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!users) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Userverwaltung</div>
        <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 620 }}>
          Team-Mitglieder verwalten. Angelegte User stehen u. a. als ATOS-Rollout-Ingenieure
          zur Auswahl. (Login-Einladung per E-Mail folgt – aktuell wird das Verzeichnis gepflegt.)
        </div>
      </div>

      {err && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {info && <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}>{info}</div>}

      <form className="panel" onSubmit={einladen}
        style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ flex: "1 1 200px" }}>
          <div className="label">E-Mail</div>
          <input className="input" type="email" required placeholder="name@galeria.de"
            value={neu.email} onChange={(e) => setNeu({ ...neu, email: e.target.value })} />
        </label>
        <label style={{ flex: "1 1 160px" }}>
          <div className="label">Name</div>
          <input className="input" placeholder="Vorname Nachname"
            value={neu.name} onChange={(e) => setNeu({ ...neu, name: e.target.value })} />
        </label>
        <label style={{ flex: "0 0 170px" }}>
          <div className="label">Rolle</div>
          <select className="input" value={neu.rolle}
            onChange={(e) => setNeu({ ...neu, rolle: e.target.value })}>
            {ROLLEN.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" disabled={busy} type="submit">+ User einladen</button>
      </form>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} busy={busy} onRun={run} onFlash={flash} rollen={ROLLEN} />
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--dim)" }}>Noch keine User.</td></tr>
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

  return (
    <tr>
      <td>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if ((name || "") !== (user.name || ""))
              onRun(() => updateUser(user.id, { name: name || null })).then(() => onFlash("Gespeichert"));
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
        <button className="btn btn-ghost" disabled={busy}
          style={{ color: user.aktiv ? "var(--fertig)" : "var(--dim)" }}
          onClick={() => onRun(() => updateUser(user.id, { aktiv: !user.aktiv }))}>
          {user.aktiv ? "● aktiv" : "○ inaktiv"}
        </button>
      </td>
      <td style={{ textAlign: "right" }}>
        <button className="btn btn-danger" disabled={busy}
          onClick={() => {
            if (confirm(`User „${user.name || user.email}" löschen?`))
              onRun(() => deleteUser(user.id));
          }}>✕</button>
      </td>
    </tr>
  );
}
