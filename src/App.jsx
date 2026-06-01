import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Agendamento from "./pages/Cliente/Agendamento";
import PainelCliente from "./pages/Cliente/PainelCliente";
import Dashboard from "./pages/Admin/Dashboard";
import GestaoBarbearia from "./pages/Admin/GestaoBarbearia";

// ── Bloqueia quem não está logado ──────────────────────
function RotaProtegida({ children }) {
  const { usuarioLogado } = useAuth();
  if (!usuarioLogado) return <Navigate to="/login" />;
  return children;
}

// ── Só dono e barbeiro passam; clientes vão para "/" ───
function RotaFuncionario({ children }) {
  const { usuarioLogado, role } = useAuth();
  if (!usuarioLogado) return <Navigate to="/login" />;
  if (role === "cliente") return <Navigate to="/" />;
  return children;
}

// ── Só o dono passa; barbeiros vão para o dashboard ───
function RotaExclusivaDono({ children }) {
  const { usuarioLogado, role } = useAuth();
  if (!usuarioLogado) return <Navigate to="/login" />;
  if (role !== "dono") return <Navigate to="/admin/dashboard" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Cliente */}
          <Route path="/" element={
            <RotaProtegida><Agendamento /></RotaProtegida>
          } />
          <Route path="/meus-agendamentos" element={
            <RotaProtegida><PainelCliente /></RotaProtegida>
          } />

          {/* Admin: dono e barbeiro */}
          <Route path="/admin/dashboard" element={
            <RotaFuncionario><Dashboard /></RotaFuncionario>
          } />

          {/* Admin: só dono */}
          <Route path="/admin/gestao-barbearia" element={
            <RotaExclusivaDono><GestaoBarbearia /></RotaExclusivaDono>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
