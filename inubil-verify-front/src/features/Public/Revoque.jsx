import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Revoque.module.css';
import PublicHeader from './PublicHeader';

const LABELS_RESEAU = {
  polygon_amoy: 'Polygon Amoy (Testnet)',
  polygon_mainnet: 'Polygon Mainnet',
};

const TITRES_RESULTAT = {
  revoque: 'DOCUMENT RÉVOQUÉ',
  non_trouve: 'DOCUMENT INTROUVABLE',
  falsifie: 'DOCUMENT NON AUTHENTIQUE',
};

const STATUTS_RESULTAT = {
  revoque: 'RÉVOQUÉ',
  non_trouve: 'INTROUVABLE',
  falsifie: 'NON AUTHENTIQUE',
};

function fmtDateHeure(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Rendu des resultats "revoque" / "non_trouve" / "falsifie" de la verification publique.
 * onRetry par defaut renvoie vers le formulaire ; on peut le remplacer (ex: reset local
 * quand ce composant est affiche en ligne apres un upload/hash raté).
 */
export default function Revoque({ resultat, message, hashSoumis, blockchain, verifieLe, onRetry, onNouvelleVerification }) {
  const [copie, setCopie] = useState(false);
  const navigate = useNavigate();

  const handleCopy = () => {
    if (!hashSoumis) return;
    navigator.clipboard.writeText(hashSoumis);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  const reessayer = () => (onRetry ? onRetry() : navigate('/verification-publique'));

  return (
    <div className={styles.page}>
      <PublicHeader onNouvelleVerification={onNouvelleVerification} />

      <main className={styles.main}>
        <div className={styles.mainContainer}>

          {/* BANNIÈRE D'ALERTE */}
          <div className={styles.banner}>
            <div className={styles.bannerIconContainer}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>warning</span>
            </div>
            <div className={styles.bannerText}>
              <div className={styles.bannerTitle}>{TITRES_RESULTAT[resultat] ?? 'DOCUMENT NON AUTHENTIQUE'}</div>
              <div className={styles.bannerDesc}>{message}</div>
            </div>
          </div>

          <div className={styles.grid}>

            {/* CARTE GAUCHE : RAPPORT D'ANALYSE */}
            <div className={styles.leftCard}>
              <div className={styles.watermark}>
                <span className="material-symbols-outlined" style={{ fontSize: '220px' }}>gpp_maybe</span>
              </div>

              <div style={{ position: 'relative', zIndex: 10 }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className="material-symbols-outlined">fact_check</span>
                    Rapport d'Analyse d'Intégrité
                  </div>
                  <span className={styles.badge}>{STATUTS_RESULTAT[resultat] ?? 'ÉCHOUÉ'}</span>
                </div>

                <div className={styles.dataGrid}>
                  <div className={styles.field}>
                    <span className={styles.label}>Statut du Traitement</span>
                    <span className={styles.valueAlert}>{STATUTS_RESULTAT[resultat] ?? 'ÉCHOUÉ'}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Date d'Analyse</span>
                    <span className={styles.valueNormal}>{fmtDateHeure(verifieLe)}</span>
                  </div>
                  {blockchain && (
                    <div className={styles.field}>
                      <span className={styles.label}>Réseau de Vérification</span>
                      <span className={styles.networkValue}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>hub</span>
                        {LABELS_RESEAU[blockchain.reseau] ?? blockchain.reseau}
                      </span>
                    </div>
                  )}
                </div>

                {hashSoumis && (
                  <div>
                    <div className={styles.hashRow}>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.hashLabel}>Empreinte Numérique (Hash SHA-256)</div>
                        <div className={styles.hashCode}>{hashSoumis}</div>
                      </div>
                      <button
                        className={`${styles.copyBtn} ${copie ? styles.copyBtnSuccess : ''}`}
                        onClick={handleCopy}
                        title="Copier le hash"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {copie ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className={styles.actionsBar}>
                  <button className={styles.retryBtn} onClick={reessayer}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                    Réessayer la vérification
                  </button>
                  <a className={styles.supportLink} href="mailto:support@inubil-verify.ac">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
                    Contacter le support
                  </a>
                </div>
              </div>
            </div>

            {/* CARTE DROITE : EXPLICATIONS */}
            <div className={styles.rightCard}>
              <div className={styles.explanationTitle}>
                <span className="material-symbols-outlined">help_outline</span>
                Pourquoi ce résultat ?
              </div>
              <div className={styles.explanationList}>
                <div className={styles.explanationCard}>
                  <p className={styles.explanationCardTitle}>Modification post-émission</p>
                  <p className={styles.explanationCardDesc}>Le fichier original a été altéré. Même un seul pixel ou caractère modifié change l'empreinte blockchain.</p>
                </div>
                <div className={styles.explanationCard}>
                  <p className={styles.explanationCardTitle}>Révocation Administrative</p>
                  <p className={styles.explanationCardDesc}>Le diplôme a été officiellement annulé par l'université émettrice suite à une erreur ou une fraude.</p>
                </div>
                <div className={styles.explanationCard}>
                  <p className={styles.explanationCardTitle}>Document Inexistant</p>
                  <p className={styles.explanationCardDesc}>Aucune preuve d'existence de ce document n'a jamais été enregistrée sur notre registre décentralisé.</p>
                </div>
              </div>
            </div>

          </div>

          <div className={styles.bottomContainer}>
            <p className={styles.bottomText}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock_clock</span>
              Toutes les tentatives de vérification sont journalisées pour des raisons de sécurité.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
