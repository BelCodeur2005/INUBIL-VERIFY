import { useEffect, useState } from 'react';
import { getMesStatistiques, listerMesDocuments } from '../../core/etudiants/etudiants.api';
import { ApiError } from '../../core/api/client';
import styles from './DashboardEtudiant.module.css';

const STATUT_LABEL = {
  actif:         { label: 'Actif',    classe: 'statusActif' },
  en_validation: { label: 'En cours', classe: 'statusEnCours' },
  brouillon:     { label: 'En cours', classe: 'statusEnCours' },
  revoque:       { label: 'Révoqué',  classe: 'statusRevoque' },
  expire:        { label: 'Expiré',   classe: 'statusExpireDoc' },
};

export default function AccueilEtudiant({ prenom, setActiveMenu }) {
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const [reponseStats, reponseDocs] = await Promise.all([
          getMesStatistiques(),
          listerMesDocuments({ limit: 2 }),
        ]);
        setStats(reponseStats);
        setDocuments(reponseDocs.data);
      } catch (err) {
        setErreur(err instanceof ApiError ? err.message : 'Impossible de charger votre tableau de bord');
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  if (chargement) {
    return <div className={styles.accueilEtatVide}>Chargement de votre espace...</div>;
  }

  if (erreur) {
    return <div className={styles.accueilEtatVide}>{erreur}</div>;
  }

  return (
    <>
      {/* Welcome Banner */}
      <section className={styles.welcomeBanner}>
        <div className={styles.bannerContent}>
          <h1 className={styles.bannerTitle}>Bonjour, {prenom || 'Étudiant'} !</h1>
          <p className={styles.bannerDesc}>
            Bienvenue sur votre espace sécurisé INUBIL. Vos titres académiques sont ancrés sur la blockchain pour une intégrité totale.
          </p>
        </div>
        <button className={styles.shareProfileBtn} onClick={() => setActiveMenu('partages')}>
          <span className="material-symbols-outlined">share</span> Partager un diplôme
        </button>
      </section>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconContainer} ${styles.iconCertified}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <div>
            <p className={styles.statLabel}>Diplômes Certifiés</p>
            <h3 className={styles.statCount}>{stats.documents.actifs}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconContainer} ${styles.iconPending}`}>
            <span className="material-symbols-outlined">hourglass_empty</span>
          </div>
          <div>
            <p className={styles.statLabel}>En Attente</p>
            <h3 className={styles.statCount}>{stats.documents.en_validation}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconContainer} ${styles.iconViews}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
          </div>
          <div>
            <p className={styles.statLabel}>Vérifications reçues</p>
            <h3 className={styles.statCount}>{stats.verifications.total}</h3>
          </div>
        </div>
      </div>

      {/* Degrees Section */}
      <section className={styles.degreesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Mes Diplômes récents</h2>
          <button
            className={styles.seeAllLink}
            onClick={() => setActiveMenu('diplomas')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Tout Voir <span className="material-symbols-outlined">open_in_new</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className={styles.accueilEtatVide}>Aucun diplôme n'a encore été émis à votre nom.</div>
        ) : (
          <div className={styles.degreesGrid}>
            {documents.map((doc) => {
              const visuel = STATUT_LABEL[doc.statut] ?? STATUT_LABEL.en_validation;
              return (
                <div key={doc.id} className={styles.degreeCard}>
                  <div className={styles.cardBody}>
                    <div className={styles.cardMainRow}>
                      <div className={styles.degreeTitles}>
                        <h3 className={styles.degreeName}>
                          {doc.type_document}{doc.filiere ? ` — ${doc.filiere}` : ''}
                        </h3>
                        <p className={styles.degreeInstitution}>{doc.universite}</p>
                      </div>
                      <span className={`${styles.statusBadge} ${styles[visuel.classe]}`}>{visuel.label}</span>
                    </div>

                    <div className={styles.metadataGrid}>
                      <div className={styles.metaBlock}>
                        <span className={styles.metaLabel}>Mention</span>
                        <p className={styles.metaValue}>{doc.mention ?? '—'}</p>
                      </div>
                      <div className={styles.metaBlock}>
                        <span className={styles.metaLabel}>Numéro</span>
                        <p className={styles.metaValue}>{doc.numero_unique}</p>
                      </div>
                    </div>

                    <div className={styles.cardActionGroup}>
                      <button className={styles.viewDegreeBtn} onClick={() => setActiveMenu('diplomas')}>
                        <span className="material-symbols-outlined">visibility</span> Voir mes diplômes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Security Tip Footer */}
      <footer className={styles.securityTipFooter}>
        <div className={styles.securityTipIconBox}>
          <span className="material-symbols-outlined">gavel</span>
        </div>
        <div className={styles.securityTipTexts}>
          <h5 className={styles.securityTipTitle}>Conseil de sécurité</h5>
          <p className={styles.securityTipDesc}>
            Ne partagez jamais vos identifiants INUBIL. Pour permettre à un recruteur de consulter vos titres, utilisez uniquement le bouton de partage.
          </p>
        </div>
      </footer>
    </>
  );
}
