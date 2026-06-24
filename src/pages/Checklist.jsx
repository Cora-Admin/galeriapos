import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStore, getTemplate, getResults, setResult, setResultText } from "../lib/data.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Checklist() {
  const { id, kasseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [template, setTemplate] = useState([]);
  const [results, setResults] = useState({}); // item_id -> erledigt
  const [texts, setTexts] = useState({}); // item_id -> { problem }
  const [err, setErr] = useState("");

  useEffect(() => { load(); }, [kasseId]);

  async function load() {
    try {
      setStore(await getStore(id));
      setTemplate(await getTemplate());
      const res = await getResults(kasseId);
      const map = {};
      const txt = {};
      res.forEach((r) => {
        map[r.item_id] = r.erledigt;
        txt[r.item_id] = { problem: r.problem || "" };
      });
      setResults(map);
      setTexts(txt);
    } catch (e) { setErr(e.message); }
  }

  async function toggle(itemId, val) {
    setResults((prev) => ({ ...prev, [itemId]: val }));
    try {
      await setResult(kasseId, itemId, val, user?.email || null);
    } catch (e) {
      setErr(e.message);
      setResults((prev) => ({ ...prev, [itemId]: !val })); // Rollback
    }
  }

  // Lokale Eingabe ohne sofortigen DB-Write (gespeichert wird beim Verlassen).
  function onTextChange(itemId, field, val) {
    setTexts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: val } }));
  }

  // Beim Verlassen des Feldes speichern, sofern sich der Wert geändert hat.
  async function saveText(itemId, field, val, original) {
    if ((val || "") === (original || "")) return;
    try {
      await setResultText(kasseId, itemId, { [field]: val || null });
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!store) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const total = template.reduce((a, g) => a + g.items.length, 0);
  const done = Object.values(results).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const kasseNr = kasseId; // Anzeige unten via store-Kontext nicht nötig

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => navigate(`/stores/${id}`)}>← Zurück</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store.name}</div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>
            POS Installations-Checkliste · {store.migrationsdatum || "kein Datum"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 800,
            color: pct === 100 ? "var(--fertig)" : "var(--accent)" }}>{pct}%</div>
          <div style={{ fontSize: 11, color: "var(--dim)" }}>{done} von {total}</div>
        </div>
      </div>

      <div className="bar" style={{ height: 8, marginBottom: 20, border: "1px solid var(--line)" }}>
        <span style={{ width: `${pct}%`,
          background: pct === 100 ? "var(--fertig)" : "var(--accent)" }} />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {template.map((g) => (
          <div key={g.id} className="panel">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "var(--accent)" }}>
              {g.titel}
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              {g.items.map((item) => {
                const checked = !!results[item.id];
                const t = texts[item.id] || { problem: "" };
                const hasProblem = !!(t.problem && t.problem.trim());
                return (
                  <div key={item.id} style={{ padding: "6px 8px 10px", borderRadius: 8,
                    background: checked ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "4px 0", cursor: "pointer" }}>
                      <input type="checkbox" checked={checked}
                        onChange={(e) => toggle(item.id, e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer" }} />
                      <span style={{ fontSize: 14, textDecoration: checked ? "line-through" : "none",
                        color: checked ? "var(--dim)" : "var(--text)" }}>{item.text}</span>
                      {hasProblem && (
                        <span title="Problem gemeldet" style={{ marginLeft: "auto", fontSize: 11,
                          fontWeight: 700, color: "var(--coral)" }}>⚠ Problem</span>
                      )}
                    </label>
                    <div style={{ display: "grid", gap: 6, marginTop: 6, paddingLeft: 30 }}>
                      <textarea rows={1} placeholder="Problem / Fehlermeldung melden…"
                        value={t.problem}
                        onChange={(e) => onTextChange(item.id, "problem", e.target.value)}
                        onBlur={(e) => saveText(item.id, "problem", e.target.value, t.problem)}
                        style={{ width: "100%", resize: "vertical", fontSize: 13, padding: "6px 8px",
                          borderRadius: 6, fontFamily: "inherit",
                          border: `1px solid ${hasProblem ? "var(--coral)" : "var(--line)"}`,
                          background: hasProblem ? "color-mix(in srgb, var(--coral) 8%, transparent)" : "var(--bg)",
                          color: "var(--text)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pct === 100 && (
        <div className="panel" style={{ marginTop: 16, textAlign: "center",
          borderColor: "color-mix(in srgb, var(--fertig) 35%, transparent)",
          background: "color-mix(in srgb, var(--fertig) 8%, transparent)" }}>
          <div style={{ fontWeight: 700, color: "var(--fertig)" }}>
            ✓ Kasse vollständig migriert
          </div>
        </div>
      )}
    </div>
  );
}
