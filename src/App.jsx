import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Agendamento from "./pages/Cliente/Agendamento";
import PainelCliente from "./pages/Cliente/PainelCliente";
import Dashboard from "./pages/Admin/Dashboard";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import { AuthProvider, useAuth } from "./context/AuthContext";

// -------------------------------------------------------
// ROTA 1: Bloqueia quem não está logado
// -------------------------------------------------------
function RotaProtegida({ children }) {
  const { usuarioLogado } = useAuth();
  if (!usuarioLogado) return <Navigate to="/login" />;
  return children;
}

// -------------------------------------------------------
// ROTA 2: Só entra quem for "dono" ou "barbeiro"
// Clientes que tentarem acessar /admin/* são mandados para "/"
// -------------------------------------------------------
function RotaFuncionario({ children }) {
  const { usuarioLogado, role } = useAuth();

  if (!usuarioLogado) return <Navigate to="/login" />;
  if (role === "cliente") return <Navigate to="/" />;

  return children;
}

// -------------------------------------------------------
// ROTA 3: Só entra quem for "dono"
// Barbeiros que tentarem acessar são mandados para o dashboard
// -------------------------------------------------------
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
          {/* Rota Pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas de Cliente (logado, qualquer role) */}
          <Route path="/" element={
            <RotaProtegida>
              <Agendamento />
            </RotaProtegida>
          } />

          <Route path="/meus-agendamentos" element={
            <RotaProtegida>
              <PainelCliente />
            </RotaProtegida>
          } />

          {/* Rotas Admin: apenas dono e barbeiro */}
          <Route path="/admin/dashboard" element={
            <RotaFuncionario>
              <Dashboard />
            </RotaFuncionario>
          } />

          {/* Exemplo de rota exclusiva do dono (ex: gestão financeira, relatórios) */}
          {/* 
          <Route path="/admin/financeiro" element={
            <RotaExclusivaDono>
              <Financeiro />
            </RotaExclusivaDono>
          } />
          */}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
import GestaoEquipe from "./pages/Admin/GestaoEquipe";

// Dentro do <Routes>:
<Route path="/admin/gestao-equipe" element={
  <RotaExclusivaDono>
    <GestaoEquipe />
  </RotaExclusivaDono>
} />