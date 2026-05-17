import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";

export default function Dashboard() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mesFaturamento, setMesFaturamento] = useState("Maio");

  const carregarDadosDashboard = async () => {
    try {
      setCarregando(true);
      setErro("");

      // 1. Buscar Barbeiros/Profissionais do Firebase
      const queryBarbeiros = await getDocs(collection(db, "profissionais"));
      const listaBarbeiros = [];
      queryBarbeiros.forEach((doc) => {
        listaBarbeiros.push({ id: doc.id, ...doc.data() });
      });
      if (listaBarbeiros.length === 0) {
        listaBarbeiros.push(
          { id: "b9InIZOqbHXTYHL3VeTa", nome: "Alan (Cabelo & Barba)" },
          { id: "barbeiro_2", nome: "Vitor (Especialista em Degradê)" }
        );
      }
      setBarbeiros(listaBarbeiros);

      // 2. Buscar Serviços do Firebase
      const queryServicos = await getDocs(collection(db, "servicos"));
      const listaServicos = [];
      queryServicos.forEach((doc) => {
        listaServicos.push({ id: doc.id, ...doc.data() });
      });
      if (listaServicos.length === 0) {
        listaServicos.push(
          { id: "servico_1", nome: "Corte Masculino", preco: 45.00 },
          { id: "servico_2", nome: "Barba Completa", preco: 35.00 },
          { id: "servico_3", nome: "Combo (Cabelo + Barba)", preco: 70.00 }
        );
      }
      setServicos(listaServicos);

      // 3. Buscar Agendamentos
      const querySnapshot = await getDocs(collection(db, "agendamentos"));
      const listaAgendamentos = [];
      querySnapshot.forEach((documento) => {
        listaAgendamentos.push({
          id: documento.id,
          ...documento.data()
        });
      });

      listaAgendamentos.sort((a, b) => {
        if (!a.dataHorario || typeof a.dataHorario !== "string") return 1;
        if (!b.dataHorario || typeof b.dataHorario !== "string") return -1;
        return new Date(a.dataHorario) - new Date(b.dataHorario);
      });

      setAgendamentos(listaAgendamentos);
    } catch (error) {
      console.error("Erro no Dashboard:", error);
      setErro("Não foi possível carregar os dados dinâmicos.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosDashboard();
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
    }
  };

  const handleCancelarAdmin = async (id) => {
    if (!window.confirm("Deseja realmente excluir este agendamento?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos(agendamentos.filter(item => item.id !== id));
      alert("Agendamento removido!");
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  const obterNomeBarbeiro = (id) => {
    const encontrado = barbeiros.find(b => b.id === id);
    return encontrado ? encontrado.nome : id || "Não selecionado";
  };

  const obterNomeServico = (id) => {
    const encontrado = servicos.find(s => s.id === id);
    return encontrado ? encontrado.nome : "Serviço Geral";
  };

  const obterPrecoServico = (id) => {
    const encontrado = servicos.find(s => s.id === id);
    return encontrado ? Number(encontrado.preco) : 45.00;
  };

  const formatarData = (dataString) => {
    if (!dataString || typeof dataString !== "string") return "Data não definida";
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

  // ================= CÁLCULOS TOTAIS DINÂMICOS =================
  const agendamentosConcluidos = agendamentos.filter(item => item.status === "concluido");
  const totalPendentes = agendamentos.filter(item => item.status !== "concluido").length;
  const proximoClienteAgendado = agendamentos.find(item => item.status !== "concluido");

  const faturamentoTotal = agendamentosConcluidos.reduce((acc, item) => {
    return acc + obterPrecoServico(item.servicoId);
  }, 0);

  // ================= GRÁFICO 100% DINÂMICO =================
  // Mapeia os barbeiros do Firebase e conta os agendamentos concluídos de cada um deles
  const dadosGraficoDinamico = barbeiros.map((barbeiro) => {
    const quantidadeCortes = agendamentosConcluidos.filter(
      (item) => item.barbeiroId === barbeiro.id
    ).length;
    return {
      nome: barbeiro.nome.split(" ")[0], // Pega só o primeiro nome para não quebrar o layout
      quantidade: quantidadeCortes
    };
  });

  // Encontra o maior valor para definir a proporção da altura das barras (mínimo 1 para evitar divisão por zero)
  const maiorQuantidadeGrafico = Math.max(...dadosGraficoDinamico.map(d => d.quantidade), 1);

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #eee", paddingBottom: "15px" }}>
        <h2 style={{ margin: "0", color: "#111" }}>📈 Painel Administrativo</h2>
        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold", fontSize: "14px" }}>Faturamento de:</label>
          <select value={mesFaturamento} onChange={(e) => setMesFaturamento(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", fontWeight: "bold" }}>
            <option value="Maio">Maio</option>
          </select>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #28a745" }}>
          <span style={{ fontSize: "14px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>Faturamento Real ({mesFaturamento})</span>
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

      {/* GRÁFICO DINÂMICO DE ATENDIMENTOS */}
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase" }}>Desempenho da Equipe (Cortes Concluídos)</h3>
        <div style={{ display: "flex", gap: "40px", alignItems: "flex-end", height: "200px", paddingBottom: "20px", borderBottom: "2px solid #eee", justifyContent: "center" }}>
          
          {dadosGraficoDinamico.map((barbeiroGrafico, index) => {
            // Calcula a altura proporcional da barra (máximo de 140px)
            const alturaBarra = (barbeiroGrafico.quantidade / maiorQuantidadeGrafico) * 140;
            
            return (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
                <span style={{ fontWeight: "bold", marginBottom: "5px" }}>{barbeiroGrafico.quantidade}</span>
                <div 
                  style={{ 
                    width: "100%", 
                    height: `${barbeiroGrafico.quantidade === 0 ? 6 : alturaBarra}px`, 
                    backgroundColor: index % 2 === 0 ? "#111" : "#555", 
                    borderRadius: "6px 6px 0 0",
                    transition: "height 0.3s ease" 
                  }}
                ></div>
                <span style={{ marginTop: "10px", fontSize: "13px", color: "#555", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                  {barbeiroGrafico.nome}
                </span>
              </div>
            );
          })}

        </div>
      </div>

      {/* TABELA GERENCIADORA */}
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase" }}>Gerenciador de Horários</h3>

        {carregando ? (
          <p style={{ textAlign: "center", color: "#999" }}>Atualizando painel...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#111", color: "#fff" }}>
                  <th style={{ padding: "12px 15px" }}>Cliente</th>
                  <th style={{ padding: "12px 15px" }}>Profissional</th>
                  <th style={{ padding: "12px 15px" }}>Serviço</th>
                  <th style={{ padding: "12px 15px" }}>Data e Horário</th>
                  <th style={{ padding: "12px 15px" }}>Status</th>
                  <th style={{ padding: "12px 15px", textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee", backgroundColor: item.status === "concluido" ? "#f8f9fa" : "transparent" }}>
                    <td style={{ padding: "12px 15px", fontSize: "14px", color: "#333" }}>{item.clientEmail || "Não informado"}</td>
                    <td style={{ padding: "12px 15px", fontWeight: "500" }}>{obterNomeBarbeiro(item.barbeiroId)}</td>
                    <td style={{ padding: "12px 15px", fontSize: "13px", color: "#666" }}>
                      <span style={{ backgroundColor: "#eee", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                        {obterNomeServico(item.servicoId)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 15px", color: "#555" }}>{formatarData(item.dataHorario)}</td>
                    <td style={{ padding: "12px 15px" }}>
                      {item.status === "concluido" ? (
                        <span style={{ color: "#28a745", fontWeight: "bold" }}>✅ Concluído</span>
                      ) : (
                        <span style={{ color: "#007bff", fontWeight: "bold" }}>🗓️ Confirmado</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 15px", display: "flex", gap: "10px", justifyContent: "center" }}>
                      {item.status !== "concluido" && (
                        <button onClick={() => handleConcluirCorte(item.id)} style={{ padding: "6px 12px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                          Concluir
                        </button>
                      )}
                      <button onClick={() => handleCancelarAdmin(item.id)} style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}