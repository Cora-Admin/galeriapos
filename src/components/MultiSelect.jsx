import { useEffect, useRef, useState } from "react";

// Mehrfachauswahl-Dropdown (z. B. ATOS-Rollout-Ingenieure).
// users: [{id, name, email}], selected: id[], onToggle: (id) => void
export default function MultiSelect({ users, selected, onToggle, placeholder = "Auswählen…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selUsers = users.filter((u) => selected.includes(u.id));
  const label = selUsers.length ? selUsers.map((u) => u.name || u.email).join(", ") : placeholder;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="input" onClick={() => setOpen((o) => !o)}
        style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", background: "#fff" }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: selUsers.length ? "var(--text)" : "#9aa6b6" }}>{label}</span>
        {selUsers.length > 0 && (
          <span className="badge" style={{ padding: "1px 8px",
            background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>
            {selUsers.length}
          </span>
        )}
        <span style={{ color: "var(--dim)", fontSize: 11,
          transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
          background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow)", maxHeight: 260, overflow: "auto", padding: 6 }}>
          {users.length === 0 && (
            <div style={{ padding: 10, fontSize: 13, color: "var(--dim)" }}>Keine User vorhanden.</div>
          )}
          {users.map((u) => {
            const on = selected.includes(u.id);
            return (
              <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                background: on ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent" }}>
                <input type="checkbox" checked={on} onChange={() => onToggle(u.id)}
                  style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>{u.name || u.email}</span>
                {u.name && (
                  <span style={{ color: "var(--dim)", fontSize: 11, marginLeft: "auto",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
