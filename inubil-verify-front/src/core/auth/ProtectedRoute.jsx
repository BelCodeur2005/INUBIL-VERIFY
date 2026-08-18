import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';

export default function ProtectedRoute({ children, rolesAutorises }) {
  const { utilisateur, estConnecte, loading } = useAuth();
  const location = useLocation();

  // 1. En cours de chargement de la session (vérification du localStorage)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 2. Si l'utilisateur n'est pas connecté -> redirection vers le login
  if (!estConnecte) {
    // On sauvegarde l'URL demandée pour y rediriger l'utilisateur après sa connexion
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 3. Si l'utilisateur est connecté mais n'a pas le bon rôle -> redirection vers 403 Forbidden
  if (rolesAutorises && !rolesAutorises.includes(utilisateur.role)) {
    return <Navigate to="/403" replace />;
  }

  // 4. Tout est au vert -> on affiche la page demandée
  return children;
}