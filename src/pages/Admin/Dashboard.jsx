import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Retorna o número do mês (1-12) a partir do nome
const indiceMes = (nome) => MESES.indexOf(nome) + 1;

// Verifica se um agendamento pertence ao mês/ano selecionado
const pertenceAoFiltro = (dataHorario, mes, ano) => {
  if (!dataHorario || typeof dataHorario !== "string") return false;
  const [dataStr] = dataHorario.split("T");
  const [anoAg, mesAg] = dataStr.split("-").map(Number);
  return anoAg === Number(ano) && mesAg === indiceMes(mes);
};

export default function Dashboard() {
  const { usuarioLogado, role } = useAuth();
  const eDono = role === "dono";
  const uidBarbeiro = usuarioLogado?.uid;

  const [agendamentos, setAgendamentos]   = useState([]);
  const [barbeiros, setBarbeiros]         = useState([]);
  const [servicos, setServicos]           = useState([]);
  const [carregando, setCarregando]       = useState(true);

  // ── Filtro mês/ano ────────────────────────────────────
  const anoAtual = new Date().getFullYear();
  const mesAtual = MESES[new Date().getMonth()];
  const [mesFiltro, setMesFiltro]   = useState(mesAtual);
  const [anoFiltro, setAnoFiltro]   = useState(String(anoAtual));
  const anos = [String(anoAtual - 1), String(anoAtual), String(anoAtual + 1)];

  // ── Relatório por período (só dono) ───────────────────
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim]       = useState("");
  const [relatorio, setRelatorio]         = useState(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const snapB = await getDocs(collection(db, "profissionais"));
      const listaB = [];
      snapB.forEach((d) => listaB.push({ id: d.id, ...d.data() }));
      setBarbeiros(listaB);

      const snapS = await getDocs(collection(db, "servicos"));
      const listaS = [];
      snapS.forEach((d) => listaS.push({ id: d.id, ...d.data() }));
      setServicos(listaS);

      const snapA = await getDocs(collection(db, "agendamentos"));
      const listaA = [];
      snapA.forEach((d) => listaA.push({ id: d.id, ...d.data() }));
      listaA.sort((a, b) => {
        if (!a.dataHorario) return 1;
        if (!b.dataHorario) return -1;
        return new Date(a.dataHorario) - new Date(b.dataHorario);
      });
      setAgendamentos(listaA);
    } catch (err) {
      console.error("Erro no Dashboard:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  // ── Ações ──────────────────────────────────────────────
  const handleConcluirCorte = async (id) => {
    try {
      await updateDoc(doc(db, "agendamentos", id), { status: "concluido" });
      setAgendamentos((p) => p.map((i) => i.id === id ? { ...i, status: "concluido" } : i));
    } catch (err) { console.error(err); }
  };

  const handleCancelarAdmin = async (id) => {
    if (!window.confirm("Deseja realmente excluir este agendamento?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos((p) => p.filter((i) => i.id !== id));
    } catch (err) { console.error(err); }
  };

  // ── Helpers ────────────────────────────────────────────
  const obterNomeBarbeiro  = (id) => barbeiros.find((b) => b.id === id)?.nome || id || "—";
  const obterNomeServico   = (id) => servicos.find((s) => s.id === id)?.nome || "Serviço Geral";
  const obterPrecoServico  = (id) => Number(servicos.find((s) => s.id === id)?.preco || 0);

  const formatarData = (dataString) => {
    if (!dataString || typeof dataString !== "string") return "—";
    try {
      const [data, hora] = dataString.split("T");
      const [ano, mes, dia] = data.split("-");
      return `${dia}/${mes}/${ano} às ${hora?.substring(0,5)}`;
    } catch { return "—"; }
  };

  // ── Agendamentos filtrados por mês/ano e role ─────────
  const agendamentosFiltrados = agendamentos.filter((ag) => {
    const noMes = pertenceAoFiltro(ag.dataHorario, mesFiltro, anoFiltro);
    if (!noMes) return false;
    if (!eDono) return ag.barbeiroId === uidBarbeiro;
    return true;
  });

  const concluidos  = agendamentosFiltrados.filter((i) => i.status === "concluido");
  const pendentes   = agendamentosFiltrados.filter((i) => i.status !== "concluido");
  const proximoCliente = pendentes[0];

  const faturamentoMes = concluidos.reduce((acc, i) => acc + obterPrecoServico(i.servicoId), 0);

  // ── Gráfico (dono) — filtrado por mês/ano ─────────────
  const dadosGrafico = barbeiros.map((b) => ({
    nome: b.nome.split(" ")[0],
    quantidade: agendamentos.filter(
      (ag) => ag.barbeiroId === b.id &&
              ag.status === "concluido" &&
              pertenceAoFiltro(ag.dataHorario, mesFiltro, anoFiltro)
    ).length,
  }));
  const maiorGrafico = Math.max(...dadosGrafico.map((d) => d.quantidade), 1);

  // ── Meta do barbeiro — filtrada por mês/ano ───────────
  const META_MENSAL = 30;
  const cortesFeitos = concluidos.length;
  const percentualMeta = Math.min(Math.round((cortesFeitos / META_MENSAL) * 100), 100);
  const nomeBarbeiroLogado = barbeiros.find((b) => b.id === uidBarbeiro)?.nome?.split(" ")[0] || "Barbeiro";

  // ── Relatório por período ─────────────────────────────
  const gerarRelatorio = () => {
    if (!periodoInicio || !periodoFim) { alert("Selecione a data de início e fim."); return; }
    if (periodoInicio > periodoFim) { alert("A data de início deve ser anterior à data fim."); return; }

    const agPeriodo = agendamentos.filter((ag) => {
      if (!ag.dataHorario) return false;
      const dataAg = ag.dataHorario.split("T")[0];
      return dataAg >= periodoInicio && dataAg <= periodoFim;
    });

    const concPeriodo = agPeriodo.filter((i) => i.status === "concluido");
    const faturamento = concPeriodo.reduce((acc, i) => acc + obterPrecoServico(i.servicoId), 0);

    // Faturamento por barbeiro
    const porBarbeiro = barbeiros.map((b) => {
      const cortes = concPeriodo.filter((ag) => ag.barbeiroId === b.id);
      return {
        nome: b.nome,
        cortes: cortes.length,
        faturamento: cortes.reduce((acc, i) => acc + obterPrecoServico(i.servicoId), 0),
      };
    }).filter((b) => b.cortes > 0);

    // Faturamento por serviço
    const porServico = servicos.map((s) => {
      const itens = concPeriodo.filter((ag) => ag.servicoId === s.id);
      return {
        nome: s.nome,
        quantidade: itens.length,
        faturamento: itens.length * Number(s.preco),
      };
    }).filter((s) => s.quantidade > 0);

    setRelatorio({
      inicio: periodoInicio,
      fim: periodoFim,
      totalAgendamentos: agPeriodo.length,
      totalConcluidos: concPeriodo.length,
      totalPendentes: agPeriodo.filter((i) => i.status !== "concluido").length,
      faturamento,
      porBarbeiro,
      porServico,
    });
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #eee", paddingBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: "0", color: "#111" }}>
            {eDono ? "📈 Painel Administrativo" : `✂️ Minha Agenda — ${nomeBarbeiroLogado}`}
          </h2>
          {!eDono && <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#888" }}>Você está vendo apenas seus agendamentos</p>}
        </div>

        {/* Filtro mês + ano */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <label style={{ fontWeight: "bold", fontSize: "14px" }}>Filtrar por:</label>
          <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", fontWeight: "bold", fontSize: "14px" }}>
            {MESES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", fontWeight: "bold", fontSize: "14px" }}>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>

        {eDono && (
          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #28a745" }}>
            <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>
              Faturamento ({mesFiltro}/{anoFiltro})
            </span>
            <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>
              {carregando ? "R$ ..." : `R$ ${faturamentoMes.toFixed(2).replace(".", ",")}`}
            </h3>
          </div>
        )}

        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #28a745" }}>
          <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>
            {eDono ? "Cortes Concluídos" : "Meus Cortes Concluídos"}
          </span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>{carregando ? "..." : concluidos.length}</h3>
          <span style={{ fontSize: "12px", color: "#aaa" }}>{mesFiltro}/{anoFiltro}</span>
        </div>

        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #007bff" }}>
          <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>
            {eDono ? "Pendentes" : "Meus Pendentes"}
          </span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "28px", color: "#111" }}>{carregando ? "..." : pendentes.length}</h3>
          <span style={{ fontSize: "12px", color: "#aaa" }}>{mesFiltro}/{anoFiltro}</span>
        </div>

        <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: "5px solid #ffc107" }}>
          <span style={{ fontSize: "13px", color: "#777", fontWeight: "bold", textTransform: "uppercase" }}>Próximo Cliente</span>
          <h3 style={{ margin: "10px 0 0 0", fontSize: "15px", color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {proximoCliente ? proximoCliente.clientEmail : "Nenhum pendente"}
          </h3>
          {proximoCliente && <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#999" }}>{formatarData(proximoCliente.dataHorario)}</p>}
        </div>
      </div>

      {/* GRÁFICO — só dono */}
      {eDono && (
        <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>
            Desempenho da Equipe
          </h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#aaa" }}>Cortes concluídos em {mesFiltro}/{anoFiltro}</p>
          <div style={{ display: "flex", gap: "40px", alignItems: "flex-end", height: "200px", paddingBottom: "20px", borderBottom: "2px solid #eee", justifyContent: "center" }}>
            {dadosGrafico.map((item, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
                <span style={{ fontWeight: "bold", marginBottom: "5px" }}>{item.quantidade}</span>
                <div style={{ width: "100%", height: `${item.quantidade === 0 ? 6 : (item.quantidade / maiorGrafico) * 140}px`, backgroundColor: index % 2 === 0 ? "#111" : "#555", borderRadius: "6px 6px 0 0", transition: "height 0.3s ease" }} />
                <span style={{ marginTop: "10px", fontSize: "13px", color: "#555", textAlign: "center" }}>{item.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* META — só barbeiro */}
      {!eDono && (
        <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>🎯 Minha Meta Mensal</h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#999" }}>{cortesFeitos} de {META_MENSAL} cortes em {mesFiltro}/{anoFiltro}</p>
          <div style={{ backgroundColor: "#eee", borderRadius: "999px", height: "14px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${percentualMeta}%`, backgroundColor: percentualMeta >= 100 ? "#28a745" : percentualMeta >= 60 ? "#007bff" : "#ffc107", borderRadius: "999px", transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "13px", color: "#777" }}>
            <span>{percentualMeta}% da meta</span>
            <span style={{ fontWeight: "bold", color: percentualMeta >= 100 ? "#28a745" : "#333" }}>
              {percentualMeta >= 100 ? "✅ Meta batida!" : `Faltam ${META_MENSAL - cortesFeitos} cortes`}
            </span>
          </div>
        </div>
      )}

      {/* RELATÓRIO POR PERÍODO — só dono */}
      {eDono && (
        <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>📊 Relatório de Faturamento por Período</h3>
          <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#aaa" }}>Selecione um intervalo de datas para gerar o relatório</p>

          <div style={{ display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px", fontWeight: "600", color: "#555" }}>
              Data Início
              <input type="date" value={periodoInicio} onChange={(e) => { setPeriodoInicio(e.target.value); setRelatorio(null); }}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px", fontWeight: "600", color: "#555" }}>
              Data Fim
              <input type="date" value={periodoFim} onChange={(e) => { setPeriodoFim(e.target.value); setRelatorio(null); }}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
            </label>
            <button onClick={gerarRelatorio}
              style={{ padding: "9px 24px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", height: "38px" }}>
              Gerar Relatório
            </button>
          </div>

          {relatorio && (
            <div>
              {/* Resumo geral */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", marginBottom: "25px" }}>
                {[
                  { label: "Faturamento", valor: `R$ ${relatorio.faturamento.toFixed(2).replace(".", ",")}`, cor: "#28a745" },
                  { label: "Concluídos", valor: relatorio.totalConcluidos, cor: "#28a745" },
                  { label: "Pendentes", valor: relatorio.totalPendentes, cor: "#ffc107" },
                  { label: "Total Agend.", valor: relatorio.totalAgendamentos, cor: "#007bff" },
                ].map((card) => (
                  <div key={card.label} style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", borderLeft: `4px solid ${card.cor}`, textAlign: "center" }}>
                    <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#777", textTransform: "uppercase", fontWeight: "bold" }}>{card.label}</p>
                    <p style={{ margin: 0, fontSize: "22px", fontWeight: "bold", color: "#111" }}>{card.valor}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "15px" }}>
                Período: <strong>{periodoInicio.split("-").reverse().join("/")} até {periodoFim.split("-").reverse().join("/")}</strong>
              </p>

              {/* Por barbeiro */}
              {relatorio.porBarbeiro.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "13px", color: "#444", textTransform: "uppercase", marginBottom: "10px" }}>Por Barbeiro</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ backgroundColor: "#111", color: "#fff" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "13px" }}>Barbeiro</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "13px" }}>Cortes</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "13px" }}>Faturamento</th>
                    </tr></thead>
                    <tbody>
                      {relatorio.porBarbeiro.map((b) => (
                        <tr key={b.nome} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "10px 12px", fontWeight: "500" }}>{b.nome}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{b.cortes}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#28a745", fontWeight: "bold" }}>R$ {b.faturamento.toFixed(2).replace(".", ",")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Por serviço */}
              {relatorio.porServico.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", color: "#444", textTransform: "uppercase", marginBottom: "10px" }}>Por Serviço</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ backgroundColor: "#111", color: "#fff" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "13px" }}>Serviço</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "13px" }}>Qtd.</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "13px" }}>Faturamento</th>
                    </tr></thead>
                    <tbody>
                      {relatorio.porServico.map((s) => (
                        <tr key={s.nome} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "10px 12px", fontWeight: "500" }}>{s.nome}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>{s.quantidade}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#28a745", fontWeight: "bold" }}>R$ {s.faturamento.toFixed(2).replace(".", ",")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {relatorio.totalConcluidos === 0 && (
                <p style={{ textAlign: "center", color: "#999", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>
                  Nenhum corte concluído neste período.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TABELA */}
      <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>
          {eDono ? "Gerenciador de Horários" : "Meus Agendamentos"}
        </h3>
        <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#aaa" }}>{mesFiltro}/{anoFiltro}</p>

        {carregando ? (
          <p style={{ textAlign: "center", color: "#999" }}>Carregando...</p>
        ) : agendamentosFiltrados.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>
            Nenhum agendamento em {mesFiltro}/{anoFiltro}.
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
                {agendamentosFiltrados.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #eee", backgroundColor: item.status === "concluido" ? "#f8f9fa" : "transparent" }}>
                    <td style={{ padding: "12px 15px", fontSize: "14px", color: "#333" }}>{item.clientEmail || "—"}</td>
                    {eDono && <td style={{ padding: "12px 15px", fontWeight: "500" }}>{obterNomeBarbeiro(item.barbeiroId)}</td>}
                    <td style={{ padding: "12px 15px" }}>
                      <span style={{ backgroundColor: "#eee", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold", fontSize: "13px" }}>
                        {obterNomeServico(item.servicoId)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 15px", color: "#555", fontSize: "14px" }}>{formatarData(item.dataHorario)}</td>
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
