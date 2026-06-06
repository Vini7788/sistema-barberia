import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const indiceMes = (nome) => MESES.indexOf(nome) + 1;
const pertenceAoFiltro = (dataHorario, mes, ano) => {
  if (!dataHorario || typeof dataHorario !== "string") return false;
  const [dataStr] = dataHorario.split("T");
  const [anoAg, mesAg] = dataStr.split("-").map(Number);
  return anoAg === Number(ano) && mesAg === indiceMes(mes);
};

const injectStyles = () => {
  if (document.getElementById("dash-styles")) return;
  const s = document.createElement("style");
  s.id = "dash-styles";
  s.textContent = `
    .dash-card {
      background: #fff;
      border: 1.5px solid var(--grey-100, #ebebeb);
      border-radius: 16px;
      padding: 24px;
    }
    .dash-select {
      padding: 8px 14px;
      border: 1.5px solid var(--grey-200, #d6d6d6);
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: var(--black, #111);
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .dash-select:focus { border-color: var(--black, #111); }
    .dash-btn {
      font-size: 13px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.02em;
    }
    .dash-btn-concluir { background: #d8f3dc; color: #2d6a4f; }
    .dash-btn-concluir:hover { background: #b7e4c7; }
    .dash-btn-excluir { background: #fde8e8; color: #c1121f; }
    .dash-btn-excluir:hover { background: #fcd5d7; }
    .dash-btn-gerar {
      background: var(--black, #111);
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
    }
    .dash-btn-gerar:hover { opacity: 0.85; }
    .dash-input-date {
      padding: 9px 14px;
      border: 1.5px solid var(--grey-200, #d6d6d6);
      border-radius: 8px;
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: var(--black, #111);
      outline: none;
      transition: border-color 0.2s;
    }
    .dash-input-date:focus { border-color: var(--black, #111); }
    .dash-tab {
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      color: var(--grey-400, #9a9a9a);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      transition: all 0.2s;
    }
    .dash-tab.active { color: var(--black, #111); border-bottom-color: var(--black, #111); }
    .dash-tab:hover { color: var(--black, #111); }
    @media (max-width: 700px) {
      .dash-outer { padding: 20px 16px !important; }
      .dash-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
      .dash-filtros { flex-wrap: wrap !important; }
      .dash-cards { grid-template-columns: 1fr 1fr !important; }
      .dash-tabela { font-size: 13px !important; }
    }
    @media (max-width: 480px) {
      .dash-cards { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(s);
};

export default function Dashboard() {
  useEffect(() => { injectStyles(); }, []);

  const { usuarioLogado, role } = useAuth();
  const eDono = role === "dono";
  const uidBarbeiro = usuarioLogado?.uid;

  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros]       = useState([]);
  const [servicos, setServicos]         = useState([]);
  const [carregando, setCarregando]     = useState(true);

  // Filtro mês/ano
  const anoAtual = new Date().getFullYear();
  const mesAtual = MESES[new Date().getMonth()];
  const [mesFiltro, setMesFiltro] = useState(mesAtual);
  const [anoFiltro, setAnoFiltro] = useState(String(anoAtual));
  const anos = [String(anoAtual - 1), String(anoAtual), String(anoAtual + 1)];

  // Relatório
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim]       = useState("");
  const [relatorio, setRelatorio]         = useState(null);

  // Aba tabela
  const [abaTabela, setAbaTabela] = useState("pendentes");

  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregando(true);
        const snapB = await getDocs(collection(db, "profissionais"));
        const listaB = []; snapB.forEach((d) => listaB.push({ id: d.id, ...d.data() }));
        setBarbeiros(listaB);
        const snapS = await getDocs(collection(db, "servicos"));
        const listaS = []; snapS.forEach((d) => listaS.push({ id: d.id, ...d.data() }));
        setServicos(listaS);
        const snapA = await getDocs(collection(db, "agendamentos"));
        const listaA = []; snapA.forEach((d) => listaA.push({ id: d.id, ...d.data() }));
        listaA.sort((a, b) => new Date(a.dataHorario) - new Date(b.dataHorario));
        setAgendamentos(listaA);
      } catch (err) { console.error(err); }
      finally { setCarregando(false); }
    };
    carregar();
  }, []);

  const handleConcluir = async (id) => {
    try {
      await updateDoc(doc(db, "agendamentos", id), { status: "concluido" });
      setAgendamentos((p) => p.map((i) => i.id === id ? { ...i, status: "concluido" } : i));
    } catch (err) { console.error(err); }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este agendamento?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos((p) => p.filter((i) => i.id !== id));
    } catch (err) { console.error(err); }
  };

  const nomeBarbeiro  = (id) => barbeiros.find((b) => b.id === id)?.nome || "—";
  const nomeServico   = (id) => servicos.find((s) => s.id === id)?.nome || "Serviço";
  const precoServico  = (id) => Number(servicos.find((s) => s.id === id)?.preco || 0);

  const formatarData = (ds) => {
    if (!ds) return "—";
    try {
      const [data, hora] = ds.split("T");
      const [ano, mes, dia] = data.split("-");
      const diasSem = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
      return { data: `${diasSem[new Date(ds).getDay()]}, ${dia}/${mes}`, hora: hora?.substring(0,5) };
    } catch { return { data: "—", hora: "—" }; }
  };

  // Dados filtrados
  const agFiltrados = agendamentos.filter((ag) => {
    const noMes = pertenceAoFiltro(ag.dataHorario, mesFiltro, anoFiltro);
    if (!noMes) return false;
    if (!eDono) return ag.barbeiroId === uidBarbeiro;
    return true;
  });

  const concluidos = agFiltrados.filter((i) => i.status === "concluido");
  const pendentes  = agFiltrados.filter((i) => i.status !== "concluido");
  const faturamento = concluidos.reduce((acc, i) => acc + precoServico(i.servicoId), 0);

  const dadosGrafico = barbeiros.map((b) => ({
    nome: b.nome.split(" ")[0],
    qtd: agendamentos.filter((ag) => ag.barbeiroId === b.id && ag.status === "concluido" && pertenceAoFiltro(ag.dataHorario, mesFiltro, anoFiltro)).length,
  }));
  const maxGrafico = Math.max(...dadosGrafico.map((d) => d.qtd), 1);

  const META = 30;
  const pctMeta = Math.min(Math.round((concluidos.length / META) * 100), 100);
  const nomeBarbeiroLogado = barbeiros.find((b) => b.id === uidBarbeiro)?.nome?.split(" ")[0] || "Barbeiro";

  const gerarRelatorio = () => {
    if (!periodoInicio || !periodoFim) { alert("Selecione início e fim."); return; }
    if (periodoInicio > periodoFim) { alert("Data início deve ser anterior à fim."); return; }
    const agP = agendamentos.filter((ag) => { if (!ag.dataHorario) return false; const d = ag.dataHorario.split("T")[0]; return d >= periodoInicio && d <= periodoFim; });
    const concP = agP.filter((i) => i.status === "concluido");
    setRelatorio({
      faturamento: concP.reduce((acc, i) => acc + precoServico(i.servicoId), 0),
      totalConcluidos: concP.length,
      totalPendentes: agP.filter((i) => i.status !== "concluido").length,
      totalAgendamentos: agP.length,
      porBarbeiro: barbeiros.map((b) => { const c = concP.filter((ag) => ag.barbeiroId === b.id); return { nome: b.nome, cortes: c.length, fat: c.reduce((a, i) => a + precoServico(i.servicoId), 0) }; }).filter((b) => b.cortes > 0),
      porServico: servicos.map((s) => { const it = concP.filter((ag) => ag.servicoId === s.id); return { nome: s.nome, qtd: it.length, fat: it.length * Number(s.preco) }; }).filter((s) => s.qtd > 0),
    });
  };

  // Linhas da tabela por aba
  const linhasTabela = abaTabela === "pendentes" ? pendentes : concluidos;

  const labelFiltro = `${mesFiltro} ${anoFiltro}`;

  return (
    <div className="dash-outer" style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* HEADER */}
      <div className="dash-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
            {eDono ? "Painel Administrativo" : "Minha Agenda"}
          </p>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--black, #111)", letterSpacing: "-0.02em", margin: 0 }}>
            {eDono ? "Dashboard" : `Olá, ${nomeBarbeiroLogado}`}
          </h1>
        </div>

        {/* Filtros */}
        <div className="dash-filtros" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <select className="dash-select" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
            {MESES.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="dash-select" value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)}>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* CARDS */}
      <div className="dash-cards" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>

        {eDono && (
          <div className="dash-card" style={{ borderTop: "3px solid #2d6a4f" }}>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px 0" }}>Faturamento</p>
            <p style={{ fontSize: "26px", fontWeight: "700", color: "var(--black, #111)", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
              {carregando ? "..." : `R$ ${faturamento.toFixed(2).replace(".", ",")}`}
            </p>
            <p style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>{labelFiltro}</p>
          </div>
        )}

        <div className="dash-card" style={{ borderTop: "3px solid #111" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px 0" }}>Concluídos</p>
          <p style={{ fontSize: "26px", fontWeight: "700", color: "var(--black, #111)", margin: "0 0 4px 0" }}>{carregando ? "..." : concluidos.length}</p>
          <p style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>{labelFiltro}</p>
        </div>

        <div className="dash-card" style={{ borderTop: "3px solid #f4a261" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px 0" }}>Pendentes</p>
          <p style={{ fontSize: "26px", fontWeight: "700", color: "var(--black, #111)", margin: "0 0 4px 0" }}>{carregando ? "..." : pendentes.length}</p>
          <p style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>{labelFiltro}</p>
        </div>

        <div className="dash-card" style={{ borderTop: "3px solid #457b9d" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px 0" }}>Próximo</p>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--black, #111)", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pendentes[0] ? pendentes[0].clientEmail?.split("@")[0] : "—"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>
            {pendentes[0] ? formatarData(pendentes[0].dataHorario).hora : "Sem pendentes"}
          </p>
        </div>
      </div>

      {/* GRÁFICO (dono) */}
      {eDono && (
        <div className="dash-card" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px 0" }}>Desempenho da Equipe</p>
              <p style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>Cortes concluídos · {labelFiltro}</p>
            </div>
          </div>
          {dadosGrafico.every((d) => d.qtd === 0) ? (
            <p style={{ textAlign: "center", color: "var(--grey-400, #9a9a9a)", padding: "30px 0", fontSize: "14px" }}>Nenhum corte concluído em {labelFiltro}</p>
          ) : (
            <div style={{ display: "flex", gap: "20px", alignItems: "flex-end", height: "160px", paddingBottom: "16px", borderBottom: "1px solid var(--grey-100, #ebebeb)", justifyContent: "center" }}>
              {dadosGrafico.map((item, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px" }}>
                  <span style={{ fontWeight: "700", fontSize: "14px", marginBottom: "6px", color: "var(--black, #111)" }}>{item.qtd}</span>
                  <div style={{ width: "40px", height: `${item.qtd === 0 ? 4 : (item.qtd / maxGrafico) * 110}px`, backgroundColor: i % 2 === 0 ? "#111" : "#d6d6d6", borderRadius: "6px 6px 0 0", transition: "height 0.4s ease" }} />
                  <span style={{ marginTop: "10px", fontSize: "12px", color: "var(--grey-600, #555)", fontWeight: "600" }}>{item.nome}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* META (barbeiro) */}
      {!eDono && (
        <div className="dash-card" style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px 0" }}>Meta Mensal</p>
          <p style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", margin: "0 0 20px 0" }}>{concluidos.length} de {META} cortes · {labelFiltro}</p>
          <div style={{ backgroundColor: "var(--grey-100, #ebebeb)", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "10px" }}>
            <div style={{ height: "100%", width: `${pctMeta}%`, backgroundColor: pctMeta >= 100 ? "#2d6a4f" : pctMeta >= 60 ? "#111" : "#f4a261", borderRadius: "999px", transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "var(--grey-400, #9a9a9a)" }}>{pctMeta}% atingido</span>
            <span style={{ fontWeight: "700", color: pctMeta >= 100 ? "#2d6a4f" : "var(--black, #111)" }}>
              {pctMeta >= 100 ? "✓ Meta batida!" : `Faltam ${META - concluidos.length}`}
            </span>
          </div>
        </div>
      )}

      {/* RELATÓRIO POR PERÍODO (dono) */}
      {eDono && (
        <div className="dash-card" style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px 0" }}>Relatório por Período</p>
          <p style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", margin: "0 0 20px 0" }}>Selecione um intervalo para gerar o relatório detalhado</p>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: relatorio ? "28px" : "0" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--grey-600, #555)", letterSpacing: "0.04em" }}>Início</label>
              <input type="date" className="dash-input-date" value={periodoInicio} onChange={(e) => { setPeriodoInicio(e.target.value); setRelatorio(null); }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--grey-600, #555)", letterSpacing: "0.04em" }}>Fim</label>
              <input type="date" className="dash-input-date" value={periodoFim} onChange={(e) => { setPeriodoFim(e.target.value); setRelatorio(null); }} />
            </div>
            <button className="dash-btn dash-btn-gerar" onClick={gerarRelatorio}>Gerar</button>
          </div>

          {relatorio && (
            <div>
              <p style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", marginBottom: "16px" }}>
                {periodoInicio.split("-").reverse().join("/")} → {periodoFim.split("-").reverse().join("/")}
              </p>

              {/* Cards resumo */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                {[
                  { label: "Faturamento", valor: `R$ ${relatorio.faturamento.toFixed(2).replace(".", ",")}`, cor: "#2d6a4f", bg: "#d8f3dc" },
                  { label: "Concluídos",  valor: relatorio.totalConcluidos, cor: "#111", bg: "#ebebeb" },
                  { label: "Pendentes",   valor: relatorio.totalPendentes, cor: "#f4a261", bg: "#fff3e0" },
                  { label: "Total",       valor: relatorio.totalAgendamentos, cor: "#457b9d", bg: "#e8f4fd" },
                ].map((c) => (
                  <div key={c.label} style={{ backgroundColor: c.bg, borderRadius: "10px", padding: "14px 16px" }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: c.cor, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px 0", opacity: 0.7 }}>{c.label}</p>
                    <p style={{ fontSize: "20px", fontWeight: "700", color: c.cor, margin: 0 }}>{c.valor}</p>
                  </div>
                ))}
              </div>

              {relatorio.totalConcluidos === 0 ? (
                <p style={{ textAlign: "center", color: "var(--grey-400, #9a9a9a)", padding: "16px", fontSize: "14px" }}>Nenhum corte concluído no período.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Por barbeiro */}
                  {relatorio.porBarbeiro.length > 0 && (
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px 0" }}>Por Barbeiro</p>
                      {relatorio.porBarbeiro.map((b) => (
                        <div key={b.nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--grey-100, #ebebeb)" }}>
                          <span style={{ fontSize: "14px", fontWeight: "500" }}>{b.nome}</span>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>R$ {b.fat.toFixed(2).replace(".", ",")}</p>
                            <p style={{ margin: 0, fontSize: "11px", color: "var(--grey-400, #9a9a9a)" }}>{b.cortes} cortes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Por serviço */}
                  {relatorio.porServico.length > 0 && (
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px 0" }}>Por Serviço</p>
                      {relatorio.porServico.map((s) => (
                        <div key={s.nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--grey-100, #ebebeb)" }}>
                          <span style={{ fontSize: "14px", fontWeight: "500" }}>{s.nome}</span>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>R$ {s.fat.toFixed(2).replace(".", ",")}</p>
                            <p style={{ margin: 0, fontSize: "11px", color: "var(--grey-400, #9a9a9a)" }}>{s.qtd}x</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TABELA */}
      <div className="dash-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
            {eDono ? "Agendamentos" : "Meus Agendamentos"}
          </p>
          <span style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", backgroundColor: "var(--grey-100, #ebebeb)", padding: "3px 10px", borderRadius: "999px", fontWeight: "600" }}>
            {labelFiltro}
          </span>
        </div>

        {/* Abas pendentes/concluídos */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--grey-100, #ebebeb)", marginBottom: "20px", marginTop: "8px" }}>
          <button className={`dash-tab ${abaTabela === "pendentes" ? "active" : ""}`} onClick={() => setAbaTabela("pendentes")}>
            Pendentes ({pendentes.length})
          </button>
          <button className={`dash-tab ${abaTabela === "concluidos" ? "active" : ""}`} onClick={() => setAbaTabela("concluidos")}>
            Concluídos ({concluidos.length})
          </button>
        </div>

        {carregando ? (
          <p style={{ textAlign: "center", color: "var(--grey-400, #9a9a9a)", padding: "30px 0", fontSize: "14px" }}>Carregando...</p>
        ) : linhasTabela.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--grey-400, #9a9a9a)", padding: "30px 0", fontSize: "14px" }}>
            Nenhum agendamento {abaTabela === "pendentes" ? "pendente" : "concluído"} em {labelFiltro}.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dash-tabela" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--grey-100, #ebebeb)" }}>
                  {["Cliente", eDono && "Profissional", "Serviço", "Data", "Hora", "Ações"].filter(Boolean).map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasTabela.map((item) => {
                  const { data, hora } = formatarData(item.dataHorario);
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-100, #ebebeb)" }}>
                      <td style={{ padding: "12px 12px", fontSize: "14px", fontWeight: "500", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.clientEmail?.split("@")[0] || "—"}
                      </td>
                      {eDono && (
                        <td style={{ padding: "12px 12px", fontSize: "14px", whiteSpace: "nowrap" }}>{nomeBarbeiro(item.barbeiroId)}</td>
                      )}
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{ backgroundColor: "var(--grey-100, #ebebeb)", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" }}>
                          {nomeServico(item.servicoId)}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", fontSize: "13px", color: "var(--grey-600, #555)", whiteSpace: "nowrap" }}>{data}</td>
                      <td style={{ padding: "12px 12px", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap" }}>{hora}</td>
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {item.status !== "concluido" && (
                            <button className="dash-btn dash-btn-concluir" onClick={() => handleConcluir(item.id)}>Concluir</button>
                          )}
                          {eDono && (
                            <button className="dash-btn dash-btn-excluir" onClick={() => handleExcluir(item.id)}>Excluir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
