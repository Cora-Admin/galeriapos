import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAP_W, MAP_H, DE_OUTLINE_PATH, FILIAL_COORDS, projectDE } from "../lib/deMap.js";
import { STATUS_COLOR } from "./StatusBadge.jsx";
import { formatDateDE } from "../lib/dates.js";

const STATUS_REIHENFOLGE = ["Offen", "Geplant", "Läuft", "Fertig"];

// Kartenübersicht Deutschland: alle Filialen als Punkte, eingefärbt nach
// Migrationsstatus. Wird als Modal über der Filialübersicht angezeigt.
export default function StoresMap({ rows, onClose }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null); // gehoverte Filiale (Marker)

  // Filialen mit bekannten Koordinaten in projizierte Punkte umrechnen.
  const punkte = rows
    .map((r) => {
      const c = FILIAL_COORDS[r.filiale];
      if (!c) return null;
      const p = projectDE(c[0], c[1]);
      return { ...r, x: p.x, y: p.y };
    })
    .filter(Boolean);

  const ohneKoord = rows.length - punkte.length;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(16, 36, 58, .45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto" }}>
      <div className="panel fade-in" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 720, margin: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Kartenübersicht</div>
            <div style={{ fontSize: 12, color: "var(--dim)" }}>
              {punkte.length} Filialen in Deutschland
              {ohneKoord > 0 && ` · ${ohneKoord} ohne Koordinaten`}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>✕ Schließen</button>
        </div>

        {/* Legende */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          {STATUS_REIHENFOLGE.map((s) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "var(--dim)" }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%",
                background: STATUS_COLOR[s], border: "1px solid rgba(0,0,0,.15)" }} />
              {s}
            </span>
          ))}
        </div>

        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ width: "100%", maxWidth: MAP_W, height: "auto", display: "block", margin: "0 auto" }}
            role="img" aria-label="Deutschlandkarte mit allen Filialen">
            <path d={DE_OUTLINE_PATH} fill="var(--panel2)"
              stroke="color-mix(in srgb, var(--navy) 35%, transparent)" strokeWidth="1" strokeLinejoin="round" />
            {punkte.map((p) => {
              const c = STATUS_COLOR[p.status] || "var(--offen)";
              const aktiv = hover?.id === p.id;
              return (
                <circle key={p.id} cx={p.x} cy={p.y} r={aktiv ? 7 : 5}
                  fill={c} stroke="#fff" strokeWidth={aktiv ? 2 : 1.5}
                  style={{ cursor: "pointer", transition: "r .1s" }}
                  onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}
                  onClick={() => navigate(`/stores/${p.id}`)}>
                  <title>{p.name} · {p.status}</title>
                </circle>
              );
            })}
          </svg>

          {hover && (
            <div style={{ position: "absolute", left: `${(hover.x / MAP_W) * 100}%`, top: `${(hover.y / MAP_H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 12px))", pointerEvents: "none",
              background: "var(--navy)", color: "#fff", padding: "7px 10px", borderRadius: 8,
              fontSize: 12, whiteSpace: "nowrap", boxShadow: "var(--shadow)", zIndex: 2 }}>
              <div style={{ fontWeight: 700 }}>{hover.name}</div>
              <div style={{ opacity: .85 }}>
                Filiale {hover.filiale} · {hover.status}
                {hover.migrationsdatum ? ` · ${formatDateDE(hover.migrationsdatum)}` : ""}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 12, textAlign: "center" }}>
          Punkt anklicken, um zur Filiale zu springen. Umriss © GeoBasis-DE / BKG (dl-de/by-2-0).
        </div>
      </div>
    </div>
  );
}
