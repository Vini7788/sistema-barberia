import { useState } from "react";
import { useAuth } from "../../context/AuthContext"; // Puxa o contexto de login
import { db } from "../../firebase"; // Conexão com o banco de dados
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

export default function Agendamento() {
  const { usuarioLogado } = useAuth(); // Pegando o usuário em tempo real

  // Estados dos campos do formulário (repare que não precisamos mais do estado de nome do cliente)
  const [barbeiroId, setBarbeiroId] = useState("");
  const [dataHorario, setDataHorario] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const handleAgendar = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!barbeiroId || !dataHorario) {
      setErro("Por favor, preencha todos os campos!");
      return;
    }

    try {
      // 1. Regra de Negócio: Validação de Horário Duplicado no Firestore
      const q = query(
        collection(db, "agendamentos"),
        where("barbeiroId", "==", barbeiroId),
        where("dataHorario", "==", dataHorario)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setErro("Este profissional já possui um agendamento neste horário.");
        return;
      }

      // 2. Salvando o Agendamento com os dados dinâmicos do Usuário Logado
      await addDoc(collection(db, "agendamentos"), {
        clientId: usuarioLogado.uid, // Armazena o ID real do Firebase Auth
        clientEmail: usuarioLogado.email, // Salva o e-mail para identificação rápida
        barbeiroId,
        dataHorario,
        createdAt: new Date(),
      });

      setSucesso("🎉 Agendamento realizado com sucesso!");
      setBarbeiroId("");
      setDataHorario("");
    } catch (err) {
      console.error("Erro ao salvar agendamento:", err);
      setErro("Ocorreu um erro ao salvar o agendamento. Tente novamente.");
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "60px auto", padding: "30px", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#111" }}>Agende seu Horário</h2>

      {/* Feedbacks de Erro e Sucesso com os padrões de design do sumário */}
      {erro && <p style={{ color: "red", backgroundColor: "#fde8e8", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold" }}>{erro}</p>}
      {sucesso && <p style={{ color: "green", backgroundColor: "#e6f4ea", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold" }}>{sucesso}</p>}

      <form onSubmit={handleAgendar} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Campo do Cliente desabilitado (Apenas visual, mostrando quem está logado) */}
        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>Cliente Ativo:</span>
          <input 
            type="text" 
            value={usuarioLogado ? usuarioLogado.email : "Carregando..."} 
            disabled 
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#f5f5f5", cursor: "not-allowed", color: "#666" }} 
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>Escolha o Profissional:</span>
          <select 
            value={barbeiroId} 
            onChange={(e) => setBarbeiroId(e.target.value)} 
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            <option value="">Selecione um barbeiro...</option>
            <option value="barbeiro_1">Alan (Cabelo & Barba)</option>
            <option value="barbeiro_2">Vitor (Especialista em Degradê)</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>Data e Horário:</span>
          <input 
            type="datetime-local" 
            value={dataHorario} 
            onChange={(e) => setDataHorario(e.target.value)} 
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }} 
          />
        </label>

        <button type="submit" style={{ padding: "12px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
          Confirmar Agendamento
        </button>
      </form>
    </div>
  );
}