import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PainelCliente() {
  const { usuarioLogado } = useAuth();
  const clientEmail = usuarioLogado?.email || "";

  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregarDadosCliente = async () => {
    try {
      setCarregando(true);

      const qBarbeiros = await getDocs(collection(db, "profissionais"));
      const bLista = [];
      qBarbeiros.forEach(d => bLista.push({ id: d.id, ...d.data() }));
      setBarbeiros(bLista);

      const qServicos = await getDocs(collection(db, "servicos"));
      const sLista = [];
      qServicos.forEach(d => sLista.push({ id: d.id, ...d.data() }));
      setServicos(sLista);

      const querySnapshot = await getDocs(collection(db, "agendamentos"));
      const lista = [];
      querySnapshot.forEach((documento) => {
        const dados = documento.data();
        if (dados.clientEmail === clientEmail) {
          lista.push({ id: documento.id, ...dados });
        }
      });

      // Ordena por data decrescente (mais recentes primeiro)
      lista.sort((a, b) => new Date(b.dataHorario) - new Date(a.dataHorario));
      setMeusAgendamentos(lista);
    } catch (e) {
      console.error("Erro ao carregar painel do cliente:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (clientEmail) carregarDadosCliente();
  }, [clientEmail]);

  const handleCancelarHorario = async (id) => {
    if (!window.confirm("Deseja realmente cancelar este horário?")) return;
    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setMeusAgendamentos(meusAgendamentos.filter(item => item.id !== id));
      alert("Agendamento cancelado com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar:", error);
    }
  };

  const obterNomeBarbeiro = (id) => {
    const encontrado = barbeiros.find(b => b.id === id);
    return encontrado ? encontrado.nome : id;
  };

  const obterNomeServico = (id) => {
    const encontrado = servicos.find(s => s.id === id);
    return encontrado ? encontrado.nome : "Serviço Selecionado";
  };

  const formatarData = (dataString) => {
    if (!dataString || typeof dataString !== "string") return dataString;
    if (dataString.includes("T")) {
      const [data, hora] = dataString.split("T");
      const [ano, mes, dia] = data.split("-");
      return `${dia}/${mes}/${ano} às ${hora}`;
    }
    return dataString;
  };

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif", textAlign: "center" }}>
      <h2 style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", color: "#111" }}>
        👤 Painel do Cliente
      </h2>
      <p style={{ color: "#555" }}>
        Olá, <strong style={{ color: "#007bff" }}>{clientEmail}</strong>. Gerencie seus horários abaixo:
      </p>

      <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "30px 0" }} />

      <h3 style={{ fontSize: "14px", color: "#777", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "20px" }}>
        Meus Agendamentos
      </h3>

      {carregando ? (
        <p style={{ color: "#999" }}>Carregando seus agendamentos...</p>
      ) : meusAgendamentos.length === 0 ? (
        <p style={{ color: "#999", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>
          Você não possui horários agendados.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {meusAgendamentos.map((item) => (
            <div key={item.id} style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
              <p style={{ margin: "5px 0", fontSize: "15px" }}>
                <strong>Profissional:</strong> {obterNomeBarbeiro(item.barbeiroId)}
              </p>
              <p style={{ margin: "5px 0", fontSize: "15px" }}>
                <strong>Serviço:</strong>{" "}
                <span style={{ backgroundColor: "#f1f1f1", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                  {obterNomeServico(item.servicoId)}
                </span>
              </p>
              <p style={{ margin: "5px 0", fontSize: "15px" }}>
                <strong>Data/Hora:</strong> {formatarData(item.dataHorario)}
              </p>
              <p style={{ margin: "10px 0", fontSize: "14px" }}>
                <strong>Status:</strong>{" "}
                <span style={{ color: item.status === "concluido" ? "#28a745" : "#007bff", fontWeight: "bold" }}>
                  {item.status ? item.status.toUpperCase() : "CONFIRMADO"}
                </span>
              </p>

              {item.status !== "concluido" && (
                <button
                  onClick={() => handleCancelarHorario(item.id)}
                  style={{ marginTop: "10px", padding: "8px 16px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                >
                  Cancelar Horário
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
