import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMigrationStatus } from "../lib/data.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { StoreTypBadge, ProblemCount } from "../components/Badges.jsx";
import { formatDateDE } from "../lib/dates.js";

export default function Stores() {
  const [rows, setRows] = useState(null);
  const [suche, setSuche] = useState("");
  const [err, setErr] = useState("");
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

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 320 }}
          placeholder="Filiale, Stadt oder Nummer suchen…"
          value={suche} onChange={(e) => setSuche(e.target.value)} />
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
            {gefiltert.map((r) => (
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
    </div>
  );
}
