import { useState, useRef } from 'react';
import styles from './VerificationPublique.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png'

export default function VerificationPublique() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  // Déclenche l'explorateur de fichiers au clic sur la zone
  const handleDropzoneClick = () => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Traitement du fichier importé
  const processFile = (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF uniquement.');
      return;
    }

    setFileName(file.name);
    setIsLoading(true);

    // Simulation de l'analyse cryptographique sur la blockchain
    setTimeout(() => {
      alert(`Simulation : L'empreinte cryptographique du fichier "${file.name}" a été comparée et validée avec succès sur le registre INUBIL.`);
      setIsLoading(false);
      setFileName('');
    }, 2500);
  };

  // Gestionnaires de Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isLoading) setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!isLoading && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={styles.page}>
      {/* Effets lumineux d'arrière-plan */}
      <div className={styles.blurBg1}></div>
      <div className={styles.blurBg2}></div>

      {/* HEADER ISOLÉ */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          {/* Assurez-vous d'avoir le logo dans votre dossier public ou importé à cet endroit */}
        <img 
                      src={Logo_Inubil} 
                      alt="INUBIL Verify" 
                      style={{ height: '80px', width: 'auto', objectFit: 'contain' }} 
        /> 
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className={styles.main}>
        
        {/* Module de vérification */}
        <div className={styles.card}>
          <div className={styles.textCenter}>
            <div className={styles.badge}>
              <span className={styles.pulseDot}></span>
              Réseau Blockchain Sécurisé
            </div>
            <h1 className={styles.title}>Vérification de Diplôme</h1>
            <p className={styles.subtitle}>
              Déposez une attestation numérique ou un diplôme au format PDF pour vérifier instantanément son authenticité et son ancrage immuable.
            </p>
          </div>

          {/* DROPZONE DYNAMIQUE */}
          <div 
            className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
            onClick={handleDropzoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file"
              accept=".pdf" 
              className={styles.fileInputHidden} 
              ref={fileInputRef}
              onChange={handleInputChange}
              disabled={isLoading}
            />
            
            {!isLoading ? (
              <>
                <div className={styles.iconContainer}>
                  <span className="material-symbols-outlined styles.uploadIcon">cloud_upload</span>
                </div>
                
                <p className={styles.dropTextMain}>
                  Glissez votre fichier PDF ici ou <span className={styles.browseText}>parcourez vos fichiers</span>
                </p>
                <p className={styles.dropTextSub}>
                  Fichiers PDF officiels signés uniquement (Max. 10 Mo)
                </p>
              </>
            ) : (
              /* Écran d'analyse réactif */
              <div className={styles.loaderContainer}>
                <span className="material-symbols-outlined styles.spinIcon">sync</span>
                <p className={styles.dropTextMain}>Analyse et extraction de l'empreinte...</p>
                <p className={styles.loaderFileBadge}>{fileName}</p>
              </div>
            )}
          </div>

          <div className={styles.footerVerified}>
            <span className="material-symbols-outlined styles.verifiedIcon">verified</span>
            <span className={styles.verifiedText}>Technologie Inubil Ledger Protégée</span>
          </div>
        </div>

        {/* SECTION EXPLICATIVE DES ÉTAPES */}
        <div className={styles.stepsGrid}>
          {/* Étape 1 */}
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <div className={styles.stepIconBox}>
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <h3 className={styles.stepTitle}>Déposer le PDF</h3>
            <p className={styles.stepDesc}>Glissez l'attestation numérique reçue de l'établissement.</p>
          </div>
          
          {/* Étape 2 */}
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <div className={styles.stepIconBox}>
              <span className="material-symbols-outlined">fingerprint</span>
            </div>
            <h3 className={styles.stepTitle}>Calcul de l'Empreinte</h3>
            <p className={styles.stepDesc}>Extraction immédiate du hachage cryptographique du document.</p>
          </div>
          
          {/* Étape 3 (Mise en avant) */}
          <div className={styles.stepCardDark}>
            <div className={styles.stepNumberDark}>03</div>
            <div className={styles.stepIconBoxDark}>
              <span className="material-symbols-outlined">workspace_premium</span>
            </div>
            <h3 className={styles.stepTitleGold}>Vérification Blockchain</h3>
            <p className={styles.stepDescDark}>Comparaison en temps réel avec le registre d'authenticité immuable.</p>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p>© 2026 INUBIL Verify. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}