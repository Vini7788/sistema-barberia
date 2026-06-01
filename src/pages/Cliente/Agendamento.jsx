import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

export default function Agendamento() {
  const { usuarioLogado } = useAuth();
  const clientEmail = usuarioLogado?.email || "";

  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState(null);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);

  // Seleções do cliente
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");

  // Horários disponíveis calculados
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [horarioEscolhido, setHorarioEscolhido] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [calculandoHorarios, setCalculandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);

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

  // Recalcula horários disponíveis sempre que barbeiro, serviço ou data mudar
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

    // Dia fechado
    if (!configDia || !configDia.aberto) { setHorariosDisponiveis([]); setCalculandoHorarios(false); return; }

    const [hAbre, mAbre] = configDia.abertura.split(":").map(Number);
    const [hFecha, mFecha] = configDia.fechamento.split(":").map(Number);
    const minutosAbertura  = hAbre * 60 + mAbre;
    const minutosFechamento = hFecha * 60 + mFecha;

    // Busca agendamentos do barbeiro nesse dia e calcula blocos ocupados
    const agendamentosDoDia = agendamentosExistentes.filter((ag) => {
      if (ag.barbeiroId !== barbeiroSelecionado) return false;
      if (!ag.dataHorario) return false;
      const dataAg = ag.dataHorario.split("T")[0];
      return dataAg === dataSelecionada && ag.status !== "cancelado";
    });

    // Para cada agendamento existente, calcula o intervalo bloqueado
    const blocos = agendamentosDoDia.map((ag) => {
      const horaStr = ag.dataHorario.split("T")[1]?.substring(0, 5) || "00:00";
      const [h, m] = horaStr.split(":").map(Number);
      const inicio = h * 60 + m;
      const servicoDoAg = servicos.find((s) => s.id === ag.servicoId);
      const duracaoAg = servicoDoAg?.duracao ? Number(servicoDoAg.duracao) : 30;
      return { inicio, fim: inicio + duracaoAg };
    });

    // Gera slots de 30 em 30 minutos dentro do horário de funcionamento
    const slots = [];
    const hoje = new Date();
    const ehHoje = dataSelecionada === hoje.toISOString().split("T")[0];
    const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();

    for (let min = minutosAbertura; min + duracaoMin <= minutosFechamento; min += 30) {
      // Se for hoje, não mostrar horários que já passaram
      if (ehHoje && min <= minutosAgora) continue;

      const fimSlot = min + duracaoMin;

      // Verifica se o slot conflita com algum agendamento existente
      const conflito = blocos.some((b) => min < b.fim && fimSlot > b.inicio);
      if (conflito) continue;

      const hh = String(Math.floor(min / 60)).padStart(2, "0");
      const mm = String(min % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }

    setHorariosDisponiveis(slots);
    setCalculandoHorarios(false);
  };

  const handleSalvarAgendamento = async () => {
    if (!barbeiroSelecionado || !servicoSelecionado || !dataSelecionada || !horarioEscolhido) {
      alert("Selecione todos os campos antes de confirmar!");
      return;
    }
    try {
      setEnviando(true);
      const dataHorario = `${dataSelecionada}T${horarioEscolhido}`;
      const novoAgendamento = {
        clientEmail,
        barbeiroId: barbeiroSelecionado,
        servicoId: servicoSelecionado,
        dataHorario,
        status: "confirmado",
        criadoEm: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "agendamentos"), novoAgendamento);
      // Atualiza lista local para bloquear o horário imediatamente
      setAgendamentosExistentes((p) => [...p, { id: ref.id, ...novoAgendamento }]);
      alert("🎉 Agendamento realizado com sucesso!");
      setServicoSelecionado(""); setBarbeiroSelecionado(""); setDataSelecionada("");
      setHorarioEscolhido(""); setHorariosDisponiveis([]);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar agendamento.");
    } finally {
      setEnviando(false);
    }
  };

  const servicoAtual = servicos.find((s) => s.id === servicoSelecionado);

  // Data mínima = hoje
  const hoje = new Date().toISOString().split("T")[0];

  if (carregando) return (
    <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
      <h3>Carregando...</h3>
    </div>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "80vh", backgroundColor: "#f8f9fa", fontFamily: "sans-serif", padding: "40px 20px" }}>
      <div style={{ backgroundColor: "#fff", padding: "40px", borderRadius: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", width: "100%", maxWidth: "500px" }}>

        <h2 style={{ textAlign: "center", marginBottom: "8px", color: "#111", fontSize: "24px", fontWeight: "bold" }}>
          Agende seu Horário
        </h2>
        <p style={{ textAlign: "center", color: "#888", fontSize: "13px", marginBottom: "30px" }}>
          Olá, <strong>{clientEmail}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* 1. Serviço */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
              1. Escolha o Serviço
            </label>
            <select value={servicoSelecionado} onChange={(e) => { setServicoSelecionado(e.target.value); setBarbeiroSelecionado(""); setDataSelecionada(""); setHorarioEscolhido(""); }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", backgroundColor: "#fff", boxSizing: "border-box" }}>
              <option value="">Selecione um serviço...</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — R$ {Number(s.preco).toFixed(2).replace(".", ",")} ({s.duracao} min)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Barbeiro */}
          {servicoSelecionado && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
                2. Escolha o Profissional
              </label>
              <select value={barbeiroSelecionado} onChange={(e) => { setBarbeiroSelecionado(e.target.value); setDataSelecionada(""); setHorarioEscolhido(""); }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", backgroundColor: "#fff", boxSizing: "border-box" }}>
                <option value="">Selecione um barbeiro...</option>
                {barbeiros.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Data */}
          {barbeiroSelecionado && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
                3. Escolha a Data
              </label>
              <input type="date" value={dataSelecionada} min={hoje}
                onChange={(e) => { setDataSelecionada(e.target.value); setHorarioEscolhido(""); }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" }} />
            </div>
          )}

          {/* 4. Horários disponíveis */}
          {dataSelecionada && (
            <div>
              <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", color: "#555", fontSize: "14px" }}>
                4. Horários Disponíveis
                {servicoAtual && <span style={{ fontWeight: "normal", color: "#999", marginLeft: "8px" }}>({servicoAtual.duracao} min cada)</span>}
              </label>

              {calculandoHorarios ? (
                <p style={{ color: "#999", fontSize: "14px" }}>Verificando disponibilidade...</p>
              ) : horariosDisponiveis.length === 0 ? (
                <p style={{ color: "#dc3545", fontSize: "14px", padding: "12px", backgroundColor: "#fde8e8", borderRadius: "8px" }}>
                  ❌ Nenhum horário disponível neste dia. Tente outra data.
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {horariosDisponiveis.map((hora) => (
                    <button key={hora} onClick={() => setHorarioEscolhido(hora)} type="button"
                      style={{
                        padding: "8px 16px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", cursor: "pointer",
                        border: horarioEscolhido === hora ? "2px solid #111" : "2px solid #ddd",
                        backgroundColor: horarioEscolhido === hora ? "#111" : "#fff",
                        color: horarioEscolhido === hora ? "#fff" : "#333",
                        transition: "all 0.15s",
                      }}>
                      {hora}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resumo e confirmação */}
          {horarioEscolhido && (
            <div style={{ backgroundColor: "#f8f9fa", padding: "16px", borderRadius: "8px", border: "1px solid #eee" }}>
              <p style={{ margin: "0 0 5px 0", fontSize: "13px", color: "#777", fontWeight: "600", textTransform: "uppercase" }}>Resumo do Agendamento</p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>✂️ <strong>{servicoAtual?.nome}</strong></p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>👤 <strong>{barbeiros.find((b) => b.id === barbeiroSelecionado)?.nome}</strong></p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>📅 <strong>{dataSelecionada.split("-").reverse().join("/")} às {horarioEscolhido}</strong></p>
              <p style={{ margin: "4px 0", fontSize: "14px" }}>💰 <strong>R$ {Number(servicoAtual?.preco).toFixed(2).replace(".", ",")}</strong></p>
            </div>
          )}

          <button onClick={handleSalvarAgendamento} disabled={enviando || !horarioEscolhido}
            style={{ width: "100%", padding: "13px", backgroundColor: horarioEscolhido ? "#111" : "#ccc", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: "bold", cursor: horarioEscolhido ? "pointer" : "not-allowed", transition: "background-color 0.2s" }}>
            {enviando ? "Processando..." : "Confirmar Agendamento"}
          </button>

        </div>
      </div>
    </div>
  );
}
