import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx"; // Importando seu hook de autenticação

export default function Navbar() {
  const { usuarioLogado, deslogar } = useAuth(); // Pegando o usuário e a função de logout
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await deslogar();
      navigate("/login"); // Chuta o usuário de volta para a tela de login após deslogar
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

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
        {/* SE O USUÁRIO ESTIVER LOGADO, MOSTRA OS LINKS DO SISTEMA */}
        {usuarioLogado ? (
          <>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: "500" }}>
              Novo Agendamento
            </Link>
            <Link to="/meus-agendamentos" style={{ color: "#fff", textDecoration: "none", fontWeight: "500" }}>
              Meus Agendamentos
            </Link>
            <Link to="/admin/dashboard" style={{ color: "#999", textDecoration: "none", fontSize: "14px", borderLeft: "1px solid #444", paddingLeft: "20px" }}>
              Área do Admin 📈
            </Link>
            
            {/* Botão de Sair charmoso para limpar a sessão */}
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
                transition: "0.2s"
              }}
              onMouseOver={(e) => { e.target.style.backgroundColor = "#ff4d4d"; e.target.style.color = "#fff"; }}
              onMouseOut={(e) => { e.target.style.backgroundColor = "transparent"; e.target.style.color = "#ff4d4d"; }}
            >
              Sair
            </button>
          </>
        ) : (
          /* SE NÃO ESTIVER LOGADO, MOSTRA APENAS O LINK DE LOGIN */
          <Link to="/login" style={{ color: "#007bff", textDecoration: "none", fontWeight: "bold" }}>
            Fazer Login
          </Link>
        )}
      </div>
    </nav>
  );
}