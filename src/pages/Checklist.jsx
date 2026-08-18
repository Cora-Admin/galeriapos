import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getStore, getKasse, updateKasse, getTemplate, getResults, setResult, setResultText,
  sendProblemMail,
} from "../lib/data.js";
import { useAuth } from "../lib/AuthContext.jsx";

// Editierbare Hardware- und Gerätefelder im Kopf der Checkliste (pro Kasse).
const HW_FELDER = [
  { key: "bon_drucker", label: "Bon-Drucker" },
  { key: "scanner", label: "Scanner" },
  { key: "kassenlade", label: "Kassenlade" },
  { key: "lan", label: "LAN" },
  { key: "neuer_hardwaretyp", label: "Neuer Hardwaretyp" },
  { key: "mac_adresse", label: "MAC-Adresse" },
  { key: "ip_adresse", label: "IP-Adresse" },
  { key: "seriennummer", label: "Seriennummer" },
  { key: "bst_nummer", label: "BST-Nummer" },
];

export default function Checklist() {
  const { id, kasseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [kasse, setKasse] = useState(null);
  const [template, setTemplate] = useState([]);
  const [results, setResults] = useState({}); // item_id -> erledigt
  const [texts, setTexts] = useState({}); // item_id -> { kommentar, problem } (live edit)
  const saved = useRef({}); // item_id -> { kommentar, problem } zuletzt gespeichert
  const kassePersisted = useRef({}); // zuletzt gespeicherte Hardware-Felder der Kasse
  const [kasseSaved, setKasseSaved] = useState(false);
  const [mailHinweis, setMailHinweis] = useState(null); // { text, fehler }
  const [err, setErr] = useState("");

  useEffect(() => { load(); }, [kasseId]);

  async function load() {
    try {
      setStore(await getStore(id));
      const k = await getKasse(kasseId);
      setKasse(k);
      kassePersisted.current = [...HW_FELDER.map((f) => f.key), "bemerkungen"]
        .reduce((a, key) => ({ ...a, [key]: k[key] || "" }), {});
      setTemplate(await getTemplate());
      const res = await getResults(kasseId);
      const map = {};
      const txt = {};
      res.forEach((r) => {
        map[r.item_id] = r.erledigt;
        txt[r.item_id] = { kommentar: r.kommentar || "", problem: r.problem || "" };
      });
      setResults(map);
      setTexts(txt);
      saved.current = JSON.parse(JSON.stringify(txt));
    } catch (e) { setErr(e.message); }
  }

  // Lokale (sofortige) Bearbeitung eines Kassen-Feldes.
  function onKasseChange(field, val) {
    setKasse((prev) => ({ ...prev, [field]: val }));
  }

  // Beim Verlassen des Feldes speichern, sofern sich der Wert geändert hat.
  async function saveKasse(field, rawVal) {
    const val = (rawVal || "").trim();
    if ((kassePersisted.current[field] || "") === val) return;
    kassePersisted.current[field] = val;
    setKasse((prev) => ({ ...prev, [field]: val }));
    try {
      await updateKasse(kasseId, { [field]: val || null });
      setKasseSaved(true); setTimeout(() => setKasseSaved(false), 1200);
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
  async function saveText(itemId, field, val) {
    const prev = saved.current[itemId] || {};
    if ((val || "") === (prev[field] || "")) return;
    const patch = { [field]: val || null };
    // Ein Problem gilt als neu, wenn das Feld vorher leer war und jetzt Text
    // enthält – nur dafür geht eine Benachrichtigung raus.
    const hatProblem = !!(val && val.trim());
    const neuesProblem = field === "problem" && hatProblem && !(prev.problem || "").trim();
    // Beim Melden eines Problems zusätzlich festhalten, wer es gemeldet hat.
    if (field === "problem") {
      patch.problem_gemeldet_von = hatProblem ? (user?.email || null) : null;
      patch.problem_gemeldet_am = hatProblem ? new Date().toISOString() : null;
      // Wird das Problem gelöscht, darf eine spätere Neumeldung wieder eine
      // Mail auslösen – sonst blockt der Versandvermerk sie dauerhaft.
      if (!hatProblem) patch.problem_mail_gesendet_am = null;
    }
    try {
      const row = await setResultText(kasseId, itemId, patch);
      saved.current[itemId] = { ...prev, [field]: val };
      if (neuesProblem && row?.id) benachrichtige(row.id);
    } catch (e) {
      setErr(e.message);
    }
  }

  // Verschickt die Problem-Mail. Bewusst ohne await im Speicherpfad: ob die Mail
  // rausgeht, darf das Erfassen des Problems weder blockieren noch scheitern
  // lassen. Ist der Versand in den Einstellungen aus, bleibt es still.
  async function benachrichtige(resultId) {
    try {
      const res = await sendProblemMail(resultId);
      if (res?.sent) {
        setMailHinweis({ text: `Problem per E-Mail an ${res.to.join(", ")} gemeldet.` });
      } else if (res?.reason && res.reason !== "Mailversand ist deaktiviert") {
        setMailHinweis({ text: `Keine E-Mail verschickt: ${res.reason}.`, fehler: true });
      }
    } catch (e) {
      setMailHinweis({ text: `E-Mail konnte nicht verschickt werden: ${e.message}`, fehler: true });
    }
    setTimeout(() => setMailHinweis(null), 6000);
  }

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!store || !kasse) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const total = template.reduce((a, g) => a + g.items.length, 0);
  const done = Object.values(results).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const kasseTitel = `Kasse ${kasse.kassen_nr}`
    + [kasse.standort, kasse.etage].filter(Boolean).map((x) => ` · ${x}`).join("");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => navigate(`/stores/${id}`)}>← Zurück</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store.name} · {kasseTitel}</div>
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

      {mailHinweis && (
        <div className="panel" style={{ marginBottom: 16, padding: "10px 14px", fontSize: 13,
          color: mailHinweis.fehler ? "var(--coral)" : "var(--dim)" }}>
          {mailHinweis.text}
        </div>
      )}

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Kassendaten & Hardware</div>
          {kasseSaved && <span style={{ color: "var(--accent)", fontSize: 12 }}>✓ gespeichert</span>}
        </div>
        <div style={{ display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <label style={{ display: "block" }}>
            <div className="label">Standort</div>
            <input className="input" value={kasse.standort || ""}
              onChange={(e) => onKasseChange("standort", e.target.value)}
              onBlur={(e) => saveKasse("standort", e.target.value)} />
          </label>
          <label style={{ display: "block" }}>
            <div className="label">Etage</div>
            <input className="input" value={kasse.etage || ""}
              onChange={(e) => onKasseChange("etage", e.target.value)}
              onBlur={(e) => saveKasse("etage", e.target.value)} />
          </label>
          {HW_FELDER.map((f) => (
            <label key={f.key} style={{ display: "block" }}>
              <div className="label">{f.label}</div>
              <input className="input" value={kasse[f.key] || ""}
                onChange={(e) => onKasseChange(f.key, e.target.value)}
                onBlur={(e) => saveKasse(f.key, e.target.value)} />
            </label>
          ))}
          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <div className="label">Bemerkungen</div>
            <textarea className="input" style={{ minHeight: 60, resize: "vertical" }}
              value={kasse.bemerkungen || ""}
              onChange={(e) => onKasseChange("bemerkungen", e.target.value)}
              onBlur={(e) => saveKasse("bemerkungen", e.target.value)} />
          </label>
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
                const t = texts[item.id] || { kommentar: "", problem: "" };
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
                      <textarea rows={1} placeholder="Kommentar"
                        value={t.kommentar}
                        onChange={(e) => onTextChange(item.id, "kommentar", e.target.value)}
                        onBlur={(e) => saveText(item.id, "kommentar", e.target.value)}
                        style={{ width: "100%", resize: "vertical", fontSize: 13, padding: "6px 8px",
                          borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)",
                          color: "var(--text)", fontFamily: "inherit" }} />
                      <textarea rows={1} placeholder="Problem melden"
                        value={t.problem}
                        onChange={(e) => onTextChange(item.id, "problem", e.target.value)}
                        onBlur={(e) => saveText(item.id, "problem", e.target.value)}
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
