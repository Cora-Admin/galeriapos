import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import BrandMark from "./BrandMark.jsx";

const NAV = [
  { to: "/", label: "Übersicht", end: true },
  { to: "/stores", label: "Filialen" },
  { label: "Templates", children: [
    { to: "/vorlage", label: "Migrationscheckliste" },
    { to: "/abfrage-vorlage", label: "Filialabfrage" },
  ] },
  { to: "/users", label: "Users" },
];

function NavDropdown({ item }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  const active = item.children.some((c) => c.to === loc.pathname);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className={"nav-pill" + (active ? " active" : "")} onClick={() => setOpen((o) => !o)}
        style={{ border: "none", background: active ? undefined : "transparent", cursor: "pointer",
          font: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        {item.label} <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40,
          background: "#fff", border: "1px solid var(--line)", borderRadius: 10,
          boxShadow: "var(--shadow)", padding: 6, minWidth: 210 }}>
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to}
              className={({ isActive }) => "nav-item-mobile" + (isActive ? " active" : "")}
              style={{ display: "block", fontSize: 14, padding: "9px 12px" }}>
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    setOpen(false);
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

          <nav className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 8 }}>
            {NAV.map((n) => n.children ? (
              <NavDropdown key={n.label} item={n} />
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => "nav-pill" + (isActive ? " active" : "")}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="user-desktop" style={{ display: "flex", alignItems: "center",
            gap: 10, marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, background: "var(--navy)",
                color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center" }}>{initials}</div>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>{user?.email}</span>
            </div>
            <button className="btn btn-ghost" onClick={handleLogout}>Abmelden</button>
          </div>

          <button className="menu-btn btn btn-ghost" aria-label="Menü öffnen"
            aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "✕" : "☰"}
          </button>
        </div>

        {open && (
          <div className="mobile-menu">
            {NAV.map((n) => n.children ? (
              <div key={n.label}>
                <div className="label" style={{ padding: "8px 14px 4px" }}>{n.label}</div>
                {n.children.map((c) => (
                  <NavLink key={c.to} to={c.to} onClick={() => setOpen(false)}
                    className={({ isActive }) => "nav-item-mobile" + (isActive ? " active" : "")}
                    style={{ paddingLeft: 22 }}>
                    {c.label}
                  </NavLink>
                ))}
              </div>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
                className={({ isActive }) => "nav-item-mobile" + (isActive ? " active" : "")}>
                {n.label}
              </NavLink>
            ))}
            <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0 4px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 14px" }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, background: "var(--navy)",
                color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center" }}>{initials}</div>
              <span style={{ fontSize: 13, color: "var(--dim)", wordBreak: "break-all" }}>{user?.email}</span>
            </div>
            <button className="btn btn-ghost" style={{ justifyContent: "flex-start", textAlign: "left" }}
              onClick={handleLogout}>Abmelden</button>
          </div>
        )}
      </header>
      <main className="wrap fade-in">
        <Outlet />
      </main>
    </div>
  );
}
