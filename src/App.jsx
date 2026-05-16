import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Agendamento from "./pages/Cliente/Agendamento";
import PainelCliente from "./pages/Cliente/PainelCliente";
import Dashboard from "./pages/Admin/Dashboard"; 
import Login from "./pages/Login"; 
import Navbar from "./components/Navbar"; // <-- Importando o Navbar ajustado
import { AuthProvider, useAuth } from "./context/AuthContext"; 

// Componente auxiliar para proteger as rotas do sistema
function RotaProtegida({ children }) {
  const { usuarioLogado } = useAuth();
  
  // Se não houver usuário logado, redireciona imediatamente para a tela de login
  if (!usuarioLogado) {
    return <Navigate to="/login" />;
  }
  
  // Se estiver logado, permite ver a página normalmente
  return children;
}

export default function App() {
  return (
    <AuthProvider> 
      <Router>
        {/* O Navbar fica aqui para aparecer no topo de todas as páginas */}
        <Navbar /> 

        <Routes>
          {/* Rota Pública (Acessível sem login) */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Privadas (Só entra quem estiver autenticado) */}
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

          <Route path="/admin/dashboard" element={
            <RotaProtegida>
              <Dashboard />
            </RotaProtegida>
          } />

          {/* Redirecionamento Padrão para segurança */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}