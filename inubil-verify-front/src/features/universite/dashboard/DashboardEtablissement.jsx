import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import styles from './DashboardEtablissement.module.css';
import Ajout_Unitaire from '../../../shared/components/Ajout_Unitaire';
import { Link } from 'react-router-dom';

const IconTotal = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const IconSignature = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconAncre = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const IconNoeud = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="1.5">
    <circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="12" r="2"/>
    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
    <line x1="12" y1="7" x2="12" y2="10"/><line x1="14" y1="12" x2="17" y2="12"/>
    <line x1="7" y1="12" x2="10" y2="12"/><line x1="12" y1="14" x2="12" y2="17"/>
  </svg>
);

const IconRegistre = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function DashboardEtablissement() {
  const { isModalOpen, setIsModalOpen } = useOutletContext();
  


  const [diplomes] = useState([
    { matricule: 'FS-240188', etudiant: 'Mbarga Lucien',  filiere: 'L3 Info-Réseaux',    date: '12 Mai 2024', preuve: '0x8a1...f3e9',          statut: 'ANCRÉ'      },
    { matricule: 'FS-240192', etudiant: 'Ngassa Chantal', filiere: 'M1 Bio-Chimie',       date: '14 Mai 2024', preuve: 'Génération en cours...', statut: 'EN RÉVISION' },
    { matricule: 'FS-240056', etudiant: 'Kamga Junior',   filiere: 'L2 Mathématiques',    date: '15 Mai 2024', preuve: 'ERR_HASH_MISMATCH',       statut: 'REJETÉ'     },
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

      {/* ── STATS ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>TOTAL</span>
            <IconTotal />
          </div>
          <div className={styles.statBottom}>
            <span className={styles.statNum}>1,428</span>
            <span className={styles.badgeGreen}>+120 s/s</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Signature en attente</span>
            <IconSignature />
          </div>
          <div className={styles.statBottom}>
            <span className={styles.statNumAmber}>45</span>
            <span className={styles.dotAmber}></span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>Ancrés</span>
            <IconAncre />
          </div>
          <div className={styles.statBottom}>
            <span className={styles.statNumGreen}>1,381</span>
            <span className={styles.subLabel}>96.7% Intégrité</span>
          </div>
        </div>

        <div className={styles.nodeCard}>
          <div className={styles.nodeTop}>
            <span className={styles.nodeLabel}>STATUT DU NŒUD</span>
            <IconNoeud />
          </div>
          <div className={styles.nodeStatus}>SYNCHRONISÉ</div>
          <div className={styles.nodeFooter}>Latence: 12ms | Réseau Principal B</div>
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className={styles.mainGrid}>

        {/* TABLE */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              <IconRegistre />
              GRILLE DU REGISTRE CENTRAL
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
                    <td className={styles.bold}>{item.etudiant.split(' ').map((w,i) => <span key={i}>{w}<br/></span>)}</td>
                    <td>{item.filiere}</td>
                    <td className={styles.dateCell}>{item.date.replace(' ', '\u00a0')}</td>
                    <td>
                      {item.statut === 'ANCRÉ' && <span className={styles.hashPill}>{item.preuve}</span>}
                      {item.statut === 'EN RÉVISION' && <span className={styles.hashItalic}>{item.preuve}</span>}
                      {item.statut === 'REJETÉ' && <span className={styles.hashError}>{item.preuve}</span>}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${
                        item.statut === 'ANCRÉ'       ? styles.badgeAncre    :
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
            <span className={styles.paginInfo}>Affichage de 1 à 10 sur 1 428 enregistrements</span>
            <div className={styles.paginBtns}>
              <button className={styles.paginBtn}>‹</button>
              <button className={`${styles.paginBtn} ${styles.paginActive}`}>1</button>
              <button className={styles.paginBtn}>2</button>
              <button className={styles.paginBtn}>3</button>
              <button className={styles.paginBtn}>›</button>
            </div>
          </div>
        </div>

        {/* SIDEBAR DROITE */}
        <div className={styles.sidebar}>

          {/* Actions */}
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>ACTIONS DE SAISIE IMMÉDIATE</h4>
            <button
              className={styles.actionDark}
              onClick={() => setIsModalOpen(true)}
            >
            
              <span className={styles.actionIconBox}><IconPlus /></span>
              <span className={styles.actionTexts}>
                <span className={styles.actionMain}>Nouveau Certificat</span>
                <span className={styles.actionSub}>Formulaire assisté par IA</span>
              </span>
              <IconArrow />
            </button>

            
          </div>

          {/* Journal */}
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>JOURNAL DES ACTIVITÉS</h4>
            <div className={styles.journalItem}>
              <span className={styles.journalCheckIcon}><IconCheck /></span>
              <div>
                <span className={styles.journalMain}>Ancrage Réussi #BK-992</span>
                <span className={styles.journalTime}>Il y a 4 min • Nœud Central</span>
              </div>
            </div>
            <Link to="/universite/journal" className={styles.btnJournal}>
              VOIR TOUT LE JOURNAL ↗
            </Link>
          </div>

        </div>
      </div>
      {/* Rendu de la modale branché sur le State */}
      <Ajout_Unitaire 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

