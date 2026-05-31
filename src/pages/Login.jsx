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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (!email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }
    if (modoCadastro && !nome) {
      setErro("Informe seu nome!");
      return;
    }

    try {
      if (modoCadastro) {
        // 1. Cria no Firebase Authentication
        const credencial = await cadastrar(email, senha);
        const uid = credencial.user.uid;

        // 2. Escreve o documento no Firestore com role "cliente"
        await setDoc(doc(db, "usuarios", uid), {
          nome: nome,
          email: email,
          role: "cliente",
          criadoEm: new Date().toISOString(),
        });

        alert("🎉 Conta criada com sucesso!");
        navigate("/");
        return;
      }

      // Login: busca a role para redirecionar corretamente
      const credencial = await logar(email, senha);
      const uid = credencial.user.uid;

      const docSnap = await getDoc(doc(db, "usuarios", uid));
      const role = docSnap.exists() ? docSnap.data().role : "cliente";

      if (role === "dono" || role === "barbeiro") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") setErro("Este e-mail já está cadastrado.");
      else if (err.code === "auth/invalid-credential") setErro("E-mail ou senha incorretos.");
      else setErro("Ocorreu um erro. Tente novamente.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "80px auto", padding: "30px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        {modoCadastro ? "Criar Sua Conta" : "Acesse a Barbearia"}
      </h2>

      {erro && (
        <p style={{ color: "red", backgroundColor: "#fde8e8", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold" }}>
          {erro}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>

        {/* Campo nome só aparece no modo cadastro */}
        {modoCadastro && (
          <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ fontWeight: "bold", fontSize: "14px" }}>Seu Nome:</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como você se chama?"
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          </label>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>E-mail:</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>Senha:</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="No mínimo 6 caracteres"
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </label>

        <button
          type="submit"
          style={{ padding: "12px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}
        >
          {modoCadastro ? "Cadastrar" : "Entrar"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "#666" }}>
        {modoCadastro ? "Já tem uma conta?" : "Novo por aqui?"}{" "}
        <span
          onClick={() => { setModoCadastro(!modoCadastro); setErro(""); setNome(""); }}
          style={{ color: "#007bff", cursor: "pointer", fontWeight: "bold" }}
        >
          {modoCadastro ? "Fazer Login" : "Cadastre-se"}
        </span>
      </p>
    </div>
  );
}
