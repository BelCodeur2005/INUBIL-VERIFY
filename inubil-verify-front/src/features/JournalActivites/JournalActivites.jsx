import JournalAudit from '../../shared/components/JournalAudit/JournalAudit';
import styles from './JournalActivites.module.css';

// Journal d'activite de l'etablissement (/universite/journal, reserve a
// responsable_universite) — GET /admin/audit, scope automatiquement a
// l'universite de l'acteur cote backend (permission audit:read, cf. seed.ts).
// Remplace l'ancienne version 100% mockee (fausses transactions blockchain).
export default function JournalActivites() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Journal d'activité</h1>
        <p className={styles.subtitle}>Traçabilité des actions réalisées sur les comptes et documents de votre établissement.</p>
      </div>
      <JournalAudit titre="Entrées" sousTitre="Uniquement les actions liées à votre établissement." />
    </div>
  );
}
