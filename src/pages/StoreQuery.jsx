import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStore, getQueryTemplate, getQueryAnswers, setQueryAnswer } from "../lib/data.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function StoreQuery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [template, setTemplate] = useState([]);
  const [answers, setAnswers] = useState({}); // item_id -> antwort (live edit)
  const saved = useRef({}); // item_id -> zuletzt gespeicherte Antwort
  const [err, setErr] = useState("");

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      setStore(await getStore(id));
      setTemplate(await getQueryTemplate());
      const res = await getQueryAnswers(id);
      const map = {};
      res.forEach((r) => { map[r.item_id] = r.antwort || ""; });
      setAnswers(map);
      saved.current = { ...map };
    } catch (e) { setErr(e.message); }
  }

  function onChange(itemId, val) {
    setAnswers((prev) => ({ ...prev, [itemId]: val }));
  }

  async function save(itemId, val) {
    if ((val || "") === (saved.current[itemId] || "")) return;
    try {
      await setQueryAnswer(id, itemId, val, user?.email || null);
      saved.current[itemId] = val;
    } catch (e) { setErr(e.message); }
  }

  if (err) return <div className="panel" style={{ color: "var(--coral)" }}>Fehler: {err}</div>;
  if (!store) return <div style={{ color: "var(--dim)" }}>Lädt…</div>;

  const total = template.reduce((a, g) => a + g.items.length, 0);
  const beantwortet = Object.values(answers).filter((v) => v && v.trim()).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => navigate(`/stores/${id}`)}>← Zurück</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{store.name}</div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>
            Filialabfrage · Filiale {store.filiale}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>
            {beantwortet}/{total}
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)" }}>beantwortet</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="panel" style={{ color: "var(--dim)" }}>
          Noch keine Fragen hinterlegt. Unter „Templates → Filialabfrage" eine Vorlage anlegen.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {template.map((g) => (
            <div key={g.id} className="panel">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "var(--accent)" }}>
                {g.titel}
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {g.items.map((item) => (
                  <label key={item.id} style={{ display: "block" }}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{item.frage}</div>
                    <textarea className="input" rows={2} style={{ resize: "vertical" }}
                      placeholder="Antwort…"
                      value={answers[item.id] || ""}
                      onChange={(e) => onChange(item.id, e.target.value)}
                      onBlur={(e) => save(item.id, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
