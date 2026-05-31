import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const DIAS = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca",   label: "Terça-feira"  },
  { key: "quarta",  label: "Quarta-feira" },
  { key: "quinta",  label: "Quinta-feira" },
  { key: "sexta",   label: "Sexta-feira"  },
  { key: "sabado",  label: "Sábado"       },
  { key: "domingo", label: "Domingo"      },
];

const HORARIOS_PADRAO = DIAS.reduce((acc, dia) => {
  acc[dia.key] = {
    aberto: dia.key !== "domingo",
    abertura: "09:00",
    fechamento: "19:00",
  };
  return acc;
}, {});

export default function GestaoEquipe() {
  // ── Barbeiros ──────────────────────────────────────────
  const [barbeiros, setBarbeiros] = useState([]);
  const [nomeBarbeiro, setNomeBarbeiro] = useState("");
  const [emailBarbeiro, setEmailBarbeiro] = useState("");
  const [senhaBarbeiro, setSenhaBarbeiro] = useState("");
  const [salvandoBarbeiro, setSalvandoBarbeiro] = useState(false);
  const [erroBarbeiro, setErroBarbeiro] = useState("");

  // ── Horários ───────────────────────────────────────────
  const [horarios, setHorarios] = useState(HORARIOS_PADRAO);
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [mensagemHorarios, setMensagemHorarios] = useState("");

  const [carregando, setCarregando] = useState(true);

  // ── Carregar dados ao montar ───────────────────────────
  useEffect(() => {
    const carregar = async () => {
      try {
        // Carrega barbeiros cadastrados
        const snap = await getDocs(collection(db, "profissionais"));
        const lista = [];
        snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        setBarbeiros(lista);

        // Carrega horários salvos
        const docHorarios = await getDoc(doc(db, "configuracoes", "horarios"));
        if (docHorarios.exists()) {
          setHorarios(docHorarios.data());
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  // ── Cadastrar novo barbeiro ────────────────────────────
  const handleCadastrarBarbeiro = async (e) => {
    e.preventDefault();
    setErroBarbeiro("");

    if (!nomeBarbeiro || !emailBarbeiro || !senhaBarbeiro) {
      setErroBarbeiro("Preencha todos os campos.");
      return;
    }
    if (senhaBarbeiro.length < 6) {
      setErroBarbeiro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setSalvandoBarbeiro(true);

      // 1. Cria o usuário no Firebase Authentication
      const credencial = await createUserWithEmailAndPassword(auth, emailBarbeiro, senhaBarbeiro);
      const uid = credencial.user.uid;

      // 2. Salva na coleção "usuarios" com role: "barbeiro"
      await setDoc(doc(db, "usuarios", uid), {
        nome: nomeBarbeiro,
        email: emailBarbeiro,
        role: "barbeiro",
        criadoEm: new Date().toISOString(),
      });

      // 3. Salva na coleção "profissionais" para aparecer no agendamento
      await setDoc(doc(db, "profissionais", uid), {
        nome: nomeBarbeiro,
        email: emailBarbeiro,
        ativo: true,
      });

      // Atualiza a lista local
      setBarbeiros((prev) => [...prev, { id: uid, nome: nomeBarbeiro, email: emailBarbeiro, ativo: true }]);

      // Limpa o formulário
      setNomeBarbeiro("");
      setEmailBarbeiro("");
      setSenhaBarbeiro("");
      alert(`✅ Barbeiro "${nomeBarbeiro}" cadastrado com sucesso!`);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setErroBarbeiro("Este e-mail já está cadastrado no sistema.");
      } else {
        setErroBarbeiro("Erro ao cadastrar. Tente novamente.");
      }
    } finally {
      setSalvandoBarbeiro(false);
    }
  };

  // ── Remover barbeiro ───────────────────────────────────
  const handleRemoverBarbeiro = async (id, nome) => {
    if (!window.confirm(`Remover "${nome}" da equipe? Ele não aparecerá mais para os clientes.`)) return;
    try {
      await deleteDoc(doc(db, "profissionais", id));
      setBarbeiros((prev) => prev.filter((b) => b.id !== id));
      alert("Barbeiro removido da equipe.");
    } catch (e) {
      console.error(e);
      alert("Erro ao remover barbeiro.");
    }
  };

  // ── Salvar horários de funcionamento ──────────────────
  const handleSalvarHorarios = async () => {
    try {
      setSalvandoHorarios(true);
      setMensagemHorarios("");
      await setDoc(doc(db, "configuracoes", "horarios"), horarios);
      setMensagemHorarios("✅ Horários salvos com sucesso!");
      setTimeout(() => setMensagemHorarios(""), 3000);
    } catch (e) {
      console.error(e);
      setMensagemHorarios("❌ Erro ao salvar. Tente novamente.");
    } finally {
      setSalvandoHorarios(false);
    }
  };

  const atualizarDia = (dia, campo, valor) => {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  };

  if (carregando) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
        <h3>Carregando...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>

      <h2 style={{ color: "#111", borderBottom: "2px solid #eee", paddingBottom: "15px", marginBottom: "40px" }}>
        👥 Gestão da Equipe
      </h2>

      {/* ─── SEÇÃO: CADASTRAR BARBEIRO ─────────────────────── */}
      <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase" }}>
          Adicionar Novo Barbeiro
        </h3>

        {erroBarbeiro && (
          <p style={{ color: "#dc3545", backgroundColor: "#fde8e8", padding: "10px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", marginBottom: "15px" }}>
            {erroBarbeiro}
          </p>
        )}

        <form onSubmit={handleCadastrarBarbeiro} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "5px", gridColumn: "1 / -1" }}>
            <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Nome Completo</span>
            <input
              type="text"
              value={nomeBarbeiro}
              onChange={(e) => setNomeBarbeiro(e.target.value)}
              placeholder="Ex: Alan Silva"
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>E-mail de Acesso</span>
            <input
              type="email"
              value={emailBarbeiro}
              onChange={(e) => setEmailBarbeiro(e.target.value)}
              placeholder="barbeiro@email.com"
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ fontWeight: "600", fontSize: "13px", color: "#555" }}>Senha Provisória</span>
            <input
              type="password"
              value={senhaBarbeiro}
              onChange={(e) => setSenhaBarbeiro(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
            />
          </label>

          <button
            type="submit"
            disabled={salvandoBarbeiro}
            style={{ gridColumn: "1 / -1", padding: "12px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", marginTop: "5px" }}
          >
            {salvandoBarbeiro ? "Cadastrando..." : "➕ Cadastrar Barbeiro"}
          </button>
        </form>
      </div>

      {/* ─── SEÇÃO: LISTA DA EQUIPE ───────────────────────── */}
      <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", marginBottom: "40px" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase" }}>
          Equipe Atual ({barbeiros.length} barbeiro{barbeiros.length !== 1 ? "s" : ""})
        </h3>

        {barbeiros.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: "20px", border: "1px dashed #ccc", borderRadius: "8px" }}>
            Nenhum barbeiro cadastrado ainda.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#111", color: "#fff" }}>
                <th style={{ padding: "10px 15px", textAlign: "left" }}>Nome</th>
                <th style={{ padding: "10px 15px", textAlign: "left" }}>E-mail</th>
                <th style={{ padding: "10px 15px", textAlign: "center" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {barbeiros.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px 15px", fontWeight: "500" }}>{b.nome}</td>
                  <td style={{ padding: "12px 15px", color: "#666", fontSize: "14px" }}>{b.email}</td>
                  <td style={{ padding: "12px 15px", textAlign: "center" }}>
                    <button
                      onClick={() => handleRemoverBarbeiro(b.id, b.nome)}
                      style={{ padding: "6px 12px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── SEÇÃO: HORÁRIOS DE FUNCIONAMENTO ────────────── */}
      <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#444", textTransform: "uppercase" }}>
          🕐 Horários de Funcionamento
        </h3>
        <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px", marginTop: "-10px" }}>
          Os clientes só poderão agendar dentro dos horários definidos aqui.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {DIAS.map(({ key, label }) => (
            <div key={key} style={{ display: "grid", gridTemplateColumns: "160px 100px 120px 120px", alignItems: "center", gap: "15px", padding: "12px 15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
              <span style={{ fontWeight: "600", fontSize: "14px" }}>{label}</span>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={horarios[key]?.aberto || false}
                  onChange={(e) => atualizarDia(key, "aberto", e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                {horarios[key]?.aberto ? "Aberto" : "Fechado"}
              </label>

              <input
                type="time"
                value={horarios[key]?.abertura || "09:00"}
                onChange={(e) => atualizarDia(key, "abertura", e.target.value)}
                disabled={!horarios[key]?.aberto}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", backgroundColor: horarios[key]?.aberto ? "#fff" : "#eee", cursor: horarios[key]?.aberto ? "pointer" : "not-allowed" }}
              />

              <input
                type="time"
                value={horarios[key]?.fechamento || "19:00"}
                onChange={(e) => atualizarDia(key, "fechamento", e.target.value)}
                disabled={!horarios[key]?.aberto}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "13px", backgroundColor: horarios[key]?.aberto ? "#fff" : "#eee", cursor: horarios[key]?.aberto ? "pointer" : "not-allowed" }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: "25px", display: "flex", alignItems: "center", gap: "20px" }}>
          <button
            onClick={handleSalvarHorarios}
            disabled={salvandoHorarios}
            style={{ padding: "12px 30px", backgroundColor: "#111", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}
          >
            {salvandoHorarios ? "Salvando..." : "💾 Salvar Horários"}
          </button>

          {mensagemHorarios && (
            <span style={{ fontSize: "14px", fontWeight: "bold", color: mensagemHorarios.startsWith("✅") ? "#28a745" : "#dc3545" }}>
              {mensagemHorarios}
            </span>
          )}
        </div>
      </div>  
    </div>
  );
}
