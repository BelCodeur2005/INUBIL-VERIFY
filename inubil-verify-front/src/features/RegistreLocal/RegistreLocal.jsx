import { useState } from 'react';
import styles from '../universite/dashboard/DashboardEtablissement.module.css';

const IconRegistre = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

export default function RegistreLocal() {
  const [diplomes] = useState([
    { matricule: 'FS-240188', etudiant: 'Mbarga Lucien', filiere: 'L3 Info-Réseaux', date: '12 Mai 2024', preuve: '0x8a1...f3e9', statut: 'ANCRÉ' },
    { matricule: 'FS-240192', etudiant: 'Ngassa Chantal', filiere: 'M1 Bio-Chimie', date: '14 Mai 2024', preuve: 'Génération en cours...', statut: 'EN RÉVISION' },
    { matricule: 'FS-240056', etudiant: 'Kamga Junior', filiere: 'L2 Mathématiques', date: '15 Mai 2024', preuve: 'ERR_HASH_MISMATCH', statut: 'REJETÉ' },
  ]);

  const actionIcon = (statut) => {
    if (statut === 'ANCRÉ') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    );
    if (statut === 'EN RÉVISION') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>
            <IconRegistre />
            REGISTRE LOCAL DE L'ÉTABLISSEMENT
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
                <th>DATE</th>
                <th>PREUVE D'ANCRAGE</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {diplomes.map((item, idx) => (
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
                    {item.statut === 'ANCRÉ' && <span className={styles.hashPill}>{item.preuve}</span>}
                    {item.statut === 'EN RÉVISION' && <span className={styles.hashItalic}>{item.preuve}</span>}
                    {item.statut === 'REJETÉ' && <span className={styles.hashError}>{item.preuve}</span>}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${
                      item.statut === 'ANCRÉ' ? styles.badgeAncre :
                      item.statut === 'EN RÉVISION' ? styles.badgeRevision :
                      styles.badgeRejete
                    }`}>
                      {item.statut === 'ANCRÉ' && <span className={styles.dotGreen}></span>}
                      {item.statut === 'REJETÉ' && <span className={styles.dotRed}></span>}
                      {item.statut}
                    </span>
                  </td>
                  <td>
                    <button className={styles.iconBtn}>{actionIcon(item.statut)}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.paginInfo}>Affichage de 1 à 10 sur 1 200 enregistrements</span>
          <div className={styles.paginBtns}>
            <button className={styles.paginBtn}>‹</button>
            <button className={`${styles.paginBtn} ${styles.paginActive}`}>1</button>
            <button className={styles.paginBtn}>2</button>
            <button className={styles.paginBtn}>3</button>
            <button className={styles.paginBtn}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}