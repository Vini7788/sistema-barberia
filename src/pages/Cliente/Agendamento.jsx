import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore"; // <-- Adicionado: query e where

export default function Agendamento() {
  const navigate = useNavigate();

  // Estados do Banco
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Estados do Formulário
  const [servicoIdSelecionado, setServicoIdSelecionado] = useState("");
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const buscarDadosDoBanco = async () => {
      try {
        const profSnapshot = await getDocs(collection(db, "profissionais"));
        const listaProf = profSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBarbeiros(listaProf);
        if (listaProf.length > 0) setBarbeiroSelecionado(listaProf[0].id);

        const servSnapshot = await getDocs(collection(db, "servicos"));
        const listaServ = servSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServicos(listaServ);
        if (listaServ.length > 0) setServicoIdSelecionado(listaServ[0].id);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
    buscarDadosDoBanco();
  }, []);

  const salvarAgendamento = async (e) => {
    e.preventDefault();

    if (!nomeCliente || !dataHora || !barbeiroSelecionado || !servicoIdSelecionado) {
      alert("Por favor, preencha todos os campos do agendamento!");
      return;
    }

    const horarioEscolhido = new Date(dataHora);
    const agora = new Date();
    if (horarioEscolhido < agora) {
      alert("🕒 Opa! Você não pode escolher uma data ou horário que já passou.");
      return;
    }

    setCarregando(true);

    try {
      // 🛡️ REGRA DE NEGÓCIO: Validar se o barbeiro já tem cliente nesse exato minuto
      const agendamentosRef = collection(db, "agendamentos");
      
      // Criamos uma consulta buscando por: mesmo barbeiro, mesmo horário e que NÃO esteja cancelado
      const consultaConflito = query(
        agendamentosRef,
        where("barbeiroId", "==", barbeiroSelecionado),
        where("dataHorario", "==", horarioEscolhido),
        where("status", "==", "confirmado")
      );

      const snapshotConflito = await getDocs(consultaConflito);

      // Se encontrou qualquer registro, barramos o agendamento!
      if (!snapshotConflito.empty) {
        alert("❌ Este profissional já possui um agendamento confirmado para este dia e horário. Por favor, escolha outro horário!");
        setCarregando(false);
        return;
      }

      // Se passou pela validação, prossegue normalmente
      const dadosDoServico = servicos.find(s => s.id === servicoIdSelecionado);

      await addDoc(collection(db, "agendamentos"), {
        clienteId: nomeCliente,
        barbeiroId: barbeiroSelecionado,
        servicoId: servicoIdSelecionado,
        servicoNome: dadosDoServico?.nome || "Serviço Não Identificado",
        preco: Number(dadosDoServico?.preco) || 0,
        duracao: Number(dadosDoServico?.duracao) || 30,
        dataHorario: horarioEscolhido,
        status: "confirmado"
      });

      alert("🎉 Agendamento realizado com sucesso!");
      navigate("/meus-agendamentos");

    } catch (error) {
      console.error("Erro ao gravar agendamento:", error);
      alert("Houve um erro de comunicação com o banco de dados.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }}>
      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <span style={{ fontSize: "40px" }}>💈</span>
        <h2 style={{ margin: "10px 0 5px 0", color: "#111" }}>Barbearia Premium</h2>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Agende seu Horário Conectado ao Firebase</p>
      </div>

      <form onSubmit={salvarAgendamento} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontWeight: "bold", color: "#333", fontSize: "14px" }}>ID ou Nome do Cliente:</span>
          <input 
            type="text"
            placeholder="Digite seu nome completo"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontWeight: "bold", color: "#333", fontSize: "14px" }}>Escolha o Serviço:</span>
          <select 
            value={servicoIdSelecionado}
            onChange={(e) => setServicoIdSelecionado(e.target.value)}
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px", backgroundColor: "#fff" }}
          >
            {servicos.length === 0 ? (
              <option>Carregando serviços...</option>
            ) : (
              servicos.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome} — R$ {s.preco} ({s.duracao} min)
                </option>
              ))
            )}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontWeight: "bold", color: "#333", fontSize: "14px" }}>Escolha o Profissional:</span>
          <select 
            value={barbeiroSelecionado}
            onChange={(e) => setBarbeiroSelecionado(e.target.value)}
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px", backgroundColor: "#fff" }}
          >
            {barbeiros.map(b => (
              <option key={b.id} value={b.id}>{b.nome || "Barbeiro sem Nome"}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontWeight: "bold", color: "#333", fontSize: "14px" }}>Data e Horário:</span>
          <input 
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
        </label>

        <button
          type="submit"
          disabled={carregando}
          style={{
            padding: "14px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          {carregando ? "Verificando Agenda..." : "Confirmar Agendamento"}
        </button>
      </form>
    </div>
  );
}