import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function Dashboard() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mesFaturamento, setMesFaturamento] = useState("Maio");

  // Preço padrão por corte para o cálculo de caixa
  const PRECO_CORTE = 45.00; 

  const buscarTodosAgendamentos = async () => {
    try {
      setCarregando(true);
      setErro("");
      const querySnapshot = await getDocs(collection(db, "agendamentos"));
      const lista = [];
      
      querySnapshot.forEach((documento) => {
        lista.push({
          id: documento.id,
          ...documento.data()
        });
      });

      lista.sort((a, b) => {
        if (!a.dataHorario || typeof a.dataHorario !== "string") return 1;
        if (!b.dataHorario || typeof b.dataHorario !== "string") return -1;
        return new Date(a.dataHorario) - new Date(b.dataHorario);
      });

      setAgendamentos(lista);
    } catch (error) {
      console.error("Erro detalhado no Dashboard:", error);
      setErro("Não foi possível carregar os dados do Firebase.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarTodosAgendamentos();
  }, []);

  const handleConcluirCorte = async (id) => {
    try {
      const agendamentoRef = doc(db, "agendamentos", id);
      await updateDoc(agendamentoRef, { status: "concluido" });
      
      setAgendamentos(agendamentos.map(item => 
        item.id === id ? { ...item, status: "concluido" } : item
      ));
      
      alert("Corte concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao concluir corte:", error);
      alert("Não foi possível concluir o agendamento.");
    }
  };

  const handleCancelarAdmin = async (id) => {
    if (!window.confirm("Deseja realmente cancelar este agendamento?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos(agendamentos.filter(item => item.id !== id));
      alert("Agendamento removido com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  // Mapeamento corrigido para aceitar tanto os IDs antigos quanto os novos IDs gerados pelo Firebase
  const formatarBarbeiro = (id) => {
    if (id === "barbeiro_1" || id === "b9InIZOqbHXTYHL3VeTa") return "Alan (Cabelo & Barba)";
    if (id === "barbeiro_2") return "Vitor (Especialista em Degradê)";
    return id || "Não selecionado";
  };

  const formatarData = (dataString) => {
    if (!dataString || typeof dataString !== "string") {
      if (dataString && dataString.seconds) {
        const d = new Date(dataString.seconds * 1000);
        return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      }
      return "Data não definida";
    }
    try {
      if (dataString.includes("T")) {
        const [data, hora] = dataString.split("T");
        const [ano, mes, dia] = data.split("-");
        return `${dia}/${mes}/${ano} às ${hora}`;
      }
      return dataString;
    } catch (e) {
      return "Erro no formato";
    }
  };

  // ================= CÁLCULOS DINÂMICOS DO CARD =================
  const totalConcluidos = agendamentos.filter(item => item.status === "concluido").length;
  const faturamentoTotal = totalConcluidos * PRECO_CORTE;
  const totalPendentes = agendamentos.filter(item => item.status !== "concluido").length;
  const proximoClienteAgendado = agendamentos.find(item => item.status !== "concluido");

  // ================= GRÁFICO 100% REAL EM TEMPO REAL =================
  // Filtra apenas os concluídos de cada um para gerar a métrica de desempenho real
  const cortesAlan = agendamentos.filter(item => 
    item.status === "concluido" && (item.barbeiroId === "barbeiro_1" || item.barbeiroId === "b9InIZOqbHXTYHL3VeTa")
  ).length;

  const cortesVitor = agendamentos.filter(item => 
    item.status === "concluido" && item.barbeiroId === "barbeiro_2"
  ).length;

  // Define uma altura máxima visual em pixels para a maior barra do gráfico não quebrar o layout
  const maiorQuantidade = Math.max(cortesAlan, cortesVitor, 1);
  const alturaAlan = (cortesAlan / maiorQuantidade) * 140; 
  const alturaVitor = (cortesVitor / maiorQuantidade) * 140;

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #eee", paddingBottom: "15px" }}>
        <h2 style={{ margin: "0", color: "#111" }}>📈 Painel Administrativo</h2>
        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold", fontSize: "14px" }}>Faturamento de:</label>
          <select 
            value={mesFaturamento} 
            onChange={(e) => setMesFaturamento(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", fontWeight: "bold" }}
          >
            <option value="Janeiro">Janeiro</option>
            <option value="Fevereiro">Fevereiro</option>
            <option value="Março">Março</option>
            <option value="Abril">Abril</option>
            <option value="Maio">Maio</option>
          </select>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #28a745" }}>
          <span style={{ fontSize: "14px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>Faturamento ({mesFaturamento})</span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>
            {carregando ? "R$ ..." : `R$ ${faturamentoTotal.toFixed(2).replace(".", ",")}`}
          </h3>
        </div>
        
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #007bff" }}>
          <span style={{ fontSize: "14px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>Agendamentos Pendentes</span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>{carregando ? "..." : totalPendentes}</h3>
        </div>

        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #ffc107" }}>
          <span style={{ fontSize: "14px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>Próximo Cliente</span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "16px", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {proximoClienteAgendado ? proximoClienteAgendado.clientEmail : "Nenhum pendente"}
          </h3>
        </div>
      </div>

      {/* GRÁFICO DINÂMICO DE ATENDIMENTOS REALIZADOS */}
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase", letterSpacing: "0.5px" }}>Desempenho da Equipe (Cortes Concluídos)</h3>
        <div style={{ display: "flex", gap: "60px", alignItems: "flex-end", height: "200px", paddingBottom: "20px", borderBottom: "2px solid #eee", justifyContent: "center" }}>
          
          {/* Barra Alan */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "90px" }}>
            <span style={{ fontWeight: "bold", marginBottom: "5px", fontSize: "14px" }}>{cortesAlan}</span>
            <div style={{ width: "100%", height: `${cortesAlan === 0 ? 5 : alturaAlan}px`, backgroundColor: "#111", borderRadius: "6px 6px 0 0", transition: "height 0.3s ease" }}></div>
            <span style={{ marginTop: "10px", fontSize: "13px", fontWeight: "500", color: "#555", textAlign: "center" }}>Alan</span>
          </div>

          {/* Barra Vitor */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "90px" }}>
            <span style={{ fontWeight: "bold", marginBottom: "5px", fontSize: "14px" }}>{cortesVitor}</span>
            <div style={{ width: "100%", height: `${cortesVitor === 0 ? 5 : alturaVitor}px`, backgroundColor: "#555", borderRadius: "6px 6px 0 0", transition: "height 0.3s ease" }}></div>
            <span style={{ marginTop: "10px", fontSize: "13px", fontWeight: "500", color: "#555", textAlign: "center" }}>Vitor</span>
          </div>

        </div>
      </div>

      {/* GERENCIADOR DE HORÁRIOS */}
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Gerenciador de Horários
        </h3>

        {erro && (
          <p style={{ color: "red", backgroundColor: "#fde8e8", padding: "15px", borderRadius: "6px", textAlign: "center", fontWeight: "bold" }}>
            {erro}
          </p>
        )}

        {carregando && !erro ? (
          <p style={{ textAlign: "center", color: "#999" }}>Carregando dados do servidor...</p>
        ) : agendamentos.length === 0 && !erro ? (
          <p style={{ textAlign: "center", color: "#999", padding: "30px", border: "1px dashed #ccc", borderRadius: "8px" }}>
            Nenhum cliente agendado no sistema.
          </p>
        ) : (
          !erro && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#111", color: "#fff" }}>
                    <th style={{ padding: "12px 15px", borderRadius: "6px 0 0 6px" }}>Cliente</th>
                    <th style={{ padding: "12px 15px" }}>Profissional</th>
                    <th style={{ padding: "12px 15px" }}>Data e Horário</th>
                    <th style={{ padding: "12px 15px" }}>Status</th>
                    <th style={{ padding: "12px 15px", borderRadius: "0 6px 6px 0", textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {agendamentos.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #eee", backgroundColor: item.status === "concluido" ? "#f8f9fa" : "transparent" }}>
                      <td style={{ padding: "12px 15px", color: "#333", fontSize: "14px" }}>
                        {item.clientEmail || "Não informado"}
                      </td>
                      <td style={{ padding: "12px 15px", color: "#333", fontWeight: "500" }}>
                        {formatarBarbeiro(item.barbeiroId)}
                      </td>
                      <td style={{ padding: "12px 15px", color: "#666" }}>
                        {formatarData(item.dataHorario)}
                      </td>
                      <td style={{ padding: "12px 15px" }}>
                        {item.status === "concluido" ? (
                          <span style={{ color: "#28a745", fontWeight: "bold", fontSize: "13px" }}>✅ Concluído</span>
                        ) : (
                          <span style={{ color: "#007bff", fontWeight: "bold", fontSize: "13px" }}>🗓️ Confirmado</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 15px", display: "flex", gap: "10px", justifyContent: "center" }}>
                        
                        {item.status !== "concluido" && (
                          <button 
                            onClick={() => handleConcluirCorte(item.id)}
                            style={{ padding: "6px 12px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                          >
                            Concluir
                          </button>
                        )}

                        <button 
                          onClick={() => handleCancelarAdmin(item.id)}
                          style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

    </div>
  );
}