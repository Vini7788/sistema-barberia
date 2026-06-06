import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link } from "react-router-dom";

const injectStyles = () => {
  if (document.getElementById("painel-styles")) return;
  const style = document.createElement("style");
  style.id = "painel-styles";
  style.textContent = `
    .pc-card {
      background: #fff;
      border: 1.5px solid var(--grey-100, #ebebeb);
      border-radius: 16px;
      padding: 24px;
      transition: box-shadow 0.2s;
    }
    .pc-card:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.07);
    }
    .pc-btn-cancelar {
      font-size: 13px;
      font-weight: 600;
      color: #c1121f;
      background: none;
      border: 1.5px solid #fcd5d7;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all 0.2s;
      letter-spacing: 0.02em;
    }
    .pc-btn-cancelar:hover {
      background: #fde8e8;
      border-color: #c1121f;
    }
    .pc-btn-agendar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--black, #111);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 10px;
      text-decoration: none;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: 0.02em;
      transition: opacity 0.2s;
    }
    .pc-btn-agendar:hover { opacity: 0.85; }
    @media (max-width: 600px) {
      .pc-outer { padding: 24px 16px !important; }
      .pc-card { padding: 18px !important; }
    }
  `;
  document.head.appendChild(style);
};

export default function PainelCliente() {
  useEffect(() => { injectStyles(); }, []);

  const { usuarioLogado } = useAuth();
  const clientEmail = usuarioLogado?.email || "";

  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(null);

  // ── Backend inalterado ─────────────────────────────────
  const carregarDadosCliente = async () => {
    try {
      setCarregando(true);
      const qB = await getDocs(collection(db, "profissionais"));
      const bLista = [];
      qB.forEach((d) => bLista.push({ id: d.id, ...d.data() }));
      setBarbeiros(bLista);

      const qS = await getDocs(collection(db, "servicos"));
      const sLista = [];
      qS.forEach((d) => sLista.push({ id: d.id, ...d.data() }));
      setServicos(sLista);

      const qA = await getDocs(collection(db, "agendamentos"));
      const lista = [];
      qA.forEach((d) => {
        const dados = d.data();
        if (dados.clientEmail === clientEmail) lista.push({ id: d.id, ...dados });
      });
      lista.sort((a, b) => new Date(b.dataHorario) - new Date(a.dataHorario));
      setMeusAgendamentos(lista);
    } catch (e) {
      console.error("Erro ao carregar painel:", e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (clientEmail) carregarDadosCliente();
  }, [clientEmail]);

  const handleCancelar = async (id) => {
    if (!window.confirm("Deseja cancelar este agendamento?")) return;
    try {
      setCancelando(id);
      await deleteDoc(doc(db, "agendamentos", id));
      setMeusAgendamentos((p) => p.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setCancelando(null);
    }
  };

  const obterNomeBarbeiro = (id) => barbeiros.find((b) => b.id === id)?.nome || "—";
  const obterServico     = (id) => servicos.find((s) => s.id === id);

  const formatarData = (dataString) => {
    if (!dataString || typeof dataString !== "string") return "—";
    try {
      const [data, hora] = dataString.split("T");
      const [ano, mes, dia] = data.split("-");
      const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const diaSemana = diasSemana[new Date(dataString).getDay()];
      return { data: `${diaSemana}, ${dia}/${mes}/${ano}`, hora: hora?.substring(0, 5) };
    } catch { return { data: "—", hora: "—" }; }
  };

  // Separa futuros e passados
  const agora = new Date();
  const proximos  = meusAgendamentos.filter((ag) => ag.status !== "concluido" && new Date(ag.dataHorario) >= agora);
  const historico = meusAgendamentos.filter((ag) => ag.status === "concluido" || new Date(ag.dataHorario) < agora);

  const primeiroNome = usuarioLogado?.displayName?.split(" ")[0] || clientEmail.split("@")[0];

  return (
    <div className="pc-outer" style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
          Minha Conta
        </p>
        <h1 style={{ fontSize: "30px", fontWeight: "700", color: "var(--black, #111)", letterSpacing: "-0.02em", marginBottom: "6px" }}>
          Olá, {primeiroNome}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--grey-400, #9a9a9a)" }}>{clientEmail}</p>
      </div>

      {carregando ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: "28px", opacity: 0.2, marginBottom: "12px" }}>✂</div>
          <p style={{ color: "var(--grey-400, #9a9a9a)", fontSize: "14px" }}>Carregando agendamentos...</p>
        </div>
      ) : meusAgendamentos.length === 0 ? (
        /* Estado vazio */
        <div style={{ textAlign: "center", padding: "60px 20px", border: "1.5px dashed var(--grey-200, #d6d6d6)", borderRadius: "16px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.2 }}>✂</div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--black, #111)", marginBottom: "8px" }}>
            Nenhum agendamento ainda
          </h3>
          <p style={{ fontSize: "14px", color: "var(--grey-400, #9a9a9a)", marginBottom: "28px", lineHeight: "1.6" }}>
            Faça seu primeiro agendamento<br/>e apareça aqui.
          </p>
          <Link to="/" className="pc-btn-agendar">
            ✦ Agendar agora
          </Link>
        </div>
      ) : (
        <>
          {/* Próximos */}
          {proximos.length > 0 && (
            <section style={{ marginBottom: "40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "13px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Próximos
                </h2>
                <span style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", backgroundColor: "var(--grey-100, #ebebeb)", padding: "3px 10px", borderRadius: "999px", fontWeight: "600" }}>
                  {proximos.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {proximos.map((item) => {
                  const { data, hora } = formatarData(item.dataHorario);
                  const servico = obterServico(item.servicoId);
                  return (
                    <div key={item.id} className="pc-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                        {/* Data destaque */}
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div style={{ width: "52px", height: "52px", backgroundColor: "var(--black, #111)", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: "#fff", fontSize: "18px", fontWeight: "700", lineHeight: 1 }}>{hora}</span>
                            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", marginTop: "2px" }}>h</span>
                          </div>
                          <div>
                            <p style={{ fontWeight: "600", fontSize: "15px", color: "var(--black, #111)", margin: "0 0 3px 0" }}>
                              {servico?.nome || "Serviço"}
                            </p>
                            <p style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>{data}</p>
                          </div>
                        </div>

                        {/* Badge status */}
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#2d6a4f", backgroundColor: "#d8f3dc", padding: "4px 10px", borderRadius: "999px", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                          CONFIRMADO
                        </span>
                      </div>

                      {/* Detalhes */}
                      <div style={{ paddingTop: "14px", borderTop: "1px solid var(--grey-100, #ebebeb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--grey-100, #ebebeb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                            ✂
                          </div>
                          <span style={{ fontSize: "13px", color: "var(--grey-600, #555)", fontWeight: "500" }}>
                            {obterNomeBarbeiro(item.barbeiroId)}
                          </span>
                        </div>

                        {servico?.preco && (
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--black, #111)" }}>
                            R$ {Number(servico.preco).toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>

                      {/* Botão cancelar */}
                      <div style={{ marginTop: "14px" }}>
                        <button
                          className="pc-btn-cancelar"
                          onClick={() => handleCancelar(item.id)}
                          disabled={cancelando === item.id}
                        >
                          {cancelando === item.id ? "Cancelando..." : "Cancelar agendamento"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "13px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Histórico
                </h2>
                <span style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", backgroundColor: "var(--grey-100, #ebebeb)", padding: "3px 10px", borderRadius: "999px", fontWeight: "600" }}>
                  {historico.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {historico.map((item) => {
                  const { data, hora } = formatarData(item.dataHorario);
                  const servico = obterServico(item.servicoId);
                  const concluido = item.status === "concluido";
                  return (
                    <div key={item.id} className="pc-card" style={{ opacity: 0.7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "40px", height: "40px", backgroundColor: "var(--grey-100, #ebebeb)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)" }}>{hora}</span>
                          </div>
                          <div>
                            <p style={{ fontWeight: "600", fontSize: "14px", color: "var(--black, #111)", margin: "0 0 2px 0" }}>{servico?.nome || "Serviço"}</p>
                            <p style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", margin: 0 }}>{data} · {obterNomeBarbeiro(item.barbeiroId)}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: concluido ? "#2d6a4f" : "var(--grey-400, #9a9a9a)", backgroundColor: concluido ? "#d8f3dc" : "var(--grey-100, #ebebeb)", padding: "4px 10px", borderRadius: "999px", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                          {concluido ? "CONCLUÍDO" : "EXPIRADO"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Botão novo agendamento */}
          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <Link to="/" className="pc-btn-agendar">
              ✦ Novo agendamento
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
