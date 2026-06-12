export const STATUS_COLOR = {
  Offen: "var(--offen)",
  Geplant: "var(--geplant)",
  Läuft: "var(--laeuft)",
  Fertig: "var(--fertig)",
};

export function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || "var(--offen)";
  return (
    <span
      className="badge"
      style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`,
        color: c, border: `1px solid color-mix(in srgb, ${c} 35%, transparent)` }}
    >
      {status}
    </span>
  );
}
