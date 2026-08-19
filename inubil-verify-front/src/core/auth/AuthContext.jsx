import { useState, useEffect } from 'react';
import { AuthContext } from './auth-context';
import { login as loginApi, logout as logoutApi, getProfil } from './auth.api';
import { getAccessToken, clearTokens } from '../api/token-storage';
import { redirectionParRole } from './role-redirect';

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaure la session au chargement de l'app si un token est deja present (retour de visite).
  useEffect(() => {
    let annule = false;

    async function restaurerSession() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const profil = await getProfil();
        if (!annule) setUtilisateur(profil);
      } catch {
        clearTokens();
      } finally {
        if (!annule) setLoading(false);
      }
    }

    restaurerSession();
    return () => {
      annule = true;
    };
  }, []);

  const login = async (email, motDePasse) => {
    await loginApi(email, motDePasse);
    const profil = await getProfil();
    setUtilisateur(profil);
    return redirectionParRole(profil.role?.nom);
  };

  const logout = async () => {
    await logoutApi();
    setUtilisateur(null);
    window.location.href = '/login';
  };

  const nomComplet = () => {
    if (!utilisateur) return '';
    return `${utilisateur.prenom} ${utilisateur.nom}`.trim();
  };

  const value = {
    utilisateur,
    loading,
    login,
    logout,
    nomComplet,
    estConnecte: !!utilisateur,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
