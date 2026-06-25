import { useEffect, useState } from "react";
import {
  getQueryTemplate,
  addQueryGroup, updateQueryGroup, deleteQueryGroup,
  addQueryItem, updateQueryItem, deleteQueryItem,
} from "../lib/data.js";

export default function QueryTemplate() {
  const [tpl, setTpl] = useState(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTpl(await getQueryTemplate()); }
    catch (e) { setErr(e.message); }
  }

  function flash(msg) { setInfo(msg); setTimeout(() => setInfo(""), 1500); }

  async function run(fn) {
    setErr(""); setBusy(true);
    try { await fn(); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (err && !tpl) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!tpl) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const maxGroupSort = tpl.reduce((a, g) => Math.max(a, g.sortierung || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Vorlage Filialabfrage</div>
          <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 560 }}>
            Fragen, die vor der Migration je Filiale beantwortet werden (z. B. Kassenabfrage).
            Diese Vorlage gilt für alle Filialen; die Antworten werden je Filiale erfasst.
          </div>
        </div>
        <button className="btn" disabled={busy}
          onClick={() => run(() => addQueryGroup("Neue Gruppe", maxGroupSort + 1))}>
          + Gruppe
        </button>
      </div>

      {err && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {info && <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}>{info}</div>}

      <div style={{ display: "grid", gap: 14 }}>
        {tpl.map((g) => (
          <GroupEditor key={g.id} group={g} busy={busy} onRun={run} onFlash={flash} />
        ))}
        {tpl.length === 0 && (
          <div className="panel" style={{ color: "var(--dim)" }}>
            Noch keine Fragen. Mit „+ Gruppe" beginnen.
          </div>
        )}
      </div>
    </div>
  );
}

function GroupEditor({ group, busy, onRun, onFlash }) {
  const [titel, setTitel] = useState(group.titel);
  const maxItemSort = group.items.reduce((a, i) => Math.max(a, i.sortierung || 0), 0);

  return (
    <div className="panel">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ fontWeight: 700, color: "var(--accent)" }}
          value={titel} onChange={(e) => setTitel(e.target.value)}
          onBlur={() => {
            if (titel !== group.titel)
              onRun(() => updateQueryGroup(group.id, titel)).then(() => onFlash("Gespeichert"));
          }} />
        <button className="btn btn-danger" style={{ padding: "0 12px" }} disabled={busy}
          onClick={() => {
            if (confirm(`Gruppe „${group.titel}" mit allen Fragen löschen? Die zugehörigen Antworten gehen verloren.`))
              onRun(() => deleteQueryGroup(group.id));
          }}>✕</button>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {group.items.map((item) => (
          <ItemEditor key={item.id} item={item} busy={busy} onRun={onRun} onFlash={onFlash} />
        ))}
      </div>

      <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--accent)" }} disabled={busy}
        onClick={() => onRun(() => addQueryItem(group.id, "Neue Frage", maxItemSort + 1))}>
        + Frage
      </button>
    </div>
  );
}

function ItemEditor({ item, busy, onRun, onFlash }) {
  const [frage, setFrage] = useState(item.frage);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input className="input" value={frage} onChange={(e) => setFrage(e.target.value)}
        onBlur={() => {
          if (frage !== item.frage)
            onRun(() => updateQueryItem(item.id, frage)).then(() => onFlash("Gespeichert"));
        }} />
      <button className="btn btn-ghost" style={{ padding: "0 10px", color: "var(--coral)" }} disabled={busy}
        onClick={() => {
          if (confirm("Diese Frage löschen? Die zugehörigen Antworten gehen verloren."))
            onRun(() => deleteQueryItem(item.id));
        }}>✕</button>
    </div>
  );
}
