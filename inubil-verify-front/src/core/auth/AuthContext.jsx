import { useState } from 'react';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => {
    const savedUser = localStorage.getItem('inubil_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading] = useState(false);

  const login = (email, password) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    const fauxUtilisateur = {
      id: '1',
      email: email,
      nom: 'N.',
      prenom: 'Merveil',
      role: 'super_admin',
      avatar_url: null
    };
    setUtilisateur(fauxUtilisateur);
    localStorage.setItem('inubil_session', JSON.stringify(fauxUtilisateur));
    return '/universite';
  };

  const logout = () => {
    setUtilisateur(null);
    localStorage.removeItem('inubil_session');
    window.location.href = '/login';
  };

  const nomComplet = () => {
    if (!utilisateur) return 'Marie Ngo';
    return `${utilisateur.prenom} ${utilisateur.nom}`.trim();
  };

  const value = {
    utilisateur,
    loading,
    login,
    logout,
    nomComplet,
    estConnecte: true
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
