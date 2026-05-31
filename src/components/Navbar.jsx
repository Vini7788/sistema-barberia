import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { usuarioLogado, role, deslogar } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await deslogar();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  const eFuncionario = role === "dono" || role === "barbeiro";

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "15px 30px",
      backgroundColor: "#111",
      color: "#fff",
      fontFamily: "sans-serif"
    }}>
      <div style={{ fontWeight: "bold", fontSize: "18px" }}>
        💈 Barbearia Premium
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {usuarioLogado ? (
          <>
            {/* Links visíveis apenas para CLIENTES */}
            {role === "cliente" && (
              <>
                <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: "500" }}>
                  Novo Agendamento
                </Link>
                <Link to="/meus-agendamentos" style={{ color: "#fff", textDecoration: "none", fontWeight: "500" }}>
                  Meus Agendamentos
                </Link>
              </>
            )}

            {/* Links visíveis apenas para DONO e BARBEIRO */}
            {eFuncionario && (
              <>
                <Link to="/admin/dashboard" style={{ color: "#fff", textDecoration: "none", fontWeight: "500" }}>
                  📈 Dashboard
                </Link>

                {/* Gestão de Equipe só para o DONO */}
                {role === "dono" && (
                  <Link to="/admin/gestao-equipe" style={{ color: "#fff", textDecoration: "none", fontWeight: "500" }}>
                    👥 Equipe
                  </Link>
                )}
              </>
            )}

            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "1px solid #ff4d4d",
                color: "#ff4d4d",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
                marginLeft: "10px",
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = "#ff4d4d"; e.target.style.color = "#fff"; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#ff4d4d"; }}
            >
              Sair
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: "#007bff", textDecoration: "none", fontWeight: "bold" }}>
            Fazer Login
          </Link>
        )}
      </div>
    </nav>
  );
}
