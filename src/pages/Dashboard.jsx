import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMigrationStatus } from "../lib/data.js";
import { StatusBadge, STATUS_COLOR } from "../components/StatusBadge.jsx";

export default function Dashboard() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getMigrationStatus().then(setRows).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!rows) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const total = rows.length;
  const kassen = rows.reduce((a, r) => a + (r.anzahl_kassen || 0), 0);
  const byStatus = rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const avg = total ? Math.round(rows.reduce((a, r) => a + Number(r.fortschritt_pct), 0) / total) : 0;

  const Kpi = ({ label, value, color }) => (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))",
        gap: 12, marginBottom: 20 }}>
        <Kpi label="Gesamtfortschritt" value={`${avg}%`} color="var(--accent)" />
        <Kpi label="Fertig" value={byStatus["Fertig"] || 0} color={STATUS_COLOR["Fertig"]} />
        <Kpi label="In Arbeit" value={byStatus["Läuft"] || 0} color={STATUS_COLOR["Läuft"]} />
        <Kpi label="Geplant" value={byStatus["Geplant"] || 0} color={STATUS_COLOR["Geplant"]} />
        <Kpi label="Offen" value={byStatus["Offen"] || 0} color={STATUS_COLOR["Offen"]} />
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)",
          fontWeight: 700, fontSize: 14 }}>
          Migrationsstatus pro Store · {total} Filialen · {kassen} Kassen
        </div>
        <div style={{ maxHeight: 520, overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Fil.-Nr.</th><th>Store</th><th>Typ</th><th>Migration</th>
                <th>Kassen fertig</th><th>Fortschritt</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/stores/${r.id}`)}>
                  <td style={{ color: "var(--dim)" }}>{r.filiale}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.store_typ}</td>
                  <td style={{ color: "var(--dim)" }}>{r.migrationsdatum || "—"}</td>
                  <td style={{ color: "var(--dim)" }}>{r.kassen_fertig}/{r.anzahl_kassen}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bar" style={{ flex: 1, minWidth: 80 }}>
                        <span style={{ width: `${r.fortschritt_pct}%`,
                          background: STATUS_COLOR[r.status] }} />
                      </div>
                      <span style={{ fontSize: 12, color: "var(--dim)", width: 34 }}>
                        {r.fortschritt_pct}%
                      </span>
                    </div>
                  </td>
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
