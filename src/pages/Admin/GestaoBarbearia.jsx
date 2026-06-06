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

const injectStyles = () => {
  if (document.getElementById("gestao-styles")) return;
  const s = document.createElement("style");
  s.id = "gestao-styles";
  s.textContent = `
    .gb-card {
      background: #fff;
      border: 1.5px solid var(--grey-100, #ebebeb);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 20px;
    }
    .gb-tab {
      padding: 11px 22px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      color: var(--grey-400, #9a9a9a);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: all 0.2s;
    }
    .gb-tab.active { color: var(--black, #111); border-bottom-color: var(--black, #111); }
    .gb-tab:hover { color: var(--black, #111); }
    .gb-input {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid var(--grey-200, #d6d6d6);
      border-radius: 8px;
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: var(--black, #111);
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .gb-input:focus { border-color: var(--black, #111); }
    .gb-input:disabled { background: var(--grey-50, #f5f5f3); cursor: not-allowed; color: var(--grey-400, #9a9a9a); }
    .gb-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: var(--grey-600, #555);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 8px;
      font-family: 'DM Sans', sans-serif;
    }
    .gb-btn-primary {
      background: var(--black, #111);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      letter-spacing: 0.02em;
      transition: opacity 0.2s;
    }
    .gb-btn-primary:hover { opacity: 0.85; }
    .gb-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .gb-btn-secondary {
      background: var(--grey-100, #ebebeb);
      color: var(--black, #111);
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background 0.2s;
    }
    .gb-btn-secondary:hover { background: var(--grey-200, #d6d6d6); }
    .gb-btn-danger {
      background: #fde8e8;
      color: #c1121f;
      border: none;
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background 0.2s;
      letter-spacing: 0.03em;
    }
    .gb-btn-danger:hover { background: #fcd5d7; }
    .gb-btn-edit {
      background: var(--grey-100, #ebebeb);
      color: var(--black, #111);
      border: none;
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: background 0.2s;
      letter-spacing: 0.03em;
    }
    .gb-btn-edit:hover { background: var(--grey-200, #d6d6d6); }
    .gb-erro {
      background: #fde8e8;
      border: 1px solid #fcd5d7;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #c1121f;
      margin-bottom: 20px;
      font-family: 'DM Sans', sans-serif;
    }
    .gb-empty {
      text-align: center;
      padding: 32px;
      border: 1.5px dashed var(--grey-200, #d6d6d6);
      border-radius: 12px;
      color: var(--grey-400, #9a9a9a);
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
    }
    .gb-barbeiro-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid var(--grey-100, #ebebeb);
    }
    .gb-barbeiro-row:last-child { border-bottom: none; }
    .gb-servico-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid var(--grey-100, #ebebeb);
    }
    .gb-servico-row:last-child { border-bottom: none; }
    .gb-servico-row.editing { background: #fffbe6; margin: 0 -28px; padding: 14px 28px; }
    .gb-dia-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      border-radius: 10px;
      background: var(--grey-50, #f5f5f3);
      margin-bottom: 8px;
    }
    .gb-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }
    .gb-toggle input { opacity: 0; width: 0; height: 0; }
    .gb-toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--grey-200, #d6d6d6);
      border-radius: 999px;
      transition: background 0.2s;
    }
    .gb-toggle-slider::before {
      content: '';
      position: absolute;
      width: 16px; height: 16px;
      left: 3px; bottom: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .gb-toggle input:checked + .gb-toggle-slider { background: var(--black, #111); }
    .gb-toggle input:checked + .gb-toggle-slider::before { transform: translateX(18px); }
    .gb-time-input {
      padding: 8px 12px;
      border: 1.5px solid var(--grey-200, #d6d6d6);
      border-radius: 8px;
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: var(--black, #111);
      outline: none;
      transition: border-color 0.2s;
      width: 110px;
    }
    .gb-time-input:focus { border-color: var(--black, #111); }
    .gb-time-input:disabled { background: var(--grey-100, #ebebeb); color: var(--grey-400, #9a9a9a); cursor: not-allowed; border-color: transparent; }
    @media (max-width: 600px) {
      .gb-outer { padding: 20px 16px !important; }
      .gb-card { padding: 20px !important; }
      .gb-form-grid { grid-template-columns: 1fr !important; }
      .gb-servico-grid { grid-template-columns: 1fr !important; }
      .gb-dia-row { flex-wrap: wrap; }
      .gb-dia-label { min-width: 100% !important; }
    }
  `;
  document.head.appendChild(s);
};

