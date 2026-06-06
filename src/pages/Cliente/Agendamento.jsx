import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

// ── Estilos globais injetados uma vez ──────────────────
const injectStyles = () => {
  if (document.getElementById("agendamento-styles")) return;
  const style = document.createElement("style");
  style.id = "agendamento-styles";
  style.textContent = `
    .ag-slot {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1.5px solid var(--grey-200, #d6d6d6);
      background: var(--white, #fff);
      color: var(--black, #111);
      transition: all 0.15s ease;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: 0.02em;
    }
    .ag-slot:hover {
      border-color: var(--black, #111);
      background: var(--grey-50, #f5f5f3);
    }
    .ag-slot.selected {
      background: var(--black, #111);
      color: #fff;
      border-color: var(--black, #111);
    }
    .ag-card {
      background: #fff;
      border: 1.5px solid var(--grey-100, #ebebeb);
      border-radius: 12px;
      padding: 18px 20px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
      width: 100%;
      font-family: 'DM Sans', sans-serif;
    }
    .ag-card:hover {
      border-color: var(--black, #111);
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    .ag-card.selected {
      border-color: var(--black, #111);
      background: var(--black, #111);
      color: #fff;
    }
    .ag-input {
      width: 100%;
      padding: 13px 16px;
      border: 1.5px solid var(--grey-200, #d6d6d6);
      border-radius: 8px;
      font-size: 15px;
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: var(--black, #111);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
      appearance: none;
      -webkit-appearance: none;
    }
    .ag-input:focus { border-color: var(--black, #111); }
    .ag-step { opacity: 0; transform: translateY(8px); animation: ag-fade-in 0.25s ease forwards; }
    @keyframes ag-fade-in { to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 600px) {
      .ag-outer { padding: 0 !important; }
      .ag-inner { border-radius: 0 !important; min-height: 100vh !important; }
    }
  `;
  document.head.appendChild(style);
};

