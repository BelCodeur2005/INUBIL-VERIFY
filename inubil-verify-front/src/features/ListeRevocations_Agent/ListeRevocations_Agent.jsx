import { useState } from 'react';

// Importation relative du CSS existant du dashboard
import styles from '../universite/dashboard/DashboardEtablissement.module.css';

const IconRevocation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
  </svg>
);

export default function Revocations() {
  const [revocations] = useState([
    { matricule: 'FS-240056', etudiant: 'Kamga Junior', filiere: 'L2 Mathématiques', date: '15 Mai 2024', motif: 'Fraude documentaire', statut: 'RÉVOQUÉ' },
    { matricule: 'FS-239912', etudiant: 'Bello Amadou', filiere: 'M2 Informatique', date: '02 Avril 2024', motif: 'Erreur d’attribution', statut: 'RÉVOQUÉ' },
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>
            <IconRevocation />
            REGISTRE DES DIPLÔMES RÉVOQUÉS
          </div>
          <div className={styles.tableActions}>
            <button className={styles.btnOutline}>FILTRER</button>
            <button className={styles.btnOutline}>EXPORTER CSV</button>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>MATRICULE</th>
                <th>ÉTUDIANT</th>
                <th>FILIÈRE</th>
                <th>DATE DE RÉVOCATION</th>
                <th>MOTIF DE RÉVOCATION</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {revocations.map((item, idx) => (
                <tr key={idx}>
                  <td className={styles.mono}>{item.matricule}</td>
                  <td className={styles.bold}>
                    {item.etudiant.split(' ').map((w, i) => (
                      <span key={i}>{w}<br/></span>
                    ))}
                  </td>
                  <td>{item.filiere}</td>
                  <td className={styles.dateCell}>{item.date.replace(' ', '\u00a0')}</td>
                  <td>
                    <span className={styles.hashError}>{item.motif}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.badgeRejete}`}>
                      <span className={styles.dotRed}></span>
                      {item.statut}
                    </span>
                  </td>
                  <td>
                    <button className={styles.iconBtn}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.paginInfo}>Affichage de 1 à 2 sur 2 enregistrements</span>
          <div className={styles.paginBtns}>
            <button className={styles.paginBtn}>‹</button>
            <button className={`${styles.paginBtn} ${styles.paginActive}`}>1</button>
            <button className={styles.paginBtn}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}