import { useAuth } from '../../../core/auth/useAuth';
import MonCompte from '../../../shared/components/MonCompte/MonCompte';

const ROLE_LABELS = {
  agent_saisie: 'Agent de Saisie',
  directeur_pedagogique: 'Directeur Pédagogique',
  responsable_universite: 'Responsable Université',
};

export default function MonComptePage() {
  const { utilisateur } = useAuth();
  const roleNom = utilisateur?.role?.nom;
  return <MonCompte roleLabel={ROLE_LABELS[roleNom] ?? roleNom ?? ''} />;
}
