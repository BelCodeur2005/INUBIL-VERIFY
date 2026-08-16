import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Valide.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png'

export default function Valide() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const txHash = "0x74a2f893c5d7b8e92a1f4b3d7e5c9a2f1b39b2";

  const handleCopy = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      {/* TopAppBar ISOLÉE ET PARFAITEMENT ALIGNÉE */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.brandGroup}>
            <img 
              alt="INUBIL Logo" 
              className={styles.logo} 
              src={Logo_Inubil}
            />
            
          </div>
          
          <div className={styles.navGroup}>
            <nav className="hidden md:flex">
              <span className={styles.navLinkActive}>Vérification</span>
              <a className={styles.navLink} href="#">Explorer</a>
              <a className={styles.navLink} href="#">Blockchain</a>
            </nav>
            <button className={styles.connexionBtn} onClick={() => navigate('/login')}>
              Connexion
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU DU SUCCÈS */}
      <main className={styles.main}>
        <div className={styles.mainContainer}>
          
          {/* SUCCESS ALERT BANNER */}
          <div className={styles.banner}>
            <div className={styles.bannerIconContainer}>
              <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                check_circle
              </span>
            </div>
            <div className="text-center md:text-left">
              <h2 className={styles.bannerTitle}>DOCUMENT AUTHENTIQUE & VALIDE</h2>
              <p className={styles.bannerDesc}>
                Ce document académique a été certifié conforme par l'institution émettrice et ancré avec succès sur la blockchain Polygon.
              </p>
            </div>
          </div>

          {/* GRILLE DES COMPOSANTS */}
          <div className={styles.grid}>
            
            {/* Gauche: Données Certifiées */}
            <div className={styles.leftCard}>
              <div className={styles.watermark}>
                <span className={`material-symbols-outlined ${styles.watermarkIcon}`}>verified</span>
              </div>
              
              <div className="relative z-10">
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <span className="material-symbols-outlined">description</span>
                    Données Certifiées
                  </h3>
                  <span className={styles.badge}>Licencié</span>
                </div>

                <div className={styles.dataGrid}>
                  <div className={styles.field}>
                    <span className={styles.label}>Titulaire</span>
                    <span className={styles.valueBold}>Jean-Baptiste KOUAM</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Établissement</span>
                    <span className={styles.valueBold}>INUBIL / ISTAMA</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Type de Document</span>
                    <span className={styles.valueNormal}>Licence Professionnelle Métiers de l'Informatique</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Filière / Parcours</span>
                    <span className={styles.valueNormal}>DAWII - Web Internet et Intranet</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Année Académique</span>
                    <span className={styles.valueNormal}>2025-2026</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Mention</span>
                    <span className={styles.valueAccent}>Bien</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Date d'Émission</span>
                    <span className={styles.valueNormal}>15 Juin 2026</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Numéro Unique</span>
                    <span className={styles.valueCode}>IV-2026-894-X</span>
                  </div>
                </div>

                <button className={styles.downloadBtn} onClick={() => window.print()}>
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                  Télécharger le rapport de vérification (PDF)
                </button>
              </div>
            </div>

            {/* Droite: Preuves de Traçabilité */}
            <div className={styles.rightCard}>
              <h3 className={styles.cardTitle} style={{ marginBottom: '24px' }}>Preuves de Traçabilité</h3>
              <div className={styles.previewBox}>
                <img 
                  className={styles.previewImg} 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvmcwcS--TPYlOl5qkwuzmP8_UEz_Tj1DLjVAnYQryqVQ5l7wwHVsrmbaScNQi2hP_Cp_ORgsTxJYqMD-LmucuPKIMGcr6HtH2y-s0MYxbKY0AqSaRuJx-1J88MtA3vT2eknTHGX4aP8lm-7OvvoXSi_Bgr_E-2tzI3alZjTlZekGnspu5xYpH8H_UZO7qFbq2hyjsAVlmiAAZrZuVCCxMzrrJysxl-VG-T4Yo0IXEOfH6QinaNA3aWKq4o-nYi2n50YyGgBxD7fLo" 
                  alt="Aperçu du diplôme"
                />
                <div className={styles.previewOverlay}>
                  <span className="material-symbols-outlined !text-6xl text-primary/40 mb-2" style={{ color: 'rgba(0,44,83,0.4)' }}>
                    visibility
                  </span>
                  <p className={styles.navLinkActive} style={{ borderBottom: 'none' }}>Prévisualisation Document</p>
                </div>
              </div>
              
              <div className={styles.qrContainer}>
                <div className={styles.qrBox}>
                  <div className={styles.qrMock}></div>
                </div>
                <p className={styles.label} style={{ textTransform: 'none', color: '#42474f' }}>
                  Scannez ce QR Code pour auditer ce document sur un appareil mobile.
                </p>
              </div>
            </div>

            {/* Bas Gauche: Preuves Cryptographiques */}
            <div className={styles.cryptoCard}>
              <div className={styles.cryptoTitleGroup}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
                <h3 className={styles.cardTitle} style={{ color: 'inherit' }}>Preuves Cryptographiques (Immuables)</h3>
              </div>
              
              <div className={styles.cryptoList}>
                <div className={styles.hashRow}>
                  <div>
                    <span className={styles.hashLabel}>Transaction Hash</span>
                    <code className={styles.hashCode}>{txHash}</code>
                  </div>
                  <button 
                    className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`} 
                    onClick={handleCopy}
                    title="Copier le hash"
                  >
                    <span className="material-symbols-outlined">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                <div className={styles.subCryptoGrid}>
                  <div className={styles.cryptoBlock}>
                    <span className={styles.hashLabel}>Réseau Blockchain</span>
                    <div className={styles.networkStatus}>
                      <span className={styles.pulseDot}></span>
                      <span className={styles.valueBold} style={{ fontSize: '16px' }}>Polygon Mainnet (Amoy Testnet)</span>
                    </div>
                  </div>
                  <div className={styles.cryptoBlock}>
                    <span className={styles.hashLabel}>Stockage Décentralisé</span>
                    <div className={styles.ipfsStatus}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cloud_done</span>
                      <span className={styles.valueBold} style={{ fontSize: '16px', color: 'inherit' }}>IPFS / Pinata (CID Valide)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bas Droite: Historique Audit */}
            <div className={styles.auditCard}>
              <h4 className={styles.auditTitle}>Historique d'Audit</h4>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotGreen}></div>
                    <div className={styles.timelineLine}></div>
                  </div>
                  <div>
                    <p className={styles.timelineNodeTitle}>Certifié par ISTAMA</p>
                    <p className={styles.label} style={{ textTransform: 'none', color: '#42474f', fontWeight: '400' }}>15 Juin 2026 - 10:24 AM</p>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotGreen}></div>
                    <div className={styles.timelineLine}></div>
                  </div>
                  <div>
                    <p className={styles.timelineNodeTitle}>Ancrage Blockchain</p>
                    <p className={styles.label} style={{ textTransform: 'none', color: '#42474f', fontWeight: '400' }}>15 Juin 2026 - 10:26 AM</p>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotOutline}></div>
                  </div>
                  <div>
                    <p className={styles.timelineNodeTitleActive}>Consultation actuelle</p>
                    <p className={styles.label} style={{ textTransform: 'none', color: '#42474f', fontWeight: '400' }}>Aujourd'hui</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}