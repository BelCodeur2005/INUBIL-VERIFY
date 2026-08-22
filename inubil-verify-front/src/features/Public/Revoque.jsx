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

          <div className={styles.banner}>
            <span className={`material-symbols-outlined ${styles.bannerIcon}`} style={{ fontVariationSettings: '"FILL" 1' }}>
              warning
            </span>
            <div>
              <h2 className={styles.bannerTitle}>{TITRES_RESULTAT[resultat] ?? 'DOCUMENT NON AUTHENTIQUE'}</h2>
              <p className={styles.bannerDesc}>{message}</p>
            </div>
          </div>

          <div className={styles.grid}>

            <div className={styles.leftCol}>
              <div className={styles.sealWatermark}>
                <span className={`material-symbols-outlined ${styles.sealIcon}`}>gpp_maybe</span>
              </div>

              <div className={styles.reportContent}>
                <div className={styles.reportHeader}>
                  <h3 className={styles.reportTitle}>Rapport d'Analyse d'Intégrité</h3>
                  <div className={styles.statusBadge}>
                    <span className={styles.pulseDot}></span>
                    ÉCHEC DE VÉRIFICATION
                  </div>
                </div>

                <div className={styles.detailsBlock}>
                  <div className={styles.detailsGrid}>
                    <div className={styles.infoGroup}>
                      <div>
                        <span className={styles.label}>Statut du Traitement</span>
                        <span className={styles.valueAlert}>{STATUTS_RESULTAT[resultat] ?? 'ÉCHOUÉ'}</span>
                      </div>
                      <div>
                        <span className={styles.label}>Date d'Analyse</span>
                        <span className={styles.valueText}>{fmtDateHeure(verifieLe)}</span>
                      </div>
                    </div>
                    {blockchain && (
                      <div className={styles.infoGroup}>
                        <div>
                          <span className={styles.label}>Réseau de Vérification</span>
                          <span className={styles.networkValue}>
                            <span className={`material-symbols-outlined ${styles.networkIcon}`}>hub</span>
                            {LABELS_RESEAU[blockchain.reseau] ?? blockchain.reseau}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {hashSoumis && (
                    <div>
                      <span className={styles.label}>Empreinte Numérique (Hash SHA-256)</span>
                      <div className={styles.hashContainer}>
                        <code className={styles.hashCode}>{hashSoumis}</code>
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
                </div>

                <div className={styles.actionsBar}>
                  <button className={styles.retryBtn} onClick={reessayer}>
                    Réessayer la vérification
                  </button>
                  <a className={styles.supportLink} href="mailto:support@inubil-verify.ac">
                    <span className="material-symbols-outlined">mail</span>
                    Contacter le support
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.rightCol}>
              <div className={styles.explanationBox}>
                <h4 className={styles.explanationTitle}>
                  <span className="material-symbols-outlined">help_outline</span>
                  Pourquoi ce résultat ?
                </h4>
                <div className={styles.explanationList}>
                  <div className={styles.explanationCard}>
                    <p className={styles.cardTitle}>Modification post-émission</p>
                    <p className={styles.cardDesc}>Le fichier original a été altéré. Même un seul pixel ou caractère modifié change l'empreinte blockchain.</p>
                  </div>
                  <div className={styles.explanationCard}>
                    <p className={styles.cardTitle}>Révocation Administrative</p>
                    <p className={styles.cardDesc}>Le diplôme a été officiellement annulé par l'université émettrice suite à une erreur ou une fraude.</p>
                  </div>
                  <div className={styles.explanationCard}>
                    <p className={styles.cardTitle}>Document Inexistant</p>
                    <p className={styles.cardDesc}>Aucune preuve d'existence de ce document n'a jamais été enregistrée sur notre registre décentralisé.</p>
                  </div>
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
