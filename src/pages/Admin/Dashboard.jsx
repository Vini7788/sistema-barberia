import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function Dashboard() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [faturamentoTotal, setFaturamentoTotal] = useState(0);
  const [totalCortesAtivos, setTotalCortesAtivos] = useState(0);
  const [totalCancelados, setTotalCancelados] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const carregarDadosDash = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "agendamentos"));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar para mostrar os mais recentes primeiro na tabela
      lista.sort((a, b) => b.dataHorario?.seconds - a.dataHorario?.seconds);
      setAgendamentos(lista);

      // 📊 METRICAS ATUALIZADAS:
      let faturamento = 0;
      let ativos = 0;
      let cancelados = 0;

      lista.forEach((agend) => {
        if (agend.status === "concluido") {
          // O dinheiro só entra no caixa se o serviço foi CONCLUÍDO
          faturamento += Number(agend.preco || 0);
        } else if (agend.status === "confirmado") {
          // Se está confirmado, é um cliente que ainda vai aparecer na barbearia
          ativos++;
        } else if (agend.status === "cancelado") {
          cancelados++;
        }
      });

      setFaturamentoTotal(faturamento);
      setTotalCortesAtivos(ativos);
      setTotalCancelados(cancelados);

    } catch (error) {
      console.error("Erro ao processar métricas do dashboard:", error);
    } finally {
      setCarregando(false);
    }
  };

  // 🔥 NOVA FUNÇÃO: Altera o status do documento direto no Firebase
  const alterarStatusItem = async (id, novoStatus) => {
    try {
      const agendamentoRef = doc(db, "agendamentos", id);
      await updateDoc(agendamentoRef, {
        status: novoStatus
      });
      
      alert(`Status atualizado para ${novoStatus.toUpperCase()} com sucesso!`);
      // Recarrega os dados na tela para recalcular os cards de faturamento na hora
      carregarDadosDash();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Não foi possível atualizar o status no banco.");
    }
  };

  useEffect(() => {
    carregarDadosDash();
  }, []);

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2>📈 Painel Administrativo — Barbearia</h2>
      <p style={{ color: "#666" }}>Visão geral do faturamento consolidado e fluxo do estabelecimento.</p>
      <hr />

      {carregando ? (
        <p>Calculando indicadores financeiros...</p>
      ) : (
        <>
          {/* CARDS DE INDICADORES (KPIs) */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
            <div style={{ flex: 1, padding: "20px", backgroundColor: "#d4edda", border: "1px solid #c3e6cb", borderRadius: "8px", textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#155724" }}>💰 Faturamento Real (Concluído)</h4>
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#155724" }}>
                R$ {faturamentoTotal.toFixed(2)}
              </p>
            </div>

            <div style={{ flex: 1, padding: "20px", backgroundColor: "#cce5ff", border: "1px solid #b8daff", borderRadius: "8px", textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#004085" }}>✂️ Clientes Aguardando</h4>
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#004085" }}>
                {totalCortesAtivos}
              </p>
            </div>

            <div style={{ flex: 1, padding: "20px", backgroundColor: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "8px", textAlign: "center" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#721c24" }}>🚨 Horários Cancelados</h4>
              <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#721c24" }}>
                {totalCancelados}
              </p>
            </div>
          </div>

          {/* LISTA DE CONTROLE DO GERENTE */}
          <h3>📋 Fluxo Recente de Clientes</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Cliente</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Serviço</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Preço</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>Status</th>
                <th style={{ padding: "12px", borderBottom: "2px solid #ddd", textAlign: "center" }}>Ações do Gerente</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((agend) => {
                // Definir cor baseada no status para ficar fácil de ler
                let corStatus = "orange";
                if (agend.status === "concluido") corStatus = "green";
                if (agend.status === "cancelado") corStatus = "red";

                return (
                  <tr key={agend.id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "12px" }}>{agend.clienteId}</td>
                    <td style={{ padding: "12px" }}>{agend.servicoNome}</td>
                    <td style={{ padding: "12px" }}>R$ {Number(agend.preco || 0).toFixed(2)}</td>
                    <td style={{ padding: "12px", fontWeight: "bold", color: corStatus }}>
                      {agend.status.toUpperCase()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {agend.status === "confirmado" ? (
                        <button
                          onClick={() => alterarStatusItem(agend.id, "concluido")}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                        >
                          ✓ Concluir Serviço
                        </button>
                      ) : (
                        <span style={{ color: "#888", fontSize: "14px", fontStyle: "italic" }}>
                          Sem ações pendentes
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}