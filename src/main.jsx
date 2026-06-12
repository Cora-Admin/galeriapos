import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Stores from "./pages/Stores.jsx";
import StoreDetail from "./pages/StoreDetail.jsx";
import Checklist from "./pages/Checklist.jsx";
import Template from "./pages/Template.jsx";
import Layout from "./components/Layout.jsx";
import "./index.css";

function Protected({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="center-screen">Lädt…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/stores/:id" element={<StoreDetail />} />
          <Route path="/stores/:id/kasse/:kasseId" element={<Checklist />} />
          <Route path="/vorlage" element={<Template />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
