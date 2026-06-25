import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getStore, updateStore, getKassen, getResults, getTemplate, getUsers,
} from "../lib/data.js";
import { STORE_TYPEN } from "../components/Badges.jsx";
import MultiSelect from "../components/MultiSelect.jsx";

export default function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [kassen, setKassen] = useState([]);
  const [users, setUsers] = useState([]);
  const [fortschritt, setFortschritt] = useState({}); // kasseId -> {done,total}
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [zusatz, setZusatz] = useState(""); // lokaler Puffer für Zusatzinfos

  useEffect(() => { load(); }, [id]);

  // Zusatzinfos-Puffer einmalig beim Laden der Filiale setzen (nicht bei jedem Patch).
  useEffect(() => { if (store) setZusatz(store.zusatzinfos || ""); }, [store?.id]);

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
        fp[k.id] = { done: res.filter((r) => r.erledigt).length, total };
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
          onClick={() => navigate(`/stores/${id}/abfrage`)}>Storeabfrage</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div className="panel">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Stammdaten</div>
          <div style={{ display: "grid", gap: 12 }}>
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
              <div className="label" style={{ marginBottom: 8 }}>Ansprechpartner</div>
              <div style={{ display: "grid", gap: 10 }}>
                <Field label="Name" field="ansprechpartner" />
                <Field label="E-Mail" field="ansprechpartner_email" type="email" />
                <Field label="Telefon" field="ansprechpartner_telefon" type="tel" />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>POS Hardware & Migration</div>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="POS-HW Bondrucker" field="pos_bondrucker" />
            <Field label="Pole / Kundendisplay" field="pole" />
            <Field label="Migrationsdatum" field="migrationsdatum" type="date" />
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
            const fp = fortschritt[k.id] || { done: 0, total: 0 };
            const pct = fp.total ? Math.round((fp.done / fp.total) * 100) : 0;
            return (
              <div key={k.id} style={{ background: "var(--bg)", border: "1px solid var(--line)",
                borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Kasse {k.kassen_nr}</div>
                  <span style={{ fontSize: 12, color: pct === 100 ? "var(--fertig)" : "var(--dim)" }}>
                    {fp.done}/{fp.total}
                  </span>
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