export default function Agendamento() {
  useEffect(() => { injectStyles(); }, []);

  const { usuarioLogado } = useAuth();
  const clientEmail = usuarioLogado?.email || "";

  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState(null);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);

  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [horarioEscolhido, setHorarioEscolhido] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [calculandoHorarios, setCalculandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // ── Backend inalterado ─────────────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        const snapB = await getDocs(collection(db, "profissionais"));
        const listaB = [];
        snapB.forEach((d) => listaB.push({ id: d.id, ...d.data() }));
        setBarbeiros(listaB);

        const snapS = await getDocs(collection(db, "servicos"));
        const listaS = [];
        snapS.forEach((d) => listaS.push({ id: d.id, ...d.data() }));
        setServicos(listaS);

        const docH = await getDoc(doc(db, "configuracoes", "horarios"));
        if (docH.exists()) setHorariosFuncionamento(docH.data());

        const snapA = await getDocs(collection(db, "agendamentos"));
        const listaA = [];
        snapA.forEach((d) => listaA.push({ id: d.id, ...d.data() }));
        setAgendamentosExistentes(listaA);
      } catch (err) {
        console.error("Erro ao carregar:", err);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  useEffect(() => {
    if (!barbeiroSelecionado || !servicoSelecionado || !dataSelecionada) {
      setHorariosDisponiveis([]);
      setHorarioEscolhido("");
      return;
    }
    calcularHorariosDisponiveis();
  }, [barbeiroSelecionado, servicoSelecionado, dataSelecionada]);

  const calcularHorariosDisponiveis = () => {
    setCalculandoHorarios(true);
    setHorarioEscolhido("");
    const servico = servicos.find((s) => s.id === servicoSelecionado);
    if (!servico || !servico.duracao) { setHorariosDisponiveis([]); setCalculandoHorarios(false); return; }
    const duracaoMin = Number(servico.duracao);
    const dataObj = new Date(dataSelecionada + "T00:00:00");
    const diaSemana = DIAS_SEMANA[dataObj.getDay()];
    const configDia = horariosFuncionamento?.[diaSemana];
    if (!configDia || !configDia.aberto) { setHorariosDisponiveis([]); setCalculandoHorarios(false); return; }
    const [hAbre, mAbre] = configDia.abertura.split(":").map(Number);
    const [hFecha, mFecha] = configDia.fechamento.split(":").map(Number);
    const minutosAbertura = hAbre * 60 + mAbre;
    const minutosFechamento = hFecha * 60 + mFecha;
    const agendamentosDoDia = agendamentosExistentes.filter((ag) => {
      if (ag.barbeiroId !== barbeiroSelecionado) return false;
      if (!ag.dataHorario) return false;
      return ag.dataHorario.split("T")[0] === dataSelecionada && ag.status !== "cancelado";
    });
    const blocos = agendamentosDoDia.map((ag) => {
      const horaStr = ag.dataHorario.split("T")[1]?.substring(0, 5) || "00:00";
      const [h, m] = horaStr.split(":").map(Number);
      const inicio = h * 60 + m;
      const servicoDoAg = servicos.find((s) => s.id === ag.servicoId);
      const duracaoAg = servicoDoAg?.duracao ? Number(servicoDoAg.duracao) : 30;
      return { inicio, fim: inicio + duracaoAg };
    });
    const slots = [];
    const hoje = new Date();
    const ehHoje = dataSelecionada === hoje.toISOString().split("T")[0];
    const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
    for (let min = minutosAbertura; min + duracaoMin <= minutosFechamento; min += 30) {
      if (ehHoje && min <= minutosAgora) continue;
      const fimSlot = min + duracaoMin;
      if (blocos.some((b) => min < b.fim && fimSlot > b.inicio)) continue;
      const hh = String(Math.floor(min / 60)).padStart(2, "0");
      const mm = String(min % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
    setHorariosDisponiveis(slots);
    setCalculandoHorarios(false);
  };

  const handleSalvarAgendamento = async () => {
    if (!barbeiroSelecionado || !servicoSelecionado || !dataSelecionada || !horarioEscolhido) return;
    try {
      setEnviando(true);
      const dataHorario = `${dataSelecionada}T${horarioEscolhido}`;
      const novoAgendamento = { clientEmail, barbeiroId: barbeiroSelecionado, servicoId: servicoSelecionado, dataHorario, status: "confirmado", criadoEm: new Date().toISOString() };
      const ref = await addDoc(collection(db, "agendamentos"), novoAgendamento);
      setAgendamentosExistentes((p) => [...p, { id: ref.id, ...novoAgendamento }]);
      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        setServicoSelecionado(""); setBarbeiroSelecionado(""); setDataSelecionada("");
        setHorarioEscolhido(""); setHorariosDisponiveis([]);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar agendamento.");
    } finally {
      setEnviando(false);
    }
  };

  const servicoAtual = servicos.find((s) => s.id === servicoSelecionado);
  const barbeiroAtual = barbeiros.find((b) => b.id === barbeiroSelecionado);
  const hoje = new Date().toISOString().split("T")[0];

  // ── Indicador de progresso ────────────────────────────
  const etapa = !servicoSelecionado ? 1 : !barbeiroSelecionado ? 2 : !dataSelecionada ? 3 : !horarioEscolhido ? 4 : 5;

  if (carregando) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--grey-50, #f5f5f3)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "16px", opacity: 0.3 }}>✂</div>
        <p style={{ color: "var(--grey-400, #9a9a9a)", fontSize: "15px", fontFamily: "'DM Sans', sans-serif" }}>Carregando...</p>
      </div>
    </div>
  );

  if (sucesso) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--grey-50, #f5f5f3)", padding: "20px" }}>
      <div style={{ textAlign: "center", maxWidth: "380px" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#d8f3dc", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "32px" }}>✓</div>
        <h2 style={{ fontSize: "26px", fontWeight: "700", color: "var(--black, #111)", marginBottom: "12px", letterSpacing: "-0.02em", fontFamily: "'DM Sans', sans-serif" }}>Agendado!</h2>
        <p style={{ color: "var(--grey-400, #9a9a9a)", fontSize: "15px", lineHeight: "1.6", fontFamily: "'DM Sans', sans-serif" }}>
          Seu horário com <strong style={{ color: "var(--black, #111)" }}>{barbeiroAtual?.nome}</strong> às <strong style={{ color: "var(--black, #111)" }}>{horarioEscolhido}</strong> foi confirmado.
        </p>
      </div>
    </div>
  );

  return (
    <div className="ag-outer" style={{ minHeight: "100vh", backgroundColor: "var(--grey-50, #f5f5f3)", padding: "40px 20px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
      <div className="ag-inner" style={{ width: "100%", maxWidth: "520px", backgroundColor: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div style={{ backgroundColor: "var(--black, #111)", padding: "32px 32px 28px" }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", fontWeight: "500", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }}>
            LEME BARBER
          </p>
          <h1 style={{ color: "#fff", fontSize: "26px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "20px", fontFamily: "'DM Sans', sans-serif" }}>
            Novo Agendamento
          </h1>

          {/* Barra de progresso */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[1,2,3,4].map((n) => (
              <div key={n} style={{ flex: 1, height: "3px", borderRadius: "999px", backgroundColor: etapa > n ? "#fff" : etapa === n ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)", transition: "background-color 0.3s" }} />
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "8px", fontFamily: "'DM Sans', sans-serif" }}>
            Passo {Math.min(etapa, 4)} de 4
          </p>
        </div>

        {/* Corpo */}
        <div style={{ padding: "32px" }}>

          {/* ETAPA 1 — Serviço */}
          <div className="ag-step" style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>
              01 — Serviço
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {servicos.map((s) => (
                <button key={s.id} type="button"
                  className={`ag-card ${servicoSelecionado === s.id ? "selected" : ""}`}
                  onClick={() => { setServicoSelecionado(s.id); setBarbeiroSelecionado(""); setDataSelecionada(""); setHorarioEscolhido(""); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: "600", fontSize: "15px", margin: "0 0 3px 0" }}>{s.nome}</p>
                      <p style={{ fontSize: "13px", opacity: 0.6, margin: 0 }}>{s.duracao} min</p>
                    </div>
                    <span style={{ fontWeight: "700", fontSize: "16px" }}>
                      R$ {Number(s.preco).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ETAPA 2 — Barbeiro */}
          {servicoSelecionado && (
            <div className="ag-step" style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>
                02 — Profissional
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
                {barbeiros.map((b) => (
                  <button key={b.id} type="button"
                    className={`ag-card ${barbeiroSelecionado === b.id ? "selected" : ""}`}
                    onClick={() => { setBarbeiroSelecionado(b.id); setDataSelecionada(""); setHorarioEscolhido(""); }}
                    style={{ textAlign: "center", padding: "20px 12px" }}>
                    {/* Foto do barbeiro — substitua pelo src real */}
                    {<img src={`/img/barbeiros/${b.id}.png`} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",marginBottom:10}} />}
                    <p style={{ fontWeight: "600", fontSize: "14px", margin: 0 }}>{b.nome}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ETAPA 3 — Data */}
          {barbeiroSelecionado && (
            <div className="ag-step" style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>
                03 — Data
              </label>
              <input type="date" className="ag-input" value={dataSelecionada} min={hoje}
                onChange={(e) => { setDataSelecionada(e.target.value); setHorarioEscolhido(""); }} />
            </div>
          )}

          {/* ETAPA 4 — Horários */}
          {dataSelecionada && (
            <div className="ag-step" style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>
                04 — Horário {servicoAtual && <span style={{ fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>· {servicoAtual.duracao} min</span>}
              </label>

              {calculandoHorarios ? (
                <p style={{ color: "var(--grey-400, #9a9a9a)", fontSize: "14px", fontFamily: "'DM Sans', sans-serif" }}>Verificando disponibilidade...</p>
              ) : horariosDisponiveis.length === 0 ? (
                <div style={{ padding: "16px 20px", backgroundColor: "var(--grey-50, #f5f5f3)", borderRadius: "10px", border: "1.5px solid var(--grey-100, #ebebeb)" }}>
                  <p style={{ color: "var(--grey-600, #555)", fontSize: "14px", margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    Sem horários disponíveis neste dia. Tente outra data.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {horariosDisponiveis.map((hora) => (
                    <button key={hora} type="button"
                      className={`ag-slot ${horarioEscolhido === hora ? "selected" : ""}`}
                      onClick={() => setHorarioEscolhido(hora)}>
                      {hora}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          {horarioEscolhido && (
            <div className="ag-step" style={{ backgroundColor: "var(--grey-50, #f5f5f3)", borderRadius: "12px", padding: "20px", marginBottom: "24px", border: "1.5px solid var(--grey-100, #ebebeb)" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" }}>
                Resumo
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "Serviço", valor: servicoAtual?.nome },
                  { label: "Profissional", valor: barbeiroAtual?.nome },
                  { label: "Data", valor: dataSelecionada.split("-").reverse().join("/") },
                  { label: "Horário", valor: horarioEscolhido },
                  { label: "Valor", valor: `R$ ${Number(servicoAtual?.preco).toFixed(2).replace(".", ",")}` },
                ].map(({ label, valor }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--black, #111)", fontFamily: "'DM Sans', sans-serif" }}>{valor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão confirmar */}
          <button onClick={handleSalvarAgendamento}
            disabled={enviando || !horarioEscolhido}
            style={{
              width: "100%", padding: "15px",
              backgroundColor: horarioEscolhido ? "var(--black, #111)" : "var(--grey-200, #d6d6d6)",
              color: horarioEscolhido ? "#fff" : "var(--grey-400, #9a9a9a)",
              border: "none", borderRadius: "10px",
              fontSize: "15px", fontWeight: "600",
              cursor: horarioEscolhido ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              letterSpacing: "0.02em",
              fontFamily: "'DM Sans', sans-serif",
            }}>
            {enviando ? "Confirmando..." : "Confirmar Agendamento"}
          </button>

        </div>
      </div>
    </div>
  );
}
