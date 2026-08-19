import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import styles from './ProtectedRoute.module.css';

export default function ProtectedRoute({ children, rolesAutorises }) {
  const { utilisateur, estConnecte, loading } = useAuth();
  const location = useLocation();

  // 1. En cours de chargement de la session (vérification du localStorage)
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  // 2. Si l'utilisateur n'est pas connecté -> redirection vers le login
  if (!estConnecte) {
    // On sauvegarde l'URL demandée pour y rediriger l'utilisateur après sa connexion
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Si l'utilisateur est connecté mais n'a pas le bon rôle -> redirection vers 403 Forbidden
  // utilisateur.role est { id, nom } (forme de ProfileResponseDto), pas une chaîne.
  if (rolesAutorises && !rolesAutorises.includes(utilisateur.role?.nom)) {
    return <Navigate to="/403" replace />;
  }

  // 4. Tout est au vert -> on affiche la page demandée
  return children;
}