import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [carregandoContexto, setCarregandoContexto] = useState(true);

  // Função para Cadastrar Usuário
  function cadastrar(email, senha) {
    return createUserWithEmailAndPassword(auth, email, senha);
  }

  // Função para Fazer Login
  function logar(email, senha) {
    return signInWithEmailAndPassword(auth, email, senha);
  }

  // Função para Deslogar
  function deslogar() {
    return signOut(auth);
  }

  // Monitora em tempo real se o usuário está logado ou não no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioLogado(user);
      setCarregandoContexto(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ usuarioLogado, logar, deslogar, cadastrar }}>
      {!carregandoContexto && children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto facilmente nas páginas
export function useAuth() {
  return useContext(AuthContext);
}