import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const injectStyles = () => {
  if (document.getElementById("navbar-styles")) return;
  const style = document.createElement("style");
  style.id = "navbar-styles";
  style.textContent = `
    .nb-link {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      letter-spacing: 0.02em;
      transition: color 0.2s;
      font-family: 'DM Sans', sans-serif;
      padding: 6px 0;
      position: relative;
    }
    .nb-link:hover { color: #fff; }
    .nb-link.active { color: #fff; }
    .nb-link.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0; right: 0;
      height: 1.5px;
      background: #fff;
      border-radius: 999px;
    }
    .nb-btn-sair {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      background: none;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      padding: 7px 16px;
      cursor: pointer;
      letter-spacing: 0.03em;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.2s;
    }
    .nb-btn-sair:hover {
      color: #fff;
      border-color: rgba(255,255,255,0.4);
      background: rgba(255,255,255,0.05);
    }
    .nb-hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      cursor: pointer;
      padding: 4px;
      background: none;
      border: none;
    }
    .nb-hamburger span {
      display: block;
      width: 22px;
      height: 1.5px;
      background: rgba(255,255,255,0.7);
      border-radius: 999px;
      transition: all 0.25s;
    }
    .nb-hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
    .nb-hamburger.open span:nth-child(2) { opacity: 0; }
    .nb-hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
    .nb-mobile-menu {
      display: none;
      flex-direction: column;
      gap: 0;
      background: #111;
      border-top: 1px solid rgba(255,255,255,0.07);
      padding: 8px 0 16px;
    }
    .nb-mobile-menu.open { display: flex; }
    .nb-mobile-link {
      font-size: 15px;
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      padding: 14px 24px;
      font-family: 'DM Sans', sans-serif;
      transition: color 0.2s, background 0.2s;
      letter-spacing: 0.01em;
    }
    .nb-mobile-link:hover, .nb-mobile-link.active {
      color: #fff;
      background: rgba(255,255,255,0.04);
    }
    .nb-mobile-sair {
      margin: 8px 24px 0;
      padding: 12px;
      background: none;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      letter-spacing: 0.03em;
    }
    .nb-mobile-sair:hover { color: #fff; border-color: rgba(255,255,255,0.35); }
    @media (max-width: 700px) {
      .nb-desktop-links { display: none !important; }
      .nb-hamburger { display: flex !important; }
    }
  `;
  document.head.appendChild(style);
};

export default function Navbar() {
  useEffect(() => { injectStyles(); }, []);

  const { usuarioLogado, role, deslogar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  const eFuncionario = role === "dono" || role === "barbeiro";

  const handleLogout = async () => {
    try {
      setMenuAberto(false);
      await deslogar();
      navigate("/login");
    } catch (err) {
      console.error("Erro ao deslogar:", err);
    }
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  // Fecha menu ao mudar de rota
  useEffect(() => { setMenuAberto(false); }, [location.pathname]);

  // Links por role
  const linksCliente = [
    { to: "/", label: "Agendar" },
    { to: "/meus-agendamentos", label: "Meus Agendamentos" },
  ];
  const linksFuncionario = [
    { to: "/admin/dashboard", label: "Dashboard" },
    ...(role === "dono" ? [{ to: "/admin/gestao-barbearia", label: "Gestão" }] : []),
  ];
  const links = usuarioLogado ? (eFuncionario ? linksFuncionario : linksCliente) : [];

  // Não exibe navbar na tela de login
  if (location.pathname === "/login") return null;

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <nav style={{
        backgroundColor: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: "60px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Logo */}
        <Link to={usuarioLogado ? (eFuncionario ? "/admin/dashboard" : "/") : "/login"}
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px",
            border: "1.5px solid rgba(255,255,255,0.6)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", color: "rgba(255,255,255,0.8)",
          }}>
            ✦
          </div>
          <span style={{
            color: "#fff", fontSize: "15px", fontWeight: "600",
            letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif",
          }}>
            LEME BARBER
          </span>
        </Link>

        {/* Links desktop */}
        <div className="nb-desktop-links" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {links.map(({ to, label }) => (
            <Link key={to} to={to} className={`nb-link ${isActive(to)}`}>{label}</Link>
          ))}

          {usuarioLogado && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "12px", paddingLeft: "20px", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {usuarioLogado.email}
              </span>
              <button className="nb-btn-sair" onClick={handleLogout}>Sair</button>
            </div>
          )}

          {!usuarioLogado && (
            <Link to="/login" className="nb-link">Entrar</Link>
          )}
        </div>

        {/* Hamburguer mobile */}
        <button
          className={`nb-hamburger ${menuAberto ? "open" : ""}`}
          onClick={() => setMenuAberto(!menuAberto)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Menu mobile */}
      <div className={`nb-mobile-menu ${menuAberto ? "open" : ""}`}>
        {links.map(({ to, label }) => (
          <Link key={to} to={to} className={`nb-mobile-link ${isActive(to)}`}>{label}</Link>
        ))}
        {usuarioLogado && (
          <>
            <span style={{ padding: "10px 24px 4px", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>
              {usuarioLogado.email}
            </span>
            <button className="nb-mobile-sair" onClick={handleLogout}>Sair</button>
          </>
        )}
        {!usuarioLogado && (
          <Link to="/login" className="nb-mobile-link">Entrar</Link>
        )}
      </div>
    </header>
  );
}
