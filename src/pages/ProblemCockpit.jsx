import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProblems, setProblemErledigt } from "../lib/data.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { formatDateDE } from "../lib/dates.js";

// Statusfarben (Zweitkodierung durch Icon + Label, da Rot/Grün farblich allein
// nicht CVD-sicher ist).
const OFFEN = "var(--coral)";
const ERLEDIGT = "var(--fertig)";

function kasseLabel(p) {
  const zusatz = [p.standort, p.etage].filter(Boolean).join(" ");
  return `Kasse ${p.kassen_nr}${zusatz ? ` · ${zusatz}` : ""}`;
}

// ---- Status-Donut (Offen vs. Erledigt) --------------------------------------
function StatusDonut({ offen, erledigt }) {
  const total = offen + erledigt;
  const size = 190, r = 74, cx = size / 2, cy = size / 2, sw = 28;
  const C = 2 * Math.PI * r;
  const fracOff = total ? offen / total : 0;
  const offLen = fracOff * C;
  const erlLen = (total ? erledigt / total : 0) * C;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Offen ${offen}, Erledigt ${erledigt}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--panel2)" strokeWidth={sw} />
        {total > 0 && offen > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={OFFEN} strokeWidth={sw}
            strokeDasharray={`${offLen} ${C - offLen}`} transform={`rotate(-90 ${cx} ${cy})`}>
            <title>Offen: {offen}</title>
          </circle>
        )}
        {total > 0 && erledigt > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={ERLEDIGT} strokeWidth={sw}
            strokeDasharray={`${erlLen} ${C - erlLen}`} strokeDashoffset={-offLen}
            transform={`rotate(-90 ${cx} ${cy})`}>
            <title>Erledigt: {erledigt}</title>
          </circle>
        )}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 38, fontWeight: 800, fill: "var(--text)" }}>
          {total}
        </text>
        <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontSize: 13, fill: "var(--dim)" }}>
          {total === 1 ? "Problem" : "Probleme"}
        </text>
      </svg>
      <div style={{ display: "grid", gap: 14 }}>
        <LegendRow color={OFFEN} icon="⚠" label="Offen" value={offen} />
        <LegendRow color={ERLEDIGT} icon="✓" label="Erledigt" value={erledigt} />
      </div>
    </div>
  );
}

function LegendRow({ color, icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: color, flex: "0 0 auto" }} />
      <span style={{ color: "var(--dim)" }}>{icon} {label}</span>
      <strong style={{ color: "var(--text)", marginLeft: 4, fontSize: 17 }}>{value}</strong>
    </div>
  );
}

// ---- Balken: Filialen mit den meisten offenen Problemen ---------------------
function TopFilialen({ items }) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--dim)" }}>Keine offenen Probleme. 🎉</div>;
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((i) => (
        <div key={i.filiale} style={{ display: "grid", gridTemplateColumns: "minmax(100px, 34%) 1fr auto",
          alignItems: "center", gap: 12 }} title={`${i.name}: ${i.count} offen`}>
          <span style={{ fontSize: 14, color: "var(--text)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name}</span>
          <div style={{ height: 20, background: "var(--panel2)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${(i.count / max) * 100}%`, height: "100%", background: OFFEN,
              borderRadius: 99, minWidth: 8 }} />
          </div>
          <strong style={{ fontSize: 15, color: "var(--text)", minWidth: 20, textAlign: "right" }}>{i.count}</strong>
        </div>
      ))}
    </div>
  );
}

// ---- KPI-Kachel -------------------------------------------------------------
function Kpi({ label, value, color, icon }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: color || "var(--text)", lineHeight: 1 }}>{value}</span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
    </div>
  );
}

