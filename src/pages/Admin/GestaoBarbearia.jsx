import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection, doc, setDoc, getDocs,
  deleteDoc, getDoc, addDoc, updateDoc
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const DIAS = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca",   label: "Terça-feira"   },
  { key: "quarta",  label: "Quarta-feira"  },
  { key: "quinta",  label: "Quinta-feira"  },
  { key: "sexta",   label: "Sexta-feira"   },
  { key: "sabado",  label: "Sábado"        },
  { key: "domingo", label: "Domingo"       },
];

const HORARIOS_PADRAO = DIAS.reduce((acc, dia) => {
  acc[dia.key] = { aberto: dia.key !== "domingo", abertura: "09:00", fechamento: "19:00" };
  return acc;
}, {});

const estiloAba = (ativa) => ({
  padding: "10px 24px",
  border: "none",
  borderBottom: ativa ? "3px solid #111" : "3px solid transparent",
  backgroundColor: "transparent",
  fontWeight: ativa ? "bold" : "500",
  fontSize: "14px",
  color: ativa ? "#111" : "#888",
  cursor: "pointer",
  transition: "all 0.2s",
});

export default function GestaoBarbearia() {
  const [abaAtiva, setAbaAtiva] = useState("equipe");
  const [carregando, setCarregando] = useState(true);

  // Equipe
  const [barbeiros, setBarbeiros] = useState([]);
  const [nomeBarbeiro, setNomeBarbeiro] = useState("");
  const [emailBarbeiro, setEmailBarbeiro] = useState("");
  const [senhaBarbeiro, setSenhaBarbeiro] = useState("");
  const [salvandoBarbeiro, setSalvandoBarbeiro] = useState(false);
  const [erroBarbeiro, setErroBarbeiro] = useState("");

  // Serviços
  const [servicos, setServicos] = useState([]);
  const [nomeServico, setNomeServico] = useState("");
  const [precoServico, setPrecoServico] = useState("");
  const [duracaoServico, setDuracaoServico] = useState("");
  const [salvandoServico, setSalvandoServico] = useState(false);
  const [erroServico, setErroServico] = useState("");
  const [editandoServico, setEditandoServico] = useState(null);

  // Horários
  const [horarios, setHorarios] = useState(HORARIOS_PADRAO);
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [mensagemHorarios, setMensagemHorarios] = useState("");

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
        if (docH.exists()) setHorarios(docH.data());
      } catch (e) {
        console.error("Erro ao carregar:", e);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  // ── Equipe ─────────────────────────────────────────────
  const handleCadastrarBarbeiro = async (e) => {
    e.preventDefault();
    setErroBarbeiro("");
    if (!nomeBarbeiro || !emailBarbeiro || !senhaBarbeiro) { setErroBarbeiro("Preencha todos os campos."); return; }
    if (senhaBarbeiro.length < 6) { setErroBarbeiro("Senha: mínimo 6 caracteres."); return; }
    try {
      setSalvandoBarbeiro(true);
      const cred = await createUserWithEmailAndPassword(auth, emailBarbeiro, senhaBarbeiro);
      const uid = cred.user.uid;
      await setDoc(doc(db, "usuarios", uid), { nome: nomeBarbeiro, email: emailBarbeiro, role: "barbeiro", criadoEm: new Date().toISOString() });
      await setDoc(doc(db, "profissionais", uid), { nome: nomeBarbeiro, email: emailBarbeiro, ativo: true });
      setBarbeiros((p) => [...p, { id: uid, nome: nomeBarbeiro, email: emailBarbeiro, ativo: true }]);
      setNomeBarbeiro(""); setEmailBarbeiro(""); setSenhaBarbeiro("");
      alert(`Barbeiro "${nomeBarbeiro}" cadastrado!`);
    } catch (err) {
      setErroBarbeiro(err.code === "auth/email-already-in-use" ? "E-mail já cadastrado." : "Erro ao cadastrar.");
    } finally { setSalvandoBarbeiro(false); }
  };

  const handleRemoverBarbeiro = async (id, nome) => {
    if (!window.confirm(`Remover "${nome}" da equipe?`)) return;
    try {
      await deleteDoc(doc(db, "profissionais", id));
      setBarbeiros((p) => p.filter((b) => b.id !== id));
    } catch { alert("Erro ao remover."); }
  };

  // ── Serviços ───────────────────────────────────────────
  const handleSalvarServico = async (e) => {
    e.preventDefault();
    setErroServico("");
    if (!nomeServico || !precoServico || !duracaoServico) { setErroServico("Preencha todos os campos."); return; }
    if (isNaN(precoServico) || Number(precoServico) <= 0) { setErroServico("Preço inválido."); return; }
    if (isNaN(duracaoServico) || Number(duracaoServico) <= 0) { setErroServico("Duração inválida."); return; }
    try {
      setSalvandoServico(true);
      const dados = { nome: nomeServico, preco: Number(precoServico), duracao: Number(duracaoServico) };
      if (editandoServico) {
        await updateDoc(doc(db, "servicos", editandoServico), dados);
        setServicos((p) => p.map((s) => s.id === editandoServico ? { id: editandoServico, ...dados } : s));
        setEditandoServico(null);
        alert("Serviço atualizado!");
      } else {
        const ref = await addDoc(collection(db, "servicos"), dados);
        setServicos((p) => [...p, { id: ref.id, ...dados }]);
        alert("Serviço cadastrado!");
      }
      setNomeServico(""); setPrecoServico(""); setDuracaoServico("");
    } catch { setErroServico("Erro ao salvar serviço."); }
    finally { setSalvandoServico(false); }
  };

  const handleEditarServico = (s) => {
    setEditandoServico(s.id);
    setNomeServico(s.nome);
    setPrecoServico(String(s.preco));
    setDuracaoServico(String(s.duracao || ""));
    setAbaAtiva("servicos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelarEdicao = () => {
    setEditandoServico(null);
    setNomeServico(""); setPrecoServico(""); setDuracaoServico(""); setErroServico("");
  };

  const handleRemoverServico = async (id, nome) => {
    if (!window.confirm(`Remover "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "servicos", id));
      setServicos((p) => p.filter((s) => s.id !== id));
    } catch { alert("Erro ao remover."); }
  };

  // ── Horários ───────────────────────────────────────────
  const handleSalvarHorarios = async () => {
    try {
      setSalvandoHorarios(true);
      await setDoc(doc(db, "configuracoes", "horarios"), horarios);
      setMensagemHorarios("✅ Horários salvos!");
      setTimeout(() => setMensagemHorarios(""), 3000);
    } catch { setMensagemHorarios("❌ Erro ao salvar."); }
    finally { setSalvandoHorarios(false); }
  };

  const atualizarDia = (dia, campo, valor) => {
    setHorarios((p) => ({ ...p, [dia]: { ...p[dia], [campo]: valor } }));
  };

  if (carregando) return <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}><h3>Carregando...</h3></div>;

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>

      <h2 style={{ color: "#111", margin: "0 0 5px 0" }}>⚙️ Gestão da Barbearia</h2>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 25px 0" }}>Gerencie sua equipe, serviços e horários de funcionamento.</p>

      {/* ABAS */}
      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: "30px" }}>
        <button style={estiloAba(abaAtiva === "equipe")}   onClick={() => setAbaAtiva("equipe")}>👥 Equipe</button>
        <button style={estiloAba(abaAtiva === "servicos")} onClick={() => setAbaAtiva("servicos")}>✂️ Serviços</button>
        <button style={estiloAba(abaAtiva === "horarios")} onClick={() => setAbaAtiva("horarios")}>🕐 Horários</button>
      </div>

      {/* ══════ ABA EQUIPE ══════ */}
      {abaAtiva === "equipe" && (
        <>
          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>Adicionar Novo Barbeiro</h3>
            {erroBarbeiro && <p style={{ color: "#dc3545", backgroundColor: "#fde8e8", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", marginBottom: "15px" }}>{erroBarbeiro}</p>}
            <form onSubmit={handleCadastrarBarbeiro} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", gridColumn: "1 / -1" }}>
                <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Nome Completo</span>
                <input type="text" value={nomeBarbeiro} onChange={(e) => setNomeBarbeiro(e.target.value)} placeholder="Ex: Alan Silva" style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>E-mail de Acesso</span>
                <input type="email" value={emailBarbeiro} onChange={(e) => setEmailBarbeiro(e.target.value)} placeholder="barbeiro@email.com" style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Senha Provisória</span>
                <input type="password" value={senhaBarbeiro} onChange={(e) => setSenhaBarbeiro(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
              </label>
              <button type="submit" disabled={salvandoBarbeiro} style={{ gridColumn: "1 / -1", padding: "12px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
                {salvandoBarbeiro ? "Cadastrando..." : "➕ Cadastrar Barbeiro"}
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>Equipe Atual ({barbeiros.length})</h3>
            {barbeiros.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>Nenhum barbeiro cadastrado.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ backgroundColor: "#111", color: "#fff" }}>
                  <th style={{ padding: "10px 15px", textAlign: "left" }}>Nome</th>
                  <th style={{ padding: "10px 15px", textAlign: "left" }}>E-mail</th>
                  <th style={{ padding: "10px 15px", textAlign: "center" }}>Ação</th>
                </tr></thead>
                <tbody>
                  {barbeiros.map((b) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "12px 15px", fontWeight: "500" }}>{b.nome}</td>
                      <td style={{ padding: "12px 15px", color: "#666", fontSize: "14px" }}>{b.email}</td>
                      <td style={{ padding: "12px 15px", textAlign: "center" }}>
                        <button onClick={() => handleRemoverBarbeiro(b.id, b.nome)} style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ══════ ABA SERVIÇOS ══════ */}
      {abaAtiva === "servicos" && (
        <>
          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "30px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>
              {editandoServico ? "✏️ Editar Serviço" : "Adicionar Novo Serviço"}
            </h3>
            {erroServico && <p style={{ color: "#dc3545", backgroundColor: "#fde8e8", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", marginBottom: "15px" }}>{erroServico}</p>}
            <form onSubmit={handleSalvarServico} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "15px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Nome do Serviço</span>
                <input type="text" value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} placeholder="Ex: Corte Masculino" style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Preço (R$)</span>
                <input type="number" min="0" step="0.01" value={precoServico} onChange={(e) => setPrecoServico(e.target.value)} placeholder="45.00" style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Duração (min)</span>
                <input type="number" min="5" step="5" value={duracaoServico} onChange={(e) => setDuracaoServico(e.target.value)} placeholder="40" style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }} />
              </label>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px" }}>
                <button type="submit" disabled={salvandoServico} style={{ flex: 1, padding: "12px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
                  {salvandoServico ? "Salvando..." : editandoServico ? "💾 Salvar Alterações" : "➕ Adicionar Serviço"}
                </button>
                {editandoServico && (
                  <button type="button" onClick={handleCancelarEdicao} style={{ padding: "12px 20px", backgroundColor: "#eee", color: "#333", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>Cancelar</button>
                )}
              </div>
            </form>
          </div>

          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>Serviços Cadastrados ({servicos.length})</h3>
            {servicos.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>Nenhum serviço cadastrado.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ backgroundColor: "#111", color: "#fff" }}>
                  <th style={{ padding: "10px 15px", textAlign: "left" }}>Serviço</th>
                  <th style={{ padding: "10px 15px", textAlign: "center" }}>Preço</th>
                  <th style={{ padding: "10px 15px", textAlign: "center" }}>Duração</th>
                  <th style={{ padding: "10px 15px", textAlign: "center" }}>Ações</th>
                </tr></thead>
                <tbody>
                  {servicos.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #eee", backgroundColor: editandoServico === s.id ? "#fffbe6" : "transparent" }}>
                      <td style={{ padding: "12px 15px", fontWeight: "500" }}>{s.nome}</td>
                      <td style={{ padding: "12px 15px", textAlign: "center", color: "#28a745", fontWeight: "bold" }}>R$ {Number(s.preco).toFixed(2).replace(".", ",")}</td>
                      <td style={{ padding: "12px 15px", textAlign: "center", color: "#555" }}>{s.duracao ? `${s.duracao} min` : "—"}</td>
                      <td style={{ padding: "12px 15px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button onClick={() => handleEditarServico(s)} style={{ padding: "6px 12px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Editar</button>
                          <button onClick={() => handleRemoverServico(s.id, s.nome)} style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Remover</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ══════ ABA HORÁRIOS ══════ */}
      {abaAtiva === "horarios" && (
        <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "15px", color: "#444", textTransform: "uppercase" }}>Horários de Funcionamento</h3>
          <p style={{ fontSize: "13px", color: "#999", margin: "0 0 25px 0" }}>Os clientes só poderão agendar dentro dos horários definidos aqui.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {DIAS.map(({ key, label }) => (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "160px 100px 120px 120px", alignItems: "center", gap: "15px", padding: "12px 15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
                <span style={{ fontWeight: "600", fontSize: "14px" }}>{label}</span>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input type="checkbox" checked={horarios[key]?.aberto || false} onChange={(e) => atualizarDia(key, "aberto", e.target.checked)} style={{ width: "16px", height: "16px" }} />
                  {horarios[key]?.aberto ? "Aberto" : "Fechado"}
                </label>
                <input type="time" value={horarios[key]?.abertura || "09:00"} onChange={(e) => atualizarDia(key, "abertura", e.target.value)} disabled={!horarios[key]?.aberto}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", backgroundColor: horarios[key]?.aberto ? "#fff" : "#eee" }} />
                <input type="time" value={horarios[key]?.fechamento || "19:00"} onChange={(e) => atualizarDia(key, "fechamento", e.target.value)} disabled={!horarios[key]?.aberto}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", backgroundColor: horarios[key]?.aberto ? "#fff" : "#eee" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: "25px", display: "flex", alignItems: "center", gap: "20px" }}>
            <button onClick={handleSalvarHorarios} disabled={salvandoHorarios} style={{ padding: "12px 30px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
              {salvandoHorarios ? "Salvando..." : "💾 Salvar Horários"}
            </button>
            {mensagemHorarios && <span style={{ fontSize: "14px", fontWeight: "bold", color: mensagemHorarios.startsWith("✅") ? "#28a745" : "#dc3545" }}>{mensagemHorarios}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
