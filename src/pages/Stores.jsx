import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMigrationStatus } from "../lib/data.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { StoreTypBadge, ProblemCount } from "../components/Badges.jsx";
import { formatDateDE } from "../lib/dates.js";
import StoresMap from "../components/StoresMap.jsx";

export default function Stores() {
  const [rows, setRows] = useState(null);
  const [suche, setSuche] = useState("");
  const [err, setErr] = useState("");
  const [karteOffen, setKarteOffen] = useState(false); // Kartenübersicht-Modal
  const navigate = useNavigate();

  useEffect(() => {
    getMigrationStatus().then(setRows).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!rows) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const q = suche.toLowerCase();
  const gefiltert = rows.filter(
    (r) => r.name.toLowerCase().includes(q) ||
           (r.stadt || "").toLowerCase().includes(q) ||
           (r.filiale || "").includes(suche)
  );

  // Standardsortierung: nach Migrationsdatum aufsteigend (frühestes zuerst),
  // Filialen ohne Datum ans Ende, dort nach Name.
  const sortiert = [...gefiltert].sort((a, b) => {
    const da = a.migrationsdatum || "";
    const db = b.migrationsdatum || "";
    if (da && db) return da.localeCompare(db) || a.name.localeCompare(b.name);
    if (da) return -1;
    if (db) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 320 }}
          placeholder="Filiale, Stadt oder Nummer suchen…"
          value={suche} onChange={(e) => setSuche(e.target.value)} />
        <button className="btn" title="Kartenübersicht" aria-label="Kartenübersicht"
          onClick={() => setKarteOffen(true)}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
            <path d="M9 3v15M15 6v15" />
          </svg>
          <span className="hide-sm">Karte</span>
        </button>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fil.-Nr.</th><th>Filiale</th><th>Stadt</th><th>Kassen</th>
              <th>Typ</th><th>Migration</th><th>Probleme</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortiert.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }}
                onClick={() => navigate(`/stores/${r.id}`)}>
                <td style={{ color: "var(--dim)" }}>{r.filiale}</td>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td style={{ color: "var(--dim)" }}>{r.stadt}</td>
                <td>{r.anzahl_kassen}</td>
                <td><StoreTypBadge typ={r.store_typ} /></td>
                <td style={{ color: "var(--dim)" }}>{formatDateDE(r.migrationsdatum)}</td>
                <td><ProblemCount n={Number(r.probleme) || 0} /></td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {karteOffen && <StoresMap rows={rows} onClose={() => setKarteOffen(false)} />}
    </div>
  );
}
