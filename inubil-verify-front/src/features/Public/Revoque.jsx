import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Revoque.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png'

export default function VerificationEchec() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const fileHash = "0x3f89a77b129c55d04823194098273b9c12a8932";

  const handleCopy = () => {
    navigator.clipboard.writeText(fileHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      {/* TopAppBar NATIVE ET ISOLÉE */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className="flex items-start">
            <img 
                                  src={Logo_Inubil} 
                                  alt="INUBIL Verify" 
                                  style={{ height: '80px', width: 'auto', objectFit: 'contain' }} 
            />
          </div>
          <div className={styles.navGroup} id="header-nav-group">
            <nav className="hidden md:flex items-center gap-6">
              <span className={styles.navLinkActive}>Vérification</span>
              <a className={styles.navLink} href="#">Explorer</a>
              <a className={styles.navLink} href="#">Services</a>
            </nav>
            <button className={styles.connexionBtn} onClick={() => navigate('/login')}>
              Connexion
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU CENTRAL DE L'ÉCHEC */}
      <main className={styles.main}>
        <div className={styles.mainContainer}>
          
          {/* Bannière d'Alerte Générale */}
          <div className={styles.banner}>
            <span className={`material-symbols-outlined ${styles.bannerIcon}`} style={{ fontVariationSettings: '"FILL" 1' }}>
              warning
            </span>
            <div className="space-y-1">
              <h2 className={styles.bannerTitle}>
                ATTENTION : DOCUMENT NON AUTHENTIQUE OU RÉVOQUÉ
              </h2>
              <p className={styles.bannerDesc}>
                Le système n'a trouvé aucune correspondance blockchain valide pour cette empreinte, ou ce diplôme a été invalidé par l'administration émettrice.
              </p>
            </div>
          </div>

          {/* Grille principale à deux colonnes */}
          <div className={styles.grid}>
            
            {/* Colonne Gauche: Rapport détaillé */}
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
                        <span className={styles.valueAlert}>ÉCHOUÉ / INVALIDE</span>
                      </div>
                      <div>
                        <span className={styles.label}>Date d'Analyse</span>
                        <span className={styles.valueText}>24 Mai 2024 - 14:32:10 GMT</span>
                      </div>
                    </div>
                    <div className={styles.infoGroup}>
                      <div>
                        <span className={styles.label}>Réseau de Vérification</span>
                        <span className={styles.networkValue}>
                          <span className={`material-symbols-outlined ${styles.networkIcon}`}>hub</span>
                          Polygon Proof of Stake (Mainnet)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className={styles.label}>Empreinte Numérique (Hash SHA-256)</span>
                    <div className={styles.hashContainer}>
                      <code className={styles.hashCode}>{fileHash}</code>
                      <button 
                        className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`} 
                        onClick={handleCopy} 
                        title="Copier le hash"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {copied ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions contextuelles */}
                <div className={styles.actionsBar}>
                  <button className={styles.retryBtn} onClick={() => navigate('/verification-publique')}>
                    Réessayer la vérification
                  </button>
                  <a className={styles.supportLink} href="mailto:support@inubil-verify.ac">
                    <span className="material-symbols-outlined">mail</span>
                    Contacter le support
                  </a>
                </div>
              </div>
            </div>

            {/* Colonne Droite: Raisons de l'échec */}
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

          {/* Journalisation de sécurité en bas */}
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