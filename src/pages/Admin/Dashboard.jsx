import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Dashboard() {
  const { usuarioLogado, role } = useAuth();

  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mesFaturamento, setMesFaturamento] = useState("Maio");

  const eDono = role === "dono";

  const carregarDadosDashboard = async () => {
    try {
      setCarregando(true);

      // 1. Barbeiros
      const queryBarbeiros = await getDocs(collection(db, "profissionais"));
      const listaBarbeiros = [];
      queryBarbeiros.forEach((d) => listaBarbeiros.push({ id: d.id, ...d.data() }));
      setBarbeiros(listaBarbeiros);

      // 2. Serviços
      const queryServicos = await getDocs(collection(db, "servicos"));
      const listaServicos = [];
      queryServicos.forEach((d) => listaServicos.push({ id: d.id, ...d.data() }));
      setServicos(listaServicos);

      // 3. Agendamentos
      const querySnapshot = await getDocs(collection(db, "agendamentos"));
      const listaAgendamentos = [];
      querySnapshot.forEach((documento) => {
        listaAgendamentos.push({ id: documento.id, ...documento.data() });
      });

      listaAgendamentos.sort((a, b) => {
        if (!a.dataHorario) return 1;
        if (!b.dataHorario) return -1;
        return new Date(a.dataHorario) - new Date(b.dataHorario);
      });

      setAgendamentos(listaAgendamentos);
    } catch (error) {
      console.error("Erro no Dashboard:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  // ── Ações ──────────────────────────────────────────────
  const handleConcluirCorte = async (id) => {
    try {
      await updateDoc(doc(db, "agendamentos", id), { status: "concluido" });
      setAgendamentos((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: "concluido" } : item)
      );
    } catch (error) {
      console.error("Erro ao concluir corte:", error);
    }
  };

  const handleCancelarAdmin = async (id) => {
    if (!window.confirm("Deseja realmente excluir este agendamento?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const obterNomeBarbeiro = (id) => {
    const b = barbeiros.find((b) => b.id === id);
    return b ? b.nome : id || "Não selecionado";
  };

  const obterNomeServico = (id) => {
    const s = servicos.find((s) => s.id === id);
    return s ? s.nome : "Serviço Geral";
  };

  const obterPrecoServico = (id) => {
    const s = servicos.find((s) => s.id === id);
    return s ? Number(s.preco) : 45.0;
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
    } catch {
      return "Erro no formato";
    }
  };

  // ── Dados filtrados por role ───────────────────────────
  const uidBarbeiro = usuarioLogado?.uid;

  // Agendamentos visíveis: dono vê todos, barbeiro vê só os seus
  const agendamentosVisiveis = eDono
    ? agendamentos
    : agendamentos.filter((item) => item.barbeiroId === uidBarbeiro);

  const concluidosVisiveis = agendamentosVisiveis.filter((i) => i.status === "concluido");
  const pendentesVisiveis  = agendamentosVisiveis.filter((i) => i.status !== "concluido");
  const proximoCliente     = pendentesVisiveis[0];

  // Faturamento (só dono vê)
  const faturamentoTotal = concluidosVisiveis.reduce(
    (acc, item) => acc + obterPrecoServico(item.servicoId), 0
  );

  // ── Gráfico (dono) ─────────────────────────────────────
  const dadosGrafico = barbeiros.map((barbeiro) => ({
    nome: barbeiro.nome.split(" ")[0],
    quantidade: agendamentos.filter(
      (i) => i.barbeiroId === barbeiro.id && i.status === "concluido"
    ).length,
  }));
  const maiorGrafico = Math.max(...dadosGrafico.map((d) => d.quantidade), 1);

  // ── Meta do barbeiro ───────────────────────────────────
  const META_MENSAL = 30;
  const cortesFeitos = concluidosVisiveis.length;
  const percentualMeta = Math.min(Math.round((cortesFeitos / META_MENSAL) * 100), 100);

  // ── Saudação ───────────────────────────────────────────
  const nomeBarbeiroLogado = barbeiros.find((b) => b.id === uidBarbeiro)?.nome?.split(" ")[0] || "Barbeiro";

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #eee", paddingBottom: "15px" }}>
        <div>
          <h2 style={{ margin: "0", color: "#111" }}>
            {eDono ? "📈 Painel Administrativo" : `✂️ Minha Agenda — ${nomeBarbeiroLogado}`}
          </h2>
          {!eDono && (
            <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#888" }}>
              Você está vendo apenas seus agendamentos
            </p>
          )}
        </div>

        {/* Seletor de mês só para o dono */}
        {eDono && (
          <div>
            <label style={{ marginRight: "10px", fontWeight: "bold", fontSize: "14px" }}>Faturamento de:</label>
            <select
              value={mesFaturamento}
              onChange={(e) => setMesFaturamento(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", fontWeight: "bold" }}
            >
              <option>Janeiro</option><option>Fevereiro</option><option>Março</option>
              <option>Abril</option><option>Maio</option><option>Junho</option>
              <option>Julho</option><option>Agosto</option><option>Setembro</option>
              <option>Outubro</option><option>Novembro</option><option>Dezembro</option>
            </select>
          </div>
        )}
      </div>

      {/* CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "40px" }}>

        {/* Faturamento — só dono */}
        {eDono && (
          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #28a745" }}>
            <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>
              Faturamento ({mesFaturamento})
            </span>
            <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>
              {carregando ? "R$ ..." : `R$ ${faturamentoTotal.toFixed(2).replace(".", ",")}`}
            </h3>
          </div>
        )}

        {/* Cortes concluídos */}
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #28a745" }}>
          <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>
            {eDono ? "Cortes Concluídos" : "Meus Cortes Concluídos"}
          </span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>
            {carregando ? "..." : cortesFeitos}
          </h3>
        </div>

        {/* Pendentes */}
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #007bff" }}>
          <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>
            {eDono ? "Agendamentos Pendentes" : "Meus Pendentes"}
          </span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>
            {carregando ? "..." : pendentesVisiveis.length}
          </h3>
        </div>

        {/* Próximo cliente */}
        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #ffc107" }}>
          <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>Próximo Cliente</span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "15px", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {proximoCliente ? proximoCliente.clientEmail : "Nenhum pendente"}
          </h3>
          {proximoCliente && (
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#999" }}>
              {formatarData(proximoCliente.dataHorario)}
            </p>
          )}
        </div>
      </div>

      {/* GRÁFICO — só dono */}
      {eDono && (
        <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>
            Desempenho da Equipe (Cortes Concluídos)
          </h3>
          <div style={{ display: "flex", gap: "40px", alignItems: "flex-end", height: "200px", paddingBottom: "20px", borderBottom: "2px solid #eee", justifyContent: "center" }}>
            {dadosGrafico.map((item, index) => {
              const altura = (item.quantidade / maiorGrafico) * 140;
              return (
                <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
                  <span style={{ fontWeight: "bold", marginBottom: "5px" }}>{item.quantidade}</span>
                  <div style={{ width: "100%", height: `${item.quantidade === 0 ? 6 : altura}px`, backgroundColor: index % 2 === 0 ? "#111" : "#555", borderRadius: "6px 6px 0 0", transition: "height 0.3s ease" }} />
                  <span style={{ marginTop: "10px", fontSize: "13px", color: "#555", textAlign: "center" }}>{item.nome}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CARD DE META — só barbeiro */}
      {!eDono && (
        <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>
            🎯 Minha Meta Mensal
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#999" }}>
            {cortesFeitos} de {META_MENSAL} cortes concluídos
          </p>

          {/* Barra de progresso */}
          <div style={{ backgroundColor: "#eee", borderRadius: "999px", height: "14px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${percentualMeta}%`,
              backgroundColor: percentualMeta >= 100 ? "#28a745" : percentualMeta >= 60 ? "#007bff" : "#ffc107",
              borderRadius: "999px",
              transition: "width 0.5s ease"
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px", color: "#777" }}>
            <span>{percentualMeta}% da meta atingida</span>
            <span style={{ fontWeight: "bold", color: percentualMeta >= 100 ? "#28a745" : "#333" }}>
              {percentualMeta >= 100 ? "✅ Meta batida!" : `Faltam ${META_MENSAL - cortesFeitos} cortes`}
            </span>
          </div>
        </div>
      )}

      {/* TABELA */}
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>
          {eDono ? "Gerenciador de Horários" : "Meus Agendamentos"}
        </h3>

        {carregando ? (
          <p style={{ textAlign: "center", color: "#999" }}>Atualizando painel...</p>
        ) : agendamentosVisiveis.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>
            Nenhum agendamento encontrado.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ backgroundColor: "#111", color: "#fff" }}>
                  <th style={{ padding: "12px 15px" }}>Cliente</th>
                  {eDono && <th style={{ padding: "12px 15px" }}>Profissional</th>}
                  <th style={{ padding: "12px 15px" }}>Serviço</th>
                  <th style={{ padding: "12px 15px" }}>Data e Horário</th>
                  <th style={{ padding: "12px 15px" }}>Status</th>
                  <th style={{ padding: "12px 15px", textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosVisiveis.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee", backgroundColor: item.status === "concluido" ? "#f8f9fa" : "transparent" }}>
                    <td style={{ padding: "12px 15px", fontSize: "14px", color: "#333" }}>{item.clientEmail || "Não informado"}</td>
                    {eDono && <td style={{ padding: "12px 15px", fontWeight: "500" }}>{obterNomeBarbeiro(item.barbeiroId)}</td>}
                    <td style={{ padding: "12px 15px", fontSize: "13px" }}>
                      <span style={{ backgroundColor: "#eee", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                        {obterNomeServico(item.servicoId)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 15px", color: "#555" }}>{formatarData(item.dataHorario)}</td>
                    <td style={{ padding: "12px 15px" }}>
                      {item.status === "concluido"
                        ? <span style={{ color: "#28a745", fontWeight: "bold" }}>✅ Concluído</span>
                        : <span style={{ color: "#007bff", fontWeight: "bold" }}>🗓️ Confirmado</span>}
                    </td>
                    <td style={{ padding: "12px 15px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        {item.status !== "concluido" && (
                          <button onClick={() => handleConcluirCorte(item.id)} style={{ padding: "6px 12px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                            Concluir
                          </button>
                        )}
                        {/* Excluir só para o dono */}
                        {eDono && (
                          <button onClick={() => handleCancelarAdmin(item.id)} style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                            Excluir
                          </button>
                        )}
                      </div>
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
