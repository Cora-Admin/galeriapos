// Kompaktes GALERIA-Logo-Mark (ineinandergreifende Ringe) für Header/Login.
export default function BrandMark({ size = 36, rounded = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}>
      <rect width="64" height="64" rx={rounded} fill="var(--navy)" />
      <g fill="none" stroke="var(--green)" strokeWidth="6.5">
        <circle cx="24" cy="24" r="11" />
        <circle cx="40" cy="24" r="11" />
        <circle cx="24" cy="40" r="11" />
        <circle cx="40" cy="40" r="11" />
      </g>
      <circle cx="32" cy="32" r="4.5" fill="var(--accent)" />
    </svg>
  );
}
