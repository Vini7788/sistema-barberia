import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function PainelCliente() {
  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Simulando o cliente logado. Depois integraremos com o Firebase Auth (usuarios)
  const clienteLogadoId = "Aleatorio"; 

  const carregarHistorico = async () => {
    try {
      // Cria uma busca filtrando os agendamentos apenas deste cliente específico
      const q = query(collection(db, "agendamentos"), where("clienteId", "==", clienteLogadoId));
      const querySnapshot = await getDocs(q);
      
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Converte o Timestamp do Firebase para um objeto Date do JavaScript
        dataHorario: doc.data().dataHorario?.toDate() 
      }));

      setMeusAgendamentos(lista);
    } catch (error) {
      console.error("Erro ao carregar painel:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  // Regra de Negócio: Cancelamento autônomo com limite de 2 horas de antecedência
  const lidarComCancelamento = async (agendamentoId, dataHorario) => {
    if (!dataHorario) return;

    const agora = new Date();
    const duasHorasEmMilissegundos = 2 * 60 * 60 * 1000;

    // Calcula a diferença de tempo entre o horário do corte e o momento atual
    const diferencaTempo = dataHorario.getTime() - agora.getTime();

    if (diferencaTempo < duasHorasEmMilissegundos) {
      alert("🚨 Bloqueado: Não é possível cancelar com menos de 2 horas de antecedência. Entre em contato por telefone.");
      return;
    }

    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
      try {
        const agendamentoRef = doc(db, "agendamentos", agendamentoId);
        
        // Em vez de deletar o registro, mudamos o status para "cancelado" (Melhor para métricas de ADM!)
        await updateDoc(agendamentoRef, {
          status: "cancelado"
        });

        alert("Agendamento cancelado com sucesso. 🤝");
        carregarHistorico(); // Recarrega a lista
      } catch (error) {
        console.error("Erro ao cancelar:", error);
        alert("Erro técnico ao processar cancelamento.");
      }
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2>👤 Painel do Cliente</h2>
      <p style={{ color: "#666" }}>Olá, <strong>{clienteLogadoId}</strong>. Gerencie seus horários abaixo:</p>
      <hr />

      <h3>Meus Agendamentos</h3>

      {carregando ? (
        <p>Carregando seu histórico...</p>
      ) : meusAgendamentos.length === 0 ? (
        <p>Você ainda não realizou nenhum agendamento.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {meusAgendamentos.map((agend) => {
            const dataValida = agend.dataHorario instanceof Date;
            
            return (
              <div key={agend.id} style={{ padding: "15px", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: agend.status === "cancelado" ? "#f8d7da" : "#fff" }}>
                <p style={{ margin: "0 0 5px 0" }}><strong>Serviço:</strong> {agend.servicoNome}</p>
                
                <p style={{ margin: "0 0 5px 0" }}>
                  <strong>Data/Hora:</strong> {dataValida ? agend.dataHorario.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Não informada"}
                </p>

                <p style={{ margin: "0 0 10px 0" }}>
                  <strong>Status:</strong>{" "}
                  <span style={{ 
                    fontWeight: "bold", 
                    color: agend.status === "confirmado" ? "green" : agend.status === "cancelado" ? "red" : "orange" 
                  }}>
                    {agend.status.toUpperCase()}
                  </span>
                </p>

                {/* Exibe o botão de cancelamento apenas se o agendamento ainda estiver ativo */}
                {agend.status === "confirmado" && (
                  <button
                    onClick={() => lidarComCancelamento(agend.id, agend.dataHorario)}
                    style={{ padding: "8px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    Cancelar Horário
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}