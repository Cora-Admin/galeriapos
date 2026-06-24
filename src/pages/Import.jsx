import { useMemo, useState } from "react";
import { getStores, getKassen, addKasse } from "../lib/data.js";

// Versucht, eine passende Spalte anhand mehrerer möglicher Bezeichnungen zu finden.
function guess(cols, candidates) {
  const lower = cols.map((c) => String(c).toLowerCase());
  for (const cand of candidates) {
    const i = lower.findIndex((c) => c.includes(cand));
    if (i >= 0) return cols[i];
  }
  return "";
}

export default function Import() {
  const [rows, setRows] = useState(null); // Array<object>
  const [cols, setCols] = useState([]);
  const [map, setMap] = useState({ filiale: "", nr: "", bezeichnung: "" });
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { angelegt, fehler: [] }

  function onFile(e) {
    setErr(""); setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (json.length === 0) { setErr("Die erste Tabelle enthält keine Datenzeilen."); return; }
        const c = Object.keys(json[0]);
        setRows(json);
        setCols(c);
        setMap({
          filiale: guess(c, ["filiale", "fil", "filial"]),
          nr: guess(c, ["kassennr", "kassen-nr", "kassen nr", "kasse", "nr"]),
          bezeichnung: guess(c, ["bezeichnung", "name", "beschreibung"]),
        });
      } catch (e2) { setErr("Datei konnte nicht gelesen werden: " + e2.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  const preview = useMemo(() => (rows ? rows.slice(0, 8) : []), [rows]);

  async function importieren() {
    if (!map.filiale) { setErr("Bitte die Filiale-Spalte zuordnen."); return; }
    setErr(""); setBusy(true); setResult(null);
    try {
      const stores = await getStores();
      const byFiliale = {};
      stores.forEach((s) => { byFiliale[String(s.filiale).trim()] = s; });

      // Bestehende Kassen je Store cachen, um Nummern fortlaufend zu vergeben.
      const kassenCache = {};
      async function nextNr(storeId) {
        if (!kassenCache[storeId]) {
          const ks = await getKassen(storeId);
          kassenCache[storeId] = ks.reduce((a, k) => Math.max(a, k.kassen_nr || 0), 0);
        }
        kassenCache[storeId] += 1;
        return kassenCache[storeId];
      }

      let angelegt = 0;
      const fehler = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const fil = String(row[map.filiale] ?? "").trim();
        const store = byFiliale[fil];
        if (!store) { fehler.push(`Zeile ${i + 2}: Filiale „${fil}" nicht gefunden`); continue; }
        let nr = map.nr ? parseInt(String(row[map.nr]).trim(), 10) : NaN;
        if (!Number.isInteger(nr) || nr < 1) nr = await nextNr(store.id);
        const bez = map.bezeichnung ? String(row[map.bezeichnung] ?? "").trim() || null : null;
        try {
          await addKasse(store.id, nr, bez);
          angelegt++;
        } catch (e3) {
          fehler.push(`Zeile ${i + 2} (Filiale ${fil}, Kasse ${nr}): ${e3.message}`);
        }
      }
      setResult({ angelegt, fehler });
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const ColSelect = ({ label, field, optional }) => (
    <label style={{ flex: "1 1 180px" }}>
      <div className="label">{label}{optional ? " (optional)" : ""}</div>
      <select className="input" value={map[field]}
        onChange={(e) => setMap({ ...map, [field]: e.target.value })}>
        <option value="">— nicht zuordnen —</option>
        {cols.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Excel-Import · Kassenliste</div>
        <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 640 }}>
          Excel-/CSV-Datei mit Kassen je Filiale hochladen. Spalten unten zuordnen,
          Vorschau prüfen und importieren. Filialen werden über die Filial-Nummer zugeordnet;
          fehlende Kassennummern werden je Filiale automatisch fortlaufend vergeben.
        </div>
      </div>

      {err && <div style={{ color: "var(--coral)", fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div className="panel" style={{ marginBottom: 16 }}>
        <input type="file" accept=".xlsx,.xls,.csv"
          onChange={onFile} style={{ fontSize: 13 }} />
        {fileName && <span style={{ marginLeft: 10, fontSize: 12, color: "var(--dim)" }}>
          {fileName} · {rows ? rows.length : 0} Zeilen
        </span>}
      </div>

      {rows && (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Spalten zuordnen</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ColSelect label="Filiale-Nr." field="filiale" />
              <ColSelect label="Kassen-Nr." field="nr" optional />
              <ColSelect label="Bezeichnung" field="bezeichnung" optional />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 14 }}
              disabled={busy} onClick={importieren}>
              {busy ? "Importiere…" : `${rows.length} Zeilen importieren`}
            </button>
          </div>

          <div className="panel" style={{ padding: 0, marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)",
              fontWeight: 700, fontSize: 13 }}>Vorschau (erste {preview.length})</div>
            <div className="table-wrap">
              <table>
                <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="panel" style={{
          borderColor: result.fehler.length ? "color-mix(in srgb, var(--laeuft) 40%, transparent)"
            : "color-mix(in srgb, var(--fertig) 40%, transparent)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            ✓ {result.angelegt} Kasse(n) angelegt{result.fehler.length ? `, ${result.fehler.length} Fehler` : ""}
          </div>
          {result.fehler.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--coral)" }}>
              {result.fehler.slice(0, 50).map((f, i) => <li key={i}>{f}</li>)}
              {result.fehler.length > 50 && <li>… und {result.fehler.length - 50} weitere</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
