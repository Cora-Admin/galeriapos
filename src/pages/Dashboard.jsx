import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMigrationStatus } from "../lib/data.js";
import { StatusBadge, STATUS_COLOR } from "../components/StatusBadge.jsx";
import { StoreTypBadge, ProblemCount } from "../components/Badges.jsx";

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

  // Storeübergreifender Fortschritt: gestapelter Balken nach Status (ohne "Geplant").
  const STATUS_ORDER = ["Fertig", "Läuft", "Offen"];
  const segments = STATUS_ORDER
    .map((s) => ({ s, n: byStatus[s] || 0 }))
    .filter((x) => x.n > 0);

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="label" style={{ marginBottom: 14 }}>
          Fortschritt storeübergreifend
        </div>
        <div style={{ display: "flex", height: 32, borderRadius: 99, overflow: "hidden",
          border: "1px solid var(--line)", background: "var(--panel2)" }}>
          {segments.map(({ s, n }) => (
            <div key={s} title={`${s}: ${n}`}
              style={{ width: `${(n / total) * 100}%`, background: STATUS_COLOR[s] }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
          {STATUS_ORDER.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 7,
              fontSize: 13, color: "var(--dim)" }}>
              <span style={{ width: 11, height: 11, borderRadius: 99,
                background: STATUS_COLOR[s], display: "inline-block" }} />
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)",
          fontWeight: 700, fontSize: 14 }}>
          Migrationsstatus pro Store · {total} Filialen · {kassen} Kassen
        </div>
        <div className="table-wrap" style={{ maxHeight: 520, overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Fil.-Nr.</th><th>Filiale</th><th>Typ</th><th>Migration</th>
                <th>Kassen fertig</th><th>Probleme</th><th>Fortschritt</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/stores/${r.id}`)}>
                  <td style={{ color: "var(--dim)" }}>{r.filiale}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td><StoreTypBadge typ={r.store_typ} /></td>
                  <td style={{ color: "var(--dim)" }}>{r.migrationsdatum || "—"}</td>
                  <td style={{ color: "var(--dim)" }}>{r.kassen_fertig}/{r.anzahl_kassen}</td>
                  <td><ProblemCount n={Number(r.probleme) || 0} /></td>
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