export default function GestaoBarbearia() {
  useEffect(() => { injectStyles(); }, []);

  const [abaAtiva, setAbaAtiva] = useState("equipe");
  const [carregando, setCarregando] = useState(true);

  // Equipe
  const [barbeiros, setBarbeiros]         = useState([]);
  const [nomeBarbeiro, setNomeBarbeiro]   = useState("");
  const [emailBarbeiro, setEmailBarbeiro] = useState("");
  const [senhaBarbeiro, setSenhaBarbeiro] = useState("");
  const [salvandoB, setSalvandoB]         = useState(false);
  const [erroB, setErroB]                 = useState("");

  // Serviços
  const [servicos, setServicos]             = useState([]);
  const [nomeServico, setNomeServico]       = useState("");
  const [precoServico, setPrecoServico]     = useState("");
  const [duracaoServico, setDuracaoServico] = useState("");
  const [salvandoS, setSalvandoS]           = useState(false);
  const [erroS, setErroS]                   = useState("");
  const [editandoS, setEditandoS]           = useState(null);

  // Horários
  const [horarios, setHorarios]               = useState(HORARIOS_PADRAO);
  const [salvandoH, setSalvandoH]             = useState(false);
  const [mensagemH, setMensagemH]             = useState("");

  useEffect(() => {
    const carregar = async () => {
      try {
        const snapB = await getDocs(collection(db, "profissionais"));
        const listaB = []; snapB.forEach((d) => listaB.push({ id: d.id, ...d.data() }));
        setBarbeiros(listaB);
        const snapS = await getDocs(collection(db, "servicos"));
        const listaS = []; snapS.forEach((d) => listaS.push({ id: d.id, ...d.data() }));
        setServicos(listaS);
        const docH = await getDoc(doc(db, "configuracoes", "horarios"));
        if (docH.exists()) setHorarios(docH.data());
      } catch (e) { console.error(e); }
      finally { setCarregando(false); }
    };
    carregar();
  }, []);

  // ── Equipe ─────────────────────────────────────────────
  const handleCadastrarBarbeiro = async (e) => {
    e.preventDefault(); setErroB("");
    if (!nomeBarbeiro || !emailBarbeiro || !senhaBarbeiro) { setErroB("Preencha todos os campos."); return; }
    if (senhaBarbeiro.length < 6) { setErroB("Senha deve ter no mínimo 6 caracteres."); return; }
    try {
      setSalvandoB(true);
      const cred = await createUserWithEmailAndPassword(auth, emailBarbeiro, senhaBarbeiro);
      const uid = cred.user.uid;
      await setDoc(doc(db, "usuarios", uid), { nome: nomeBarbeiro, email: emailBarbeiro, role: "barbeiro", criadoEm: new Date().toISOString() });
      await setDoc(doc(db, "profissionais", uid), { nome: nomeBarbeiro, email: emailBarbeiro, ativo: true });
      setBarbeiros((p) => [...p, { id: uid, nome: nomeBarbeiro, email: emailBarbeiro }]);
      setNomeBarbeiro(""); setEmailBarbeiro(""); setSenhaBarbeiro("");
      alert(`Barbeiro "${nomeBarbeiro}" cadastrado!`);
    } catch (err) {
      setErroB(err.code === "auth/email-already-in-use" ? "E-mail já cadastrado." : "Erro ao cadastrar.");
    } finally { setSalvandoB(false); }
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
    e.preventDefault(); setErroS("");
    if (!nomeServico || !precoServico || !duracaoServico) { setErroS("Preencha todos os campos."); return; }
    if (isNaN(precoServico) || Number(precoServico) <= 0) { setErroS("Preço inválido."); return; }
    if (isNaN(duracaoServico) || Number(duracaoServico) <= 0) { setErroS("Duração inválida."); return; }
    try {
      setSalvandoS(true);
      const dados = { nome: nomeServico, preco: Number(precoServico), duracao: Number(duracaoServico) };
      if (editandoS) {
        await updateDoc(doc(db, "servicos", editandoS), dados);
        setServicos((p) => p.map((s) => s.id === editandoS ? { id: editandoS, ...dados } : s));
        setEditandoS(null);
      } else {
        const ref = await addDoc(collection(db, "servicos"), dados);
        setServicos((p) => [...p, { id: ref.id, ...dados }]);
      }
      setNomeServico(""); setPrecoServico(""); setDuracaoServico("");
    } catch { setErroS("Erro ao salvar."); }
    finally { setSalvandoS(false); }
  };

  const handleEditarServico = (s) => {
    setEditandoS(s.id); setNomeServico(s.nome);
    setPrecoServico(String(s.preco)); setDuracaoServico(String(s.duracao || ""));
    setAbaAtiva("servicos"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelarEdicao = () => {
    setEditandoS(null); setNomeServico(""); setPrecoServico(""); setDuracaoServico(""); setErroS("");
  };

  const handleRemoverServico = async (id, nome) => {
    if (!window.confirm(`Remover "${nome}"?`)) return;
    try { await deleteDoc(doc(db, "servicos", id)); setServicos((p) => p.filter((s) => s.id !== id)); }
    catch { alert("Erro ao remover."); }
  };

  // ── Horários ───────────────────────────────────────────
  const handleSalvarHorarios = async () => {
    try {
      setSalvandoH(true);
      await setDoc(doc(db, "configuracoes", "horarios"), horarios);
      setMensagemH("saved");
      setTimeout(() => setMensagemH(""), 3000);
    } catch { setMensagemH("error"); }
    finally { setSalvandoH(false); }
  };

  const atualizarDia = (dia, campo, valor) => setHorarios((p) => ({ ...p, [dia]: { ...p[dia], [campo]: valor } }));

  if (carregando) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "28px", opacity: 0.2, marginBottom: "12px" }}>✂</div>
        <p style={{ color: "var(--grey-400, #9a9a9a)", fontSize: "14px" }}>Carregando...</p>
      </div>
    </div>
  );

  return (
    <div className="gb-outer" style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
          Administração
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--black, #111)", letterSpacing: "-0.02em", margin: 0 }}>
          Gestão da Barbearia
        </h1>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", borderBottom: "1.5px solid var(--grey-100, #ebebeb)", marginBottom: "28px" }}>
        <button className={`gb-tab ${abaAtiva === "equipe" ? "active" : ""}`} onClick={() => setAbaAtiva("equipe")}>Equipe</button>
        <button className={`gb-tab ${abaAtiva === "servicos" ? "active" : ""}`} onClick={() => setAbaAtiva("servicos")}>Serviços</button>
        <button className={`gb-tab ${abaAtiva === "horarios" ? "active" : ""}`} onClick={() => setAbaAtiva("horarios")}>Horários</button>
      </div>

      {/* ══════ ABA EQUIPE ══════ */}
      {abaAtiva === "equipe" && (
        <>
          {/* Formulário */}
          <div className="gb-card">
            <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 20px 0" }}>
              Adicionar Barbeiro
            </p>
            {erroB && <div className="gb-erro">{erroB}</div>}
            <form onSubmit={handleCadastrarBarbeiro}>
              <div className="gb-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="gb-label">Nome completo</label>
                  <input className="gb-input" type="text" value={nomeBarbeiro} onChange={(e) => setNomeBarbeiro(e.target.value)} placeholder="Ex: Alan Silva" />
                </div>
                <div>
                  <label className="gb-label">E-mail</label>
                  <input className="gb-input" type="email" value={emailBarbeiro} onChange={(e) => setEmailBarbeiro(e.target.value)} placeholder="barbeiro@email.com" />
                </div>
                <div>
                  <label className="gb-label">Senha provisória</label>
                  <input className="gb-input" type="password" value={senhaBarbeiro} onChange={(e) => setSenhaBarbeiro(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
              <button type="submit" className="gb-btn-primary" disabled={salvandoB} style={{ width: "100%" }}>
                {salvandoB ? "Cadastrando..." : "+ Cadastrar Barbeiro"}
              </button>
            </form>
          </div>

          {/* Lista */}
          <div className="gb-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Equipe</p>
              <span style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", backgroundColor: "var(--grey-100, #ebebeb)", padding: "3px 10px", borderRadius: "999px", fontWeight: "600" }}>
                {barbeiros.length} {barbeiros.length === 1 ? "barbeiro" : "barbeiros"}
              </span>
            </div>
            {barbeiros.length === 0 ? (
              <div className="gb-empty">Nenhum barbeiro cadastrado ainda.</div>
            ) : (
              barbeiros.map((b) => (
                <div key={b.id} className="gb-barbeiro-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--grey-100, #ebebeb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                      ✂
                    </div>
                    <div>
                      <p style={{ margin: "0 0 2px 0", fontWeight: "600", fontSize: "14px" }}>{b.nome}</p>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--grey-400, #9a9a9a)" }}>{b.email}</p>
                    </div>
                  </div>
                  <button className="gb-btn-danger" onClick={() => handleRemoverBarbeiro(b.id, b.nome)}>Remover</button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ══════ ABA SERVIÇOS ══════ */}
      {abaAtiva === "servicos" && (
        <>
          {/* Formulário */}
          <div className="gb-card">
            <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 20px 0" }}>
              {editandoS ? "Editar Serviço" : "Adicionar Serviço"}
            </p>
            {erroS && <div className="gb-erro">{erroS}</div>}
            <form onSubmit={handleSalvarServico}>
              <div className="gb-servico-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="gb-label">Nome do serviço</label>
                  <input className="gb-input" type="text" value={nomeServico} onChange={(e) => setNomeServico(e.target.value)} placeholder="Ex: Corte Masculino" />
                </div>
                <div>
                  <label className="gb-label">Preço (R$)</label>
                  <input className="gb-input" type="number" min="0" step="0.01" value={precoServico} onChange={(e) => setPrecoServico(e.target.value)} placeholder="45,00" />
                </div>
                <div>
                  <label className="gb-label">Duração (min)</label>
                  <input className="gb-input" type="number" min="5" step="5" value={duracaoServico} onChange={(e) => setDuracaoServico(e.target.value)} placeholder="40" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className="gb-btn-primary" disabled={salvandoS} style={{ flex: 1 }}>
                  {salvandoS ? "Salvando..." : editandoS ? "Salvar Alterações" : "+ Adicionar Serviço"}
                </button>
                {editandoS && (
                  <button type="button" className="gb-btn-secondary" onClick={handleCancelarEdicao}>Cancelar</button>
                )}
              </div>
            </form>
          </div>

          {/* Lista */}
          <div className="gb-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Serviços</p>
              <span style={{ fontSize: "12px", color: "var(--grey-400, #9a9a9a)", backgroundColor: "var(--grey-100, #ebebeb)", padding: "3px 10px", borderRadius: "999px", fontWeight: "600" }}>
                {servicos.length} {servicos.length === 1 ? "serviço" : "serviços"}
              </span>
            </div>
            {servicos.length === 0 ? (
              <div className="gb-empty">Nenhum serviço cadastrado ainda.</div>
            ) : (
              servicos.map((s) => (
                <div key={s.id} className={`gb-servico-row ${editandoS === s.id ? "editing" : ""}`}>
                  <div>
                    <p style={{ margin: "0 0 3px 0", fontWeight: "600", fontSize: "15px" }}>{s.nome}</p>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--grey-400, #9a9a9a)" }}>{s.duracao ? `${s.duracao} min` : "—"}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontWeight: "700", fontSize: "16px", color: "var(--black, #111)" }}>
                      R$ {Number(s.preco).toFixed(2).replace(".", ",")}
                    </span>
                    <button className="gb-btn-edit" onClick={() => handleEditarServico(s)}>Editar</button>
                    <button className="gb-btn-danger" onClick={() => handleRemoverServico(s.id, s.nome)}>Remover</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ══════ ABA HORÁRIOS ══════ */}
      {abaAtiva === "horarios" && (
        <div className="gb-card">
          <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--grey-400, #9a9a9a)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px 0" }}>
            Horários de Funcionamento
          </p>
          <p style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)", margin: "0 0 24px 0" }}>
            Os clientes só poderão agendar nos horários definidos aqui.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
            {DIAS.map(({ key, label }) => (
              <div key={key} className="gb-dia-row">
                <span className="gb-dia-label" style={{ fontWeight: "600", fontSize: "14px", minWidth: "140px" }}>{label}</span>

                {/* Toggle */}
                <label className="gb-toggle">
                  <input type="checkbox" checked={horarios[key]?.aberto || false} onChange={(e) => atualizarDia(key, "aberto", e.target.checked)} />
                  <span className="gb-toggle-slider" />
                </label>
                <span style={{ fontSize: "13px", fontWeight: "600", color: horarios[key]?.aberto ? "var(--black, #111)" : "var(--grey-400, #9a9a9a)", minWidth: "56px" }}>
                  {horarios[key]?.aberto ? "Aberto" : "Fechado"}
                </span>

                <input type="time" className="gb-time-input"
                  value={horarios[key]?.abertura || "09:00"}
                  onChange={(e) => atualizarDia(key, "abertura", e.target.value)}
                  disabled={!horarios[key]?.aberto} />

                <span style={{ fontSize: "13px", color: "var(--grey-400, #9a9a9a)" }}>até</span>

                <input type="time" className="gb-time-input"
                  value={horarios[key]?.fechamento || "19:00"}
                  onChange={(e) => atualizarDia(key, "fechamento", e.target.value)}
                  disabled={!horarios[key]?.aberto} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="gb-btn-primary" onClick={handleSalvarHorarios} disabled={salvandoH}>
              {salvandoH ? "Salvando..." : "Salvar Horários"}
            </button>
            {mensagemH === "saved" && (
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#2d6a4f", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#d8f3dc", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>✓</span>
                Horários salvos!
              </span>
            )}
            {mensagemH === "error" && (
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#c1121f" }}>Erro ao salvar.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
