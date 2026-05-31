import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Agendamento() {
  const { usuarioLogado } = useAuth();
  const clientEmail = usuarioLogado?.email || "";

  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [horariosFuncionamento, setHorariosFuncionamento] = useState(null);

  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [dataHorario, setDataHorario] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroHorario, setErroHorario] = useState("");

  const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

  const carregarDadosFormulario = async () => {
    try {
      setCarregando(true);

      const queryBarbeiros = await getDocs(collection(db, "profissionais"));
      const listaBarbeiros = [];
      queryBarbeiros.forEach((d) => listaBarbeiros.push({ id: d.id, ...d.data() }));
      setBarbeiros(listaBarbeiros);

      const queryServicos = await getDocs(collection(db, "servicos"));
      const listaServicos = [];
      queryServicos.forEach((d) => listaServicos.push({ id: d.id, ...d.data() }));
      setServicos(listaServicos);

      // Busca os horários de funcionamento cadastrados pelo dono
      const docHorarios = await getDoc(doc(db, "configuracoes", "horarios"));
      if (docHorarios.exists()) {
        setHorariosFuncionamento(docHorarios.data());
      }
    } catch (error) {
      console.error("Erro ao carregar dados de agendamento:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosFormulario();
  }, []);

  // Valida se o horário escolhido está dentro do funcionamento
  const validarHorario = (dataHoraStr) => {
    if (!dataHoraStr || !horariosFuncionamento) return true; // sem restrições cadastradas

    const data = new Date(dataHoraStr);
    const diaSemana = DIAS_SEMANA[data.getDay()];
    const config = horariosFuncionamento[diaSemana];

    // Dia fechado
    if (!config || !config.aberto) {
      const nomesDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return `A barbearia não abre às ${nomesDias[data.getDay()]}s.`;
    }

    // Verifica se o horário está dentro do intervalo
    const [hAbre, mAbre] = config.abertura.split(":").map(Number);
    const [hFecha, mFecha] = config.fechamento.split(":").map(Number);
    const horaEscolhida = data.getHours() * 60 + data.getMinutes();
    const horaAbertura = hAbre * 60 + mAbre;
    const horaFechamento = hFecha * 60 + mFecha;

    if (horaEscolhida < horaAbertura || horaEscolhida >= horaFechamento) {
      return `Horário fora do funcionamento. ${config.abertura} às ${config.fechamento}.`;
    }

    return true;
  };

  const handleDataChange = (e) => {
    const valor = e.target.value;
    setDataHorario(valor);
    const resultado = validarHorario(valor);
    setErroHorario(resultado === true ? "" : resultado);
  };

  const handleSalvarAgendamento = async (e) => {
    e.preventDefault();

    if (!barbeiroSelecionado || !servicoSelecionado || !dataHorario) {
      alert("Por favor, preencha todos os campos antes de confirmar!");
      return;
    }

    const validacao = validarHorario(dataHorario);
    if (validacao !== true) {
      alert(`⚠️ ${validacao}`);
      return;
    }

    try {
      setEnviando(true);

      const novoAgendamento = {
        clientEmail: clientEmail,
        barbeiroId: barbeiroSelecionado,
        servicoId: servicoSelecionado,
        dataHorario: dataHorario,
        status: "confirmado",
        criadoEm: new Date().toISOString(),
      };

      await addDoc(collection(db, "agendamentos"), novoAgendamento);

      alert("🎉 Agendamento realizado com sucesso!");
      setBarbeiroSelecionado("");
      setServicoSelecionado("");
      setDataHorario("");
      setErroHorario("");
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Houve um erro ao salvar o agendamento. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
        <h3>Carregando opções de agendamento...</h3>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", backgroundColor: "#f8f9fa", fontFamily: "sans-serif" }}>
      <div style={{ backgroundColor: "#fff", padding: "40px", borderRadius: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", width: "100%", maxWidth: "450px" }}>

        <h2 style={{ textAlign: "center", marginBottom: "30px", color: "#111", fontSize: "24px", fontWeight: "bold" }}>
          Agende seu Horário
        </h2>

        <form onSubmit={handleSalvarAgendamento} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Cliente ativo */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px", textAlign: "center" }}>
              Cliente Ativo:
            </label>
            <input
              type="text"
              value={clientEmail}
              disabled
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#f1f1f1", color: "#666", textAlign: "center", fontWeight: "500", boxSizing: "border-box" }}
            />
          </div>

          {/* Serviço */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px", textAlign: "center" }}>
              Escolha o Serviço:
            </label>
            <select
              value={servicoSelecionado}
              onChange={(e) => setServicoSelecionado(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box" }}
            >
              <option value="">Selecione um serviço...</option>
              {servicos.map((serv) => (
                <option key={serv.id} value={serv.id}>
                  {serv.nome} — R$ {Number(serv.preco).toFixed(2).replace(".", ",")}
                </option>
              ))}
            </select>
          </div>

          {/* Barbeiro */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px", textAlign: "center" }}>
              Escolha o Profissional:
            </label>
            <select
              value={barbeiroSelecionado}
              onChange={(e) => setBarbeiroSelecionado(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", backgroundColor: "#fff", cursor: "pointer", boxSizing: "border-box" }}
            >
              <option value="">Selecione um barbeiro...</option>
              {barbeiros.map((barb) => (
                <option key={barb.id} value={barb.id}>
                  {barb.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horário */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px", textAlign: "center" }}>
              Data e Horário:
            </label>
            <input
              type="datetime-local"
              value={dataHorario}
              onChange={handleDataChange}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: `1px solid ${erroHorario ? "#dc3545" : "#ccc"}`, fontSize: "14px", boxSizing: "border-box" }}
            />
            {erroHorario && (
              <p style={{ color: "#dc3545", fontSize: "12px", marginTop: "6px", fontWeight: "600" }}>
                ⚠️ {erroHorario}
              </p>
            )}
            {/* Exibe os horários de funcionamento como dica */}
            {horariosFuncionamento && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "6px", fontSize: "12px", color: "#666" }}>
                <strong>Horários de funcionamento:</strong>
                {Object.entries(horariosFuncionamento).map(([dia, config]) => {
                  const nomes = { domingo: "Dom", segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex", sabado: "Sáb" };
                  return (
                    <span key={dia} style={{ display: "inline-block", margin: "2px 6px" }}>
                      <strong>{nomes[dia]}:</strong> {config.aberto ? `${config.abertura}–${config.fechamento}` : "Fechado"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando || !!erroHorario}
            style={{ width: "100%", padding: "12px", backgroundColor: erroHorario ? "#ccc" : "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: "bold", cursor: erroHorario ? "not-allowed" : "pointer", marginTop: "10px" }}
          >
            {enviando ? "Processando..." : "Confirmar Agendamento"}
          </button>

        </form>
      </div>
    </div>
  );
}