export default function ProblemCockpit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [probleme, setProbleme] = useState(null);
  const [err, setErr] = useState("");
  const [filiale, setFiliale] = useState("");   // Filialnummer oder ""
  const [status, setStatus] = useState("offen"); // "alle" | "offen" | "erledigt"
  const [suche, setSuche] = useState("");

  useEffect(() => {
    getAllProblems().then(setProbleme).catch((e) => setErr(e.message));
  }, []);

  // Kennzahlen & Diagramme über den GESAMTEN Datenbestand (stabile Übersicht).
  const stats = useMemo(() => {
    const list = probleme || [];
    const offen = list.filter((p) => !p.erledigt);
    const erledigt = list.filter((p) => p.erledigt);
    const proFiliale = {};
    offen.forEach((p) => {
      const k = p.filiale || "?";
      if (!proFiliale[k]) proFiliale[k] = { filiale: k, name: p.store_name || k, count: 0 };
      proFiliale[k].count += 1;
    });
    const top = Object.values(proFiliale).sort((a, b) => b.count - a.count).slice(0, 8);
    const betroffen = new Set(offen.map((p) => p.filiale)).size;
    const quote = list.length ? Math.round((erledigt.length / list.length) * 100) : 0;
    return { offen: offen.length, erledigt: erledigt.length, total: list.length, top, betroffen, quote };
  }, [probleme]);

  // Filialliste für das Filter-Dropdown (alphabetisch).
  const filialen = useMemo(() => {
    const m = {};
    (probleme || []).forEach((p) => { if (p.filiale) m[p.filiale] = p.store_name || p.filiale; });
    return Object.entries(m).map(([nr, name]) => ({ nr, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [probleme]);

  // Tabellenzeilen nach Filtern.
  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return (probleme || []).filter((p) => {
      if (filiale && p.filiale !== filiale) return false;
      if (status === "offen" && p.erledigt) return false;
      if (status === "erledigt" && !p.erledigt) return false;
      if (q) {
        const hay = `${p.store_name} ${p.filiale} ${p.stadt} ${p.kassen_nr} ${p.punkt} ${p.problem}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [probleme, filiale, status, suche]);

  async function toggleErledigt(p) {
    const naechster = !p.erledigt;
    setProbleme((prev) => prev.map((x) => (x.id === p.id
      ? { ...x, erledigt: naechster, erledigt_am: naechster ? new Date().toISOString() : null,
          erledigt_von: naechster ? (user?.email || null) : null } : x)));
    try {
      await setProblemErledigt(p.id, naechster, user?.email || null);
    } catch (e) {
      setErr(e.message);
      setProbleme((prev) => prev.map((x) => (x.id === p.id ? { ...x, erledigt: p.erledigt } : x))); // Rollback
    }
  }

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!probleme) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const leer = probleme.length === 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Problem-Cockpit</div>
        <div style={{ fontSize: 13, color: "var(--dim)" }}>
          Alle gemeldeten Probleme aus den Kassen-Checklisten – filialübergreifend.
        </div>
      </div>

      {leer ? (
        <div className="panel" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700 }}>Keine Probleme gemeldet</div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>
            Sobald in einer Kassen-Checkliste ein Problem gemeldet wird, erscheint es hier.
          </div>
        </div>
      ) : (
        <>
          {/* KPI-Kacheln */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 14, marginBottom: 18 }}>
            <Kpi label="Offene Probleme" value={stats.offen} color={OFFEN} icon="⚠" />
            <Kpi label="Erledigt" value={stats.erledigt} color={ERLEDIGT} icon="✓" />
            <Kpi label="Betroffene Filialen" value={stats.betroffen} />
            <Kpi label="Erledigungsquote" value={`${stats.quote} %`} />
          </div>

          {/* Diagramme */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 20, marginBottom: 24 }}>
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Status</div>
              <StatusDonut offen={stats.offen} erledigt={stats.erledigt} />
            </div>
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>
                Filialen mit den meisten offenen Problemen
              </div>
              <TopFilialen items={stats.top} />
            </div>
          </div>

          {/* Problemliste */}
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            Gemeldete Probleme
          </div>

          {/* Filter */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <select className="input" style={{ maxWidth: 240 }} value={filiale}
              onChange={(e) => setFiliale(e.target.value)}>
              <option value="">Alle Filialen</option>
              {filialen.map((f) => <option key={f.nr} value={f.nr}>{f.name}</option>)}
            </select>
            <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
              {[["offen", "Offen"], ["erledigt", "Erledigt"], ["alle", "Alle"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setStatus(val)}
                  style={{ border: "none", padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: status === val ? "var(--navy)" : "#fff",
                    color: status === val ? "#fff" : "var(--dim)" }}>{lbl}</button>
              ))}
            </div>
            <input className="input" style={{ maxWidth: 260 }} placeholder="Suche (Filiale, Kasse, Text…)"
              value={suche} onChange={(e) => setSuche(e.target.value)} />
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--dim)" }}>
              {gefiltert.length} von {probleme.length}
            </span>
          </div>

          {/* Tabelle */}
          <div className="panel" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th>Status</th><th>Filiale</th><th>Kasse</th><th>Checklisten-Punkt</th>
                    <th>Problem</th><th>Gemeldet</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {gefiltert.length === 0 ? (
                    <tr><td colSpan={7} style={{ color: "var(--dim)", textAlign: "center", padding: 24 }}>
                      Keine Probleme für diese Filter.
                    </td></tr>
                  ) : gefiltert.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
                          whiteSpace: "nowrap" }} title={p.erledigt
                            ? `Erledigt${p.erledigt_von ? ` von ${p.erledigt_von}` : ""}` : "Als erledigt markieren"}>
                          <input type="checkbox" checked={p.erledigt}
                            onChange={() => toggleErledigt(p)}
                            style={{ width: 17, height: 17, accentColor: "var(--fertig)", cursor: "pointer" }} />
                          <span style={{ fontSize: 12, fontWeight: 700,
                            color: p.erledigt ? "var(--fertig)" : "var(--coral)" }}>
                            {p.erledigt ? "✓ Erledigt" : "⚠ Offen"}
                          </span>
                        </label>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.store_name}</div>
                        <div style={{ fontSize: 11, color: "var(--dim)" }}>Filiale {p.filiale}</div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{kasseLabel(p)}</td>
                      <td style={{ color: "var(--dim)", maxWidth: 200 }}>{p.punkt}</td>
                      <td style={{ maxWidth: 320 }}>{p.problem}</td>
                      <td style={{ color: "var(--dim)", whiteSpace: "nowrap" }}>{formatDateDE(p.gemeldet_am)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn" style={{ padding: "6px 10px" }}
                          onClick={() => navigate(`/stores/${p.store_id}/kasse/${p.kasse_id}`)}
                          title="Zur Kassen-Checkliste springen">Öffnen →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
