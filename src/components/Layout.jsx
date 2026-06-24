import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import BrandMark from "./BrandMark.jsx";

const NAV = [
  { to: "/", label: "Übersicht", end: true },
  { to: "/stores", label: "Filialen" },
  { to: "/vorlage", label: "Checkliste" },
  { to: "/abfrage-vorlage", label: "Abfrage" },
  { to: "/import", label: "Import" },
  { to: "/users", label: "Users" },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  const initials = (user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark size={38} />
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em" }}>
                POS Migration Cockpit
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: ".08em" }}>GALERIA Rollout</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 2, marginLeft: 8, flexWrap: "wrap" }}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => "nav-pill" + (isActive ? " active" : "")}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, background: "var(--navy)",
                color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center" }}>{initials}</div>
              <span style={{ fontSize: 12, color: "var(--dim)" }}
                className="hide-sm">{user?.email}</span>
            </div>
            <button className="btn btn-ghost" onClick={handleLogout}>Abmelden</button>
          </div>
        </div>
      </header>
      <main className="wrap fade-in">
        <Outlet />
      </main>
    </div>
  );
}
