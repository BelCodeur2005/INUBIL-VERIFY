import { useState } from 'react';
import styles from './Visualisation.module.css';

export default function VerificationModal({ isOpen, onClose }) {
  const [showQRCode, setShowQRCode] = useState(false);

  // Si le modal n'est pas actif, on ne l'affiche pas dans le DOM
  if (!isOpen) return null;

  const handleGenerateQR = (e) => {
    e.stopPropagation(); // Évite de fermer le modal par erreur
    setShowQRCode(!showQRCode);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* Éviter que le clic à l'intérieur du modal ne le ferme */}
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        
        {/* Bouton de fermeture de la modale */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
          &times;
        </button>

        {/* En-tête du Modal */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Détails du Diplôme</h1>
            <p className={styles.pageSubtitle}>Authentification et ancrage blockchain</p>
          </div>
          <div className={styles.statusBadge}>
            <span className={styles.badgePulse}></span>
            <span>Diplôme Authentique</span>
          </div>
        </header>

        {/* Grille Principale réadaptée au Modal */}
        <div className={styles.mainGrid}>
          
          {/* Section Informations (Gauche) */}
          <section className={styles.infoSection}>
            
            {/* Carte : Informations Académiques */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Informations Académiques</h2>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.fieldLabel}>Titulaire</label>
                  <p className={styles.fieldValue}>Jean Dupont</p>
                </div>
                <div>
                  <label className={styles.fieldLabel}>Intitulé du Diplôme</label>
                  <p className={styles.fieldValue}>Licence en Informatique</p>
                </div>
                <div>
                  <label className={styles.fieldLabel}>Institution</label>
                  <p className={styles.fieldValue}>Université de Technologie</p>
                </div>
                <div>
                  <label className={styles.fieldLabel}>Année d'obtention</label>
                  <p className={styles.fieldValue}>2025</p>
                </div>
              </div>
            </div>

            {/* Carte : Données de Sécurité Blockchain */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Preuves d'Ancrage Blockchain</h2>
              <div className={styles.blockchainFields}>
                <div>
                  <label className={styles.fieldLabel}>Hash du document (SHA-256)</label>
                  <code className={styles.hashCode}>
                    8f9c6a3b2e1d4f5c6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f
                  </code>
                </div>
                <div>
                  <label className={styles.fieldLabel}>Adresse du Contrat Intelligent</label>
                  <code className={styles.hashCode}>
                    0x71C7656EC7ab88b098defB751B7401B5f6d14731
                  </code>
                </div>
                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.fieldLabel}>ID de Transaction</label>
                    <code className={styles.hashCode}>#tx-984521</code>
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Horodatage (Timestamp)</label>
                    <p className={styles.fieldValue}>12/06/2026 14:32:10 UTC</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Actions & QR Code (Droite) */}
          <section className={styles.actionSection}>
            <div className={styles.cardActions}>
              <button onClick={handleGenerateQR} className={styles.btnPrimary}>
                {showQRCode ? "Masquer le QR Code" : "Générer le QR Code d'Accès"}
              </button>
              <button className={styles.btnSecondary}>
                Télécharger le PDF Certifié
              </button>
              <button className={styles.btnSecondary}>
                Exporter l'Attestation
              </button>
            </div>

            {/* Affichage du QR Code */}
            {showQRCode && (
              <div className={`${styles.card} ${styles.qrCard} ${styles.fadeIn}`}>
                <h3 className={styles.qrTitle}>Scanner pour vérifier</h3>
                <div className={styles.qrBox}>
                  <span className={styles.qrPlaceholder}>[QR CODE]</span>
                </div>
                <p className={styles.qrHelpText}>
                  Accès instantané à la preuve publique.
                </p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}