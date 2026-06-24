// Galeria Store-Typ: nur noch Farben.
export const STORE_TYPEN = ["Grün", "Gelb", "Rot", "Blau"];

const TYP_COLOR = {
  "Grün": "#16a34a",
  "Gelb": "#d97706",
  "Rot": "#dc2626",
  "Blau": "#2563eb",
};

export function StoreTypBadge({ typ }) {
  const c = TYP_COLOR[typ] || "var(--dim)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, background: c,
        display: "inline-block", flexShrink: 0 }} />
      {typ || "—"}
    </span>
  );
}

export function ProblemCount({ n }) {
  if (!n) return <span style={{ color: "var(--dim)" }}>—</span>;
  return (
    <span className="badge" title={`${n} gemeldete(s) Problem(e)`}
      style={{ background: "color-mix(in srgb, var(--coral) 15%, transparent)",
        color: "var(--coral)", border: "1px solid color-mix(in srgb, var(--coral) 35%, transparent)" }}>
      ⚠ {n}
    </span>
  );
}
