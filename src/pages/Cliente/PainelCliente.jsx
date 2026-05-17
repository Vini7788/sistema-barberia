import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";

export default function PainelCliente() {
  const { usuarioLogado } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Função para buscar os agendamentos do banco de dados
  const buscarAgendamentos = async () => {
    if (!usuarioLogado) return;
    
    try {
      setCarregando(true);
      // Cria uma consulta filtrando apenas onde o clientId é igual ao ID do usuário logado
      const q = query(
        collection(db, "agendamentos"),
        where("clientId", "==", usuarioLogado.uid)
      );

      const querySnapshot = await getDocs(q);
      const listaAgendamentos = [];
      
      querySnapshot.forEach((documento) => {
        listaAgendamentos.push({
          id: documento.id,
          ...documento.data()
        });
      });

      // Ordena por data mais recente (opcional, baseado na string do datetime-local)
      listaAgendamentos.sort((a, b) => new Date(a.dataHorario) - new Date(b.dataHorario));

      setAgendamentos(listaAgendamentos);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      setErro("Não foi possível carregar seus agendamentos.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarAgendamentos();
  }, [usuarioLogado]);

  // Função para cancelar (excluir) um agendamento
  const handleCancelar = async (idDoAgendamento) => {
    const confirmar = window.confirm("Tem certeza que deseja cancelar este horário?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "agendamentos", idDoAgendamento));
      // Atualiza a tela removendo o item deletado da lista
      setAgendamentos(agendamentos.filter(item => item.id !== idDoAgendamento));
      alert("Horário cancelado com sucesso!");
    } catch (err) {
      console.error("Erro ao deletar:", err);
      alert("Não foi possível cancelar o horário. Tente novamente.");
    }
  };

  // Função auxiliar para deixar o nome do barbeiro amigável na tela
  const formatarBarbeiro = (id) => {
    if (id === "barbeiro_1") return "Alan (Cabelo & Barba)";
    if (id === "barbeiro_2") return "Vitor (Especialista em Degradê)";
    return id;
  };

  // Função para formatar a exibição da data (YYYY-MM-DDTHH:MM -> DD/MM/YYYY às HH:MM)
  const formatarData = (dataString) => {
    if (!dataString) return "";
    const [data, hora] = dataString.split("T");
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano} às ${hora}`;
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#111" }}>
          👤 Painel do Cliente
        </h2>
        <p style={{ color: "#555" }}>
          Olá, <strong style={{ color: "#007bff" }}>{usuarioLogado?.email}</strong>. Gerencie seus horários abaixo:
        </p>
        <hr style={{ border: "0", borderTop: "1px solid #ddd", margin: "20px 0" }} />
      </div>

      <h3 style={{ textTransform: "uppercase", fontSize: "16px", color: "#666", letterSpacing: "1px", textAlign: "center", marginBottom: "20px" }}>
        Meus Agendamentos
      </h3>

      {erro && <p style={{ color: "red", textAlign: "center" }}>{erro}</p>}

      {carregando ? (
        <p style={{ textAlign: "center", color: "#999" }}>Carregando seus horários...</p>
      ) : agendamentos.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "8px", border: "1px dashed #ccc" }}>
          Você ainda não possui nenhum horário agendado.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {agendamentos.map((agendamento) => (
            <div key={agendamento.id} style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee", display: "flex", flexDirection: "column", gap: "8px", position: "relative" }}>
              <p style={{ margin: "0", color: "#444" }}>
                <strong>Profissional:</strong> {formatarBarbeiro(agendamento.barbeiroId)}
              </p>
              <p style={{ margin: "0", color: "#444" }}>
                <strong>Data/Hora:</strong> {formatarData(agendamento.dataHorario)}
              </p>
              <p style={{ margin: "0", color: "#444" }}>
                <strong>Status:</strong> <span style={{ color: "green", fontWeight: "bold" }}>CONFIRMADO</span>
              </p>
              
              <button 
                onClick={() => handleCancelar(agendamento.id)}
                style={{ alignSelf: "flex-start", marginTop: "5px", padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
              >
                Cancelar Horário
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}