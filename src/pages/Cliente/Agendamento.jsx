import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

export default function Agendamento() {
  // Estado para armazenar o usuário logado (simulado pelo e-mail do seu print)
  const [clientEmail] = useState("barber_sucesso@teste.com");

  // Estados para as listas do banco de dados
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Estados do formulário (o que o cliente seleciona)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState("");
  const [dataHorario, setDataHorario] = useState("");

  // Estados de controle da tela
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Função para buscar barbeiros e serviços do Firebase
  const carregarDadosFormulario = async () => {
    try {
      setCarregando(true);

      // 1. Busca os Barbeiros
      const queryBarbeiros = await getDocs(collection(db, "profissionais"));
      const listaBarbeiros = [];
      queryBarbeiros.forEach((doc) => {
        listaBarbeiros.push({ id: doc.id, ...doc.data() });
      });

      // 2. Busca os Serviços
      const queryServicos = await getDocs(collection(db, "servicos"));
      const listaServicos = [];
      queryServicos.forEach((doc) => {
        listaServicos.push({ id: doc.id, ...doc.data() });
      });

      // Se o banco estiver vazio (primeiro teste), usamos dados padrão para não travar o Isã
      if (listaBarbeiros.length === 0) {
        listaBarbeiros.push(
          { id: "b9InIZOqbHXTYHL3VeTa", nome: "Alan (Cabelo & Barba)" },
          { id: "barbeiro_2", nome: "Vitor (Especialista em Degradê)" }
        );
      }
      if (listaServicos.length === 0) {
        listaServicos.push(
          { id: "servico_1", nome: "Corte Masculino", preco: 45.00 },
          { id: "servico_2", nome: "Barba Completa", preco: 35.00 },
          { id: "servico_3", nome: "Combo (Cabelo + Barba)", preco: 70.00 }
        );
      }

      setBarbeiros(listaBarbeiros);
      setServicos(listaServicos);
    } catch (error) {
      console.error("Erro ao carregar dados de agendamento:", error);
      alert("Erro ao conectar com o banco de dados.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDadosFormulario();
  }, []);

  // Função executada ao clicar em "Confirmar Agendamento"
  const handleSalvarAgendamento = async (e) => {
    e.preventDefault();

    if (!barbeiroSelecionado || !servicoSelecionado || !dataHorario) {
      alert("Por favor, preencha todos os campos antes de confirmar!");
      return;
    }

    try {
      setEnviando(true);

      // Monta a estrutura correta exigida pela arquitetura do sistema
      const novoAgendamento = {
        clientEmail: clientEmail,
        barbeiroId: barbeiroSelecionado,
        servicoId: servicoSelecionado,
        dataHorario: dataHorario,
        status: "confirmado", // Todo agendamento nasce confirmado
        criadoEm: new Date().toISOString()
      };

      // Salva na coleção "agendamentos" do Firestore
      await addDoc(collection(db, "agendamentos"), novoAgendamento);

      alert("🎉 Agendamento realizado com sucesso!");
      
      // Limpa os campos do formulário pós-sucesso
      setBarbeiroSelecionado("");
      setServicoSelecionado("");
      setDataHorario("");

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
          
          {/* Campo Cliente Ativo */}
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

          {/* NOVO: Escolha o Serviço */}
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

          {/* Escolha o Profissional */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#555", fontSize: "14px", textTransform: "none", textAlign: "center" }}>
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
              onChange={(e) => setDataHorario(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          {/* Botão de Confirmação */}
          <button 
            type="submit" 
            disabled={enviando}
            style={{ width: "100%", padding: "12px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginTop: "10px", transition: "background-color 0.2s" }}
          >
            {enviando ? "Processando..." : "Confirmar Agendamento"}
          </button>

        </form>
      </div>
    </div>
  );
}