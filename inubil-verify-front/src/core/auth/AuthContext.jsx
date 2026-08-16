import { createContext, useState, useEffect } from 'react';

// Ajout de "export" ici pour que useAuth puisse y accéder
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [loading, setLoading] = useState(false); 

  useEffect(() => {
    const savedUser = localStorage.getItem('inubil_session');
    if (savedUser) {
      setUtilisateur(JSON.parse(savedUser));
    }
  }, []);

  const login = (email, password) => {
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