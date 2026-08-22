import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiCheckCircle, 
  FiDownload, 
  FiAward, 
  FiShield, 
  FiCopy, 
  FiCheck, 
  FiX, 
  FiExternalLink 
} from 'react-icons/fi';
import styles from './Valide.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
  
export default function Valide() {
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const publicTxData = {
    network: "Polygon Mainnet",
    status: "Confirmé",
    txHash: "0x8f3a...b92e",
    fullTxHash: "0x8f3a4192bc7e4d2110594e9f3b145829a8f352a104928173619284910281b92e",
    contractAddress: "0x2a91...4e10",
    fullContractAddress: "0x2a91928410294820193820192840192830194e10",
    issuerWallet: "INUBIL Official Signer (0x12...9a)",
    timestamp: "24/10/2025 à 14:32:05 UTC"
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className={styles.page}>
      {/* NAVBAR */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.brandGroup}>
            <img src={Logo_Inubil} alt="INUBIL Logo" className={styles.logo} />
          </div>

          <div className={styles.navGroup}>
            <nav>
              <a href="/valide" className={styles.navLinkActive}>Vérification</a>
              <button 
                type="button"
                className={styles.navLinkBtn} 
                onClick={() => setIsExplorerOpen(true)}
              >
                Explorer
              </button>
            </nav>
            <Link to="/login" className={styles.connexionBtn}>
              Connexion
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className={styles.main}>
        <div className={styles.mainContainer}>
          
          {/* BANNIÈRE SUCCÈS */}
          <div className={styles.banner}>
            <div className={styles.bannerIconContainer}>
              <FiCheckCircle size={32} />
            </div>
            <div>
              <div className={styles.bannerTitle}>Document Authentique & Valide</div>
              <div className={styles.bannerDesc}>
                Ce diplôme a été certifié par l'établissement d'enseignement et son empreinte numérique est ancrée de manière immuable dans la blockchain.
              </div>
            </div>
          </div>

          {/* GRILLE D'INFORMATION */}
          <div className={styles.grid}>
            
            {/* CARTE GAUCHE : DONNÉES DU DIPLÔME */}
            <div className={styles.leftCard}>
              <div className={styles.watermark}>
                <FiAward className={styles.watermarkIcon} />
              </div>

              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <FiAward size={22} />
                  Données Certifiées
                </div>
                <span className={styles.badge}>Authentifié</span>
              </div>

              <div className={styles.dataGrid}>
                <div className={styles.field}>
                  <span className={styles.label}>Titulaire</span>
                  <span className={styles.valueBold}>NGANGUE TSAFACK Belvie Scindie</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Intitulé du Diplôme</span>
                  <span className={styles.valueNormal}>Licence Professionnelle DAWII</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>ÉtablissementÉmetteur</span>
                  <span className={styles.valueAccent}>ISTAMA - INUBIL</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Date d'Émission</span>
                  <span className={styles.valueNormal}>15 Juillet 2025</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Identifiant Unique</span>
                  <span className={styles.valueCode}>DIP-2025-8942</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Mentions</span>
                  <span className={styles.valueNormal}>Très Bien</span>
                </div>
              </div>

              <button className={styles.downloadBtn}>
                <FiDownload size={18} />
                Télécharger le Certificat PDF Officlel
              </button>
            </div>

            {/* CARTE DROITE : PRÉVISUALISATION & QR CODE */}
            <div className={styles.rightCard}>
              <div className={styles.previewBox}>
                <img src="/placeholder-diploma.png" alt="Aperçu diplôme" className={styles.previewImg} />
                <div className={styles.previewOverlay}>
                  <FiAward size={48} color="#062362" />
                </div>
              </div>

              <div className={styles.qrContainer}>
                <div className={styles.qrBox}>
                  <div className={styles.qrMock}></div>
                </div>
                <span className={styles.label}>Scannez pour vérifier l'originalité</span>
              </div>
            </div>

            {/* SECTION CRYPTOGRAPHIQUE */}
            <div className={styles.cryptoCard}>
              <div className={styles.cryptoTitleGroup}>
                <FiShield size={22} />
                <h3>Preuves Cryptographiques</h3>
              </div>

              <div className={styles.cryptoList}>
                <div className={styles.hashRow}>
                  <div>
                    <div className={styles.hashLabel}>Empreinte Numérique du Document (SHA-256)</div>
                    <div className={styles.hashCode}>{publicTxData.fullTxHash}</div>
                  </div>
                  <button 
                    className={`${styles.copyBtn} ${copiedField === 'docHash' ? styles.copyBtnSuccess : ''}`}
                    onClick={() => handleCopy(publicTxData.fullTxHash, 'docHash')}
                  >
                    {copiedField === 'docHash' ? <FiCheck size={16} /> : <FiCopy size={16} />}
                  </button>
                </div>

                <div className={styles.subCryptoGrid}>
                  <div className={styles.cryptoBlock}>
                    <div className={styles.hashLabel}>Ancrage Blockchain</div>
                    <div className={styles.networkStatus}>
                      <span className={styles.pulseDot}></span>
                      <span>Polygon Mainnet (Bloc #6192841)</span>
                    </div>
                  </div>
                  <div className={styles.cryptoBlock}>
                    <div className={styles.hashLabel}>Stockage Décentralisé</div>
                    <div className={styles.ipfsStatus}>
                      <FiCheckCircle size={14} />
                      <span>Stocké sur IPFS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HISTORIQUE D'AUDIT */}
            <div className={styles.auditCard}>
              <div className={styles.auditTitle}>Piste d'Audit Horodatée</div>
              
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotGreen}></div>
                    <div className={styles.timelineLine}></div>
                  </div>
                  <div>
                    <div className={styles.timelineNodeTitle}>Émission & Signature</div>
                    <div className={styles.timestampText}>15/07/2025 par le Secrétariat ISTAMA</div>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotGreen}></div>
                    <div className={styles.timelineLine}></div>
                  </div>
                  <div>
                    <div className={styles.timelineNodeTitle}>Ancrage Blockchain</div>
                    <div className={styles.timestampText}>15/07/2025 à 10:14:22 UTC</div>
                  </div>
                </div>

                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotOutline}></div>
                  </div>
                  <div>
                    <div className={styles.timelineNodeTitleActive}>Dernière Vérification</div>
                    <div className={styles.timestampText}>Aujourd'hui (Accès public)</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODALE EXPLORATEUR BLOCKCHAIN */}
      {isExplorerOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsExplorerOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalBadge}>Public</span>
                <h2>Explorateur de registre</h2>
              </div>
              <button 
                className={styles.closeBtn} 
                onClick={() => setIsExplorerOpen(false)}
                aria-label="Fermer"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalSubtitle}>
                Aperçu public de la transaction enregistrée sur le registre décentralisé.
              </p>

              <div className={styles.txStatusCard}>
                <div className={styles.txStatusHeader}>
                  <span className={styles.networkBadge}>
                    <span className={styles.pulseDot}></span>
                    {publicTxData.network}
                  </span>
                  <span className={styles.confirmedTag}>
                    <FiCheckCircle size={14} /> {publicTxData.status}
                  </span>
                </div>
                <div className={styles.timestampText}>
                  Horodatage : {publicTxData.timestamp}
                </div>
              </div>

              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <div>
                    <span className={styles.infoLabel}>Hash de transaction (TxHash)</span>
                    <div className={styles.infoValue}>{publicTxData.txHash}</div>
                  </div>
                  <button 
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(publicTxData.fullTxHash, 'tx')}
                    title="Copier le hash complet"
                  >
                    {copiedField === 'tx' ? <FiCheck color="#16a34a" /> : <FiCopy />}
                  </button>
                </div>

                <div className={styles.infoRow}>
                  <div>
                    <span className={styles.infoLabel}>Smart Contract (Certificate Registry)</span>
                    <div className={styles.infoValue}>{publicTxData.contractAddress}</div>
                  </div>
                  <button 
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(publicTxData.fullContractAddress, 'contract')}
                    title="Copier l'adresse du contrat"
                  >
                    {copiedField === 'contract' ? <FiCheck color="#16a34a" /> : <FiCopy />}
                  </button>
                </div>

                <div className={styles.infoRow}>
                  <div>
                    <span className={styles.infoLabel}>Émetteur certifié</span>
                    <div className={styles.infoValue}>{publicTxData.issuerWallet}</div>
                  </div>
                </div>
              </div>
            </div>

            {/*<div className={styles.modalFooter}>
              <a 
                href={`https://polygonscan.com/tx/${publicTxData.fullTxHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.externalScanLink}
              >
                Voir sur l'explorateur Polygonscan <FiExternalLink size={14} />
              </a>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}