import { useState, useEffect } from 'react';
import { AuthContext } from './auth-context';
import { login as loginApi, logout as logoutApi, getProfil } from './auth.api';
import { getAccessToken, clearTokens } from '../api/token-storage';
import { redirectionParRole } from './role-redirect';
import { applyColorTheme } from '../theme/applyColorTheme';

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

  // Applique la couleur de marque de l'universite (ou revient au bleu INUBIL par defaut).
  useEffect(() => {
    applyColorTheme(utilisateur?.universite?.couleur_primaire);
  }, [utilisateur?.universite?.couleur_primaire]);

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

  // Recharge le profil sans re-authentifier — utilise apres une modification qui doit se refleter
  // immediatement dans l'UI (ex : logo/nom de l'etablissement change depuis Parametres).
  const rafraichirProfil = async () => {
    if (!getAccessToken()) return;
    const profil = await getProfil();
    setUtilisateur(profil);
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
    rafraichirProfil,
    nomComplet,
    estConnecte: !!utilisateur,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
