import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login");
  }

  const navStyle = ({ isActive }) => ({
    background: isActive ? "var(--accent)" : "transparent",
    color: isActive ? "#04140d" : "var(--dim)",
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
  });

  return (
    <div className="wrap">
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, var(--accent), var(--blue))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, color: "#fff", fontSize: 15 }}>P</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>POS Migration Cockpit</div>
            <div style={{ fontSize: 12, color: "var(--dim)" }}>GALERIA Rollout</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, background: "var(--panel)", padding: 4,
          borderRadius: 10, border: "1px solid var(--line)", flexWrap: "wrap" }}>
          <NavLink to="/" end style={navStyle}>Übersicht</NavLink>
          <NavLink to="/stores" style={navStyle}>Filialen</NavLink>
          <NavLink to="/vorlage" style={navStyle}>Checkliste</NavLink>
          <NavLink to="/abfrage-vorlage" style={navStyle}>Abfrage</NavLink>
          <NavLink to="/import" style={navStyle}>Import</NavLink>
          <NavLink to="/users" style={navStyle}>Users</NavLink>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>{user?.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>Abmelden</button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
