import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [role, setRole] = useState(null); // "dono", "barbeiro" ou "cliente"
  const [carregandoContexto, setCarregandoContexto] = useState(true);

  function cadastrar(email, senha) {
    return createUserWithEmailAndPassword(auth, email, senha);
  }

  function logar(email, senha) {
    return signInWithEmailAndPassword(auth, email, senha);
  }

  function deslogar() {
    setRole(null);
    return signOut(auth);
  }

  // Monitora o estado de autenticação e busca a role no Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuarioLogado(user);

        // Busca o documento do usuário no Firestore usando o uid como ID
        try {
          const docRef = doc(db, "usuarios", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setRole(docSnap.data().role); // "dono", "barbeiro" ou "cliente"
          } else {
            setRole("cliente"); // fallback seguro caso o doc não exista
          }
        } catch (error) {
          console.error("Erro ao buscar role do usuário:", error);
          setRole("cliente");
        }
      } else {
        setUsuarioLogado(null);
        setRole(null);
      }

      setCarregandoContexto(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ usuarioLogado, role, logar, deslogar, cadastrar }}>
      {!carregandoContexto && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
