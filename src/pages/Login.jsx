import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Login() {
  const { logar, cadastrar } = useAuth();
  const navigate = useNavigate();

  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    if (!email || !senha) { setErro("Preencha todos os campos."); return; }
    if (modoCadastro && !nome) { setErro("Informe seu nome."); return; }

    try {
      setCarregando(true);

      if (modoCadastro) {
        const credencial = await cadastrar(email, senha);
        const uid = credencial.user.uid;
        await setDoc(doc(db, "usuarios", uid), {
          nome, email, role: "cliente", criadoEm: new Date().toISOString(),
        });
        navigate("/");
        return;
      }

      const credencial = await logar(email, senha);
      const uid = credencial.user.uid;
      const docSnap = await getDoc(doc(db, "usuarios", uid));
      const role = docSnap.exists() ? docSnap.data().role : "cliente";
      navigate(role === "dono" || role === "barbeiro" ? "/admin/dashboard" : "/");

    } catch (err) {
      if (err.code === "auth/email-already-in-use") setErro("Este e-mail já está cadastrado.");
      else if (err.code === "auth/invalid-credential") setErro("E-mail ou senha incorretos.");
      else setErro("Ocorreu um erro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const alternarModo = () => {
    setModoCadastro(!modoCadastro);
    setErro(""); setNome(""); setEmail(""); setSenha("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Lado esquerdo — Visual ── */}
      <div style={{
        backgroundColor: "var(--black)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Padrão decorativo */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.015) 40px,
              rgba(255,255,255,0.015) 41px
            )
          `,
        }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px",
              border: "2px solid rgba(255,255,255,0.8)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px",
            }}>
              ✦
            </div>
            <span style={{
              color: "#fff", fontSize: "20px", fontWeight: "600", letterSpacing: "0.05em",
            }}>
              LEME BARBER
            </span>
          </div>
        </div>

        {/* Texto central */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Foto placeholder — substitua o src pela foto real do ambiente da barbearia */}
          {/* Tamanho ideal: 800x600px, formato paisagem, ambiente da barbearia */}
          <div style={{
            width: "100%", aspectRatio: "4/3", borderRadius: "var(--radius-lg)",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            marginBottom: "40px", overflow: "hidden",
          }}>
            {/* TROQUE O CONTEÚDO ABAIXO PELA TAG:
                <img src="/fotos/ambiente.jpg" alt="Leme Barber" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                Foto sugerida: foto do interior da barbearia, boa iluminação, cadeiras visíveis */}
            <img src="/img/paisagem.png" alt="Leme Barber" style={{width:"100%",height:"100%",objectFit:"cover"}} />
          </div>

          <p style={{
            fontFamily: "'DM Serif Display', serif",
            color: "rgba(255,255,255,0.9)",
            fontSize: "28px", lineHeight: "1.3",
            fontStyle: "italic",
            marginBottom: "16px",
          }}>
            "O corte certo transforma<br/>mais do que a aparência."
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", letterSpacing: "0.08em" }}>
            — LEME BARBER, EST. 2024
          </p>
        </div>

        {/* Rodapé esquerdo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px" }}>
            © 2024 Leme Barber · Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Lado direito — Formulário ── */}
      <div style={{
        backgroundColor: "var(--grey-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 80px",
      }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>

          {/* Header do form */}
          <div style={{ marginBottom: "48px" }}>
            <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--grey-400)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
              {modoCadastro ? "Criar conta" : "Bem-vindo de volta"}
            </p>
            <h1 style={{ fontSize: "32px", fontWeight: "700", color: "var(--black)", lineHeight: "1.1", letterSpacing: "-0.02em" }}>
              {modoCadastro ? "Crie sua\nconta" : "Entre na sua\nconta"}
            </h1>
          </div>

          {/* Erro */}
          {erro && (
            <div style={{
              backgroundColor: "var(--error-light)", border: "1px solid #f5c2c7",
              borderRadius: "var(--radius-sm)", padding: "12px 16px",
              marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <span style={{ color: "var(--error)", fontSize: "14px", fontWeight: "500" }}>{erro}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {modoCadastro && (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--grey-600)", marginBottom: "8px", letterSpacing: "0.02em" }}>
                  Nome completo
                </label>
                <input
                  type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  style={{
                    width: "100%", padding: "13px 16px",
                    border: "1.5px solid var(--grey-200)",
                    borderRadius: "var(--radius-sm)", fontSize: "15px",
                    backgroundColor: "var(--white)", color: "var(--black)",
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--black)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--grey-200)"}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--grey-600)", marginBottom: "8px", letterSpacing: "0.02em" }}>
                E-mail
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                style={{
                  width: "100%", padding: "13px 16px",
                  border: "1.5px solid var(--grey-200)",
                  borderRadius: "var(--radius-sm)", fontSize: "15px",
                  backgroundColor: "var(--white)", color: "var(--black)",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--black)"}
                onBlur={(e) => e.target.style.borderColor = "var(--grey-200)"}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--grey-600)", marginBottom: "8px", letterSpacing: "0.02em" }}>
                Senha
              </label>
              <input
                type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: "100%", padding: "13px 16px",
                  border: "1.5px solid var(--grey-200)",
                  borderRadius: "var(--radius-sm)", fontSize: "15px",
                  backgroundColor: "var(--white)", color: "var(--black)",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--black)"}
                onBlur={(e) => e.target.style.borderColor = "var(--grey-200)"}
              />
            </div>

            <button
              type="submit" disabled={carregando}
              style={{
                width: "100%", padding: "14px",
                backgroundColor: "var(--black)", color: "var(--white)",
                border: "none", borderRadius: "var(--radius-sm)",
                fontSize: "15px", fontWeight: "600",
                cursor: carregando ? "not-allowed" : "pointer",
                opacity: carregando ? 0.7 : 1,
                letterSpacing: "0.02em",
                transition: "opacity 0.2s, transform 0.1s",
                marginTop: "4px",
              }}
              onMouseOver={(e) => { if (!carregando) e.target.style.opacity = "0.85"; }}
              onMouseOut={(e) => { if (!carregando) e.target.style.opacity = "1"; }}
            >
              {carregando ? "Aguarde..." : modoCadastro ? "Criar conta" : "Entrar"}
            </button>
          </form>

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "32px 0" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--grey-200)" }} />
            <span style={{ fontSize: "13px", color: "var(--grey-400)" }}>ou</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--grey-200)" }} />
          </div>

          {/* Alternar modo */}
          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--grey-600)" }}>
            {modoCadastro ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
            <span
              onClick={alternarModo}
              style={{ color: "var(--black)", fontWeight: "700", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}
            >
              {modoCadastro ? "Fazer login" : "Cadastre-se grátis"}
            </span>
          </p>

        </div>
      </div>
    </div>
  );
}
