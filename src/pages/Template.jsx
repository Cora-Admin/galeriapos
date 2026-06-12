import { useEffect, useState } from "react";
import {
  getTemplate,
  addTemplateGroup, updateTemplateGroup, deleteTemplateGroup,
  addTemplateItem, updateTemplateItem, deleteTemplateItem,
} from "../lib/data.js";

export default function Template() {
  const [tpl, setTpl] = useState(null);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTpl(await getTemplate()); }
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
          <div style={{ fontSize: 18, fontWeight: 700 }}>Vorlage POS Installations-Checkliste</div>
          <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 560 }}>
            Diese Vorlage gilt für jede Kasse jedes Stores. Neue Prüfpunkte erscheinen
            automatisch in allen laufenden Checklisten; gelöschte Punkte werden überall entfernt.
          </div>
        </div>
        <button className="btn" disabled={busy}
          onClick={() => run(() => addTemplateGroup("Neue Gruppe", maxGroupSort + 1))}>
          + Gruppe
        </button>
      </div>

      {err && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      {info && <div style={{ color: "var(--accent)", fontSize: 13, marginBottom: 12 }}>{info}</div>}

      <div style={{ display: "grid", gap: 14 }}>
        {tpl.map((g) => (
          <GroupEditor key={g.id} group={g} busy={busy} onRun={run} onFlash={flash} />
        ))}
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
              onRun(() => updateTemplateGroup(group.id, titel)).then(() => onFlash("Gespeichert"));
          }} />
        <button className="btn btn-danger" style={{ padding: "0 12px" }} disabled={busy}
          onClick={() => {
            if (confirm(`Gruppe „${group.titel}" mit allen Prüfpunkten löschen? Die zugehörigen Häkchen in allen Kassen gehen verloren.`))
              onRun(() => deleteTemplateGroup(group.id));
          }}>✕</button>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {group.items.map((item) => (
          <ItemEditor key={item.id} item={item} busy={busy} onRun={onRun} onFlash={onFlash} />
        ))}
      </div>

      <button className="btn btn-ghost" style={{ marginTop: 8, color: "var(--accent)" }} disabled={busy}
        onClick={() => onRun(() => addTemplateItem(group.id, "Neuer Prüfpunkt", maxItemSort + 1))}>
        + Prüfpunkt
      </button>
    </div>
  );
}

function ItemEditor({ item, busy, onRun, onFlash }) {
  const [text, setText] = useState(item.text);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== item.text)
            onRun(() => updateTemplateItem(item.id, text)).then(() => onFlash("Gespeichert"));
        }} />
      <button className="btn btn-ghost" style={{ padding: "0 10px", color: "var(--coral)" }} disabled={busy}
        onClick={() => {
          if (confirm("Diesen Prüfpunkt löschen? Die zugehörigen Häkchen in allen Kassen gehen verloren."))
            onRun(() => deleteTemplateItem(item.id));
        }}>✕</button>
    </div>
  );
}
