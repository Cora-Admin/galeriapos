import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getStore, updateStore, getKassen, getResults, getTemplate, getUsers,
} from "../lib/data.js";
import { STORE_TYPEN } from "../components/Badges.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import DateInputDE from "../components/DateInputDE.jsx";

// Rollen der 3 Ansprechpartner je Filiale (Reihenfolge = Position in der Liste).
const KONTAKT_ROLLEN = ["Filialansprechpartner", "Vertreter", "Fieldservice"];

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [kassen, setKassen] = useState([]);
  const [users, setUsers] = useState([]);
  const [fortschritt, setFortschritt] = useState({}); // kasseId -> {done,total,probleme}
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [zusatz, setZusatz] = useState(""); // lokaler Puffer für Zusatzinfos
  const [kontakte, setKontakte] = useState([]); // lokaler Puffer für Ansprechpartner

  useEffect(() => { load(); }, [id]);

  // Lokale Puffer einmalig beim Laden der Filiale setzen (nicht bei jedem Patch).
  useEffect(() => {
    if (!store) return;
    setZusatz(store.zusatzinfos || "");
    const l = Array.isArray(store.ansprechpartner_liste) ? store.ansprechpartner_liste : [];
    setKontakte(KONTAKT_ROLLEN.map((rolle, i) => ({
      rolle,
      name: l[i]?.name || "",
      email: l[i]?.email || "",
      telefon: l[i]?.telefon || "",
    })));
  }, [store?.id]);

  async function load() {
    try {
      const s = await getStore(id);
      setStore(s);
      setUsers(await getUsers());
      const ks = await getKassen(id);
      setKassen(ks);
      const tpl = await getTemplate();
      const total = tpl.reduce((a, g) => a + g.items.length, 0);
      const fp = {};
      for (const k of ks) {
        const res = await getResults(k.id);
        fp[k.id] = {
          done: res.filter((r) => r.erledigt).length,
          total,
          probleme: res.filter((r) => r.problem && r.problem.trim()).length,
        };
      }
      setFortschritt(fp);
    } catch (e) { setErr(e.message); }
  }

  async function patch(field, value) {
    const next = { ...store, [field]: value };
    setStore(next);
    try {
      await updateStore(id, { [field]: value });
      setSaved(true); setTimeout(() => setSaved(false), 1200);
    } catch (e) { setErr(e.message); }
  }

  function toggleAtos(userId) {
    const cur = store.atos_ingenieure || [];
    const next = cur.includes(userId)
      ? cur.filter((x) => x !== userId)
      : [...cur, userId];
    patch("atos_ingenieure", next);
  }

  function updateKontakt(i, feld, val) {
    setKontakte((prev) => prev.map((k, idx) => (idx === i ? { ...k, [feld]: val } : k)));
  }
  function saveKontakte() {
    if (JSON.stringify(kontakte) !== JSON.stringify(store.ansprechpartner_liste || []))
      patch("ansprechpartner_liste", kontakte);
  }

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!store) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const Field = ({ label, field, type = "text", textarea }) => (
    <label style={{ display: "block" }}>
      <div className="label">{label}</div>
      {textarea ? (
        <textarea className="input" style={{ minHeight: 70, resize: "vertical" }}
          value={store[field] || ""} onChange={(e) => patch(field, e.target.value)} />
      ) : (
        <input className="input" type={type} value={store[field] || ""}
          onChange={(e) => patch(field, e.target.value)} />
      )}
    </label>
  );

  const aktiveUsers = users.filter((u) => u.aktiv);
  const atos = store.atos_ingenieure || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => navigate("/stores")}>← Zurück</button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{store.name}</div>
        <span style={{ color: "var(--dim)", fontSize: 13 }}>Filiale {store.filiale}</span>
        {saved && <span style={{ color: "var(--accent)", fontSize: 12 }}>✓ gespeichert</span>}
        <button className="btn" style={{ marginLeft: "auto" }}
          onClick={() => navigate(`/stores/${id}/abfrage`)}>Filialabfrage</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div className="panel">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Stammdaten</div>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "block" }}>
              <div className="label">Filialnummer</div>
              <input className="input" value={store.filiale || ""} readOnly disabled />
            </label>
            <Field label="Filialname" field="name" />
            <Field label="Stadt" field="stadt" />
            <Field label="Adresse" field="adresse" />
            <Field label="Öffnungszeiten" field="oeffnungszeiten" />
            <label style={{ display: "block" }}>
              <div className="label">Galeria Store Typ</div>
              <select className="input" value={store.store_typ}
                onChange={(e) => patch("store_typ", e.target.value)}>
                {STORE_TYPEN.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <div className="label" style={{ marginBottom: 10 }}>Ansprechpartner</div>
              <div style={{ display: "grid", gap: 16 }}>
                {kontakte.map((k, i) => (
                  <div key={i} style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{k.rolle}</div>
                    <input className="input" placeholder="Name" value={k.name}
                      onChange={(e) => updateKontakt(i, "name", e.target.value)} onBlur={saveKontakte} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input className="input" type="email" placeholder="E-Mail" style={{ flex: "1 1 150px" }}
                        value={k.email} onChange={(e) => updateKontakt(i, "email", e.target.value)} onBlur={saveKontakte} />
                      <input className="input" type="tel" placeholder="Telefon" style={{ flex: "1 1 120px" }}
                        value={k.telefon} onChange={(e) => updateKontakt(i, "telefon", e.target.value)} onBlur={saveKontakte} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>POS Hardware & Migration</div>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="POS-HW Bondrucker" field="pos_bondrucker" />
            <Field label="Pole / Kundendisplay" field="pole" />
            <label style={{ display: "block" }}>
              <div className="label">Migrationsdatum</div>
              <DateInputDE value={store.migrationsdatum}
                onCommit={(iso) => patch("migrationsdatum", iso)} />
            </label>
            <div>
              <div className="label">ATOS Rollout Ingenieur(e)</div>
              {aktiveUsers.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--dim)" }}>
                  Noch keine User angelegt. Unter „Users" hinzufügen.
                </div>
              ) : (
                <MultiSelect users={aktiveUsers} selected={atos} onToggle={toggleAtos}
                  placeholder="Ingenieur(e) wählen…" />
              )}
            </div>
            <div>
              <div className="label">Zusatzinfos</div>
              <textarea className="input" style={{ minHeight: 70, resize: "vertical" }}
                value={zusatz} onChange={(e) => setZusatz(e.target.value)} />
              <div style={{ display: "flex", alignItems: "center", gap: 10,
                justifyContent: "flex-end", marginTop: 8 }}>
                {zusatz !== (store.zusatzinfos || "") && (
                  <span style={{ fontSize: 12, color: "var(--dim)", marginRight: "auto" }}>
                    Nicht gespeicherte Änderungen
                  </span>
                )}
                <button className="btn btn-primary"
                  disabled={zusatz === (store.zusatzinfos || "")}
                  onClick={() => patch("zusatzinfos", zusatz)}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
          Kassen & Installations-Checklisten
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {kassen.map((k) => {
            const fp = fortschritt[k.id] || { done: 0, total: 0, probleme: 0 };
            const pct = fp.total ? Math.round((fp.done / fp.total) * 100) : 0;
            const hatProblem = fp.probleme > 0;
            return (
              <div key={k.id} style={{ background: "var(--bg)", borderRadius: 10, padding: 14,
                border: `1px solid ${hatProblem ? "color-mix(in srgb, var(--coral) 45%, var(--line))" : "var(--line)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 10, gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Kasse {k.kassen_nr}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {hatProblem && (
                      <span title={`${fp.probleme} gemeldete(s) Problem(e)`}
                        style={{ color: "var(--coral)", fontSize: 12, fontWeight: 700 }}>⚠ {fp.probleme}</span>
                    )}
                    <span style={{ fontSize: 12, color: pct === 100 ? "var(--fertig)" : "var(--dim)" }}>
                      {fp.done}/{fp.total}
                    </span>
                  </div>
                </div>
                <div className="bar" style={{ marginBottom: 12 }}>
                  <span style={{ width: `${pct}%`,
                    background: pct === 100 ? "var(--fertig)" : "var(--accent)" }} />
                </div>
                <button className="btn btn-primary" style={{ width: "100%" }}
                  onClick={() => navigate(`/stores/${id}/kasse/${k.id}`)}>
                  Checkliste {pct === 0 ? "starten" : pct === 100 ? "ansehen" : "fortsetzen"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
