import { useState, useRef } from 'react';
import styles from './VerificationPublique.module.css';
import PublicHeader from './PublicHeader';
import { verifierParUpload, verifierParHash } from '../../core/verify/verify.api';
import Valide from './Valide';
import Revoque from './Revoque';

const REGEX_HASH = /^[0-9a-f]{64}$/;

export default function VerificationPublique() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'hash'
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hashSaisi, setHashSaisi] = useState('');
  const [hashVerifie, setHashVerifie] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);
  const fileInputRef = useRef(null);

  const reinitialiser = () => {
    setResultat(null);
    setErreur(null);
    setFileName('');
    setHashSaisi('');
    setHashVerifie(null);
  };

  const handleDropzoneClick = () => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErreur('Veuillez sélectionner un fichier PDF uniquement.');
      return;
    }

    setErreur(null);
    setFileName(file.name);
    setHashVerifie(null); // le hash est calcule cote serveur, jamais expose au client pour ce flux
    setIsLoading(true);
    try {
      const res = await verifierParUpload(file);
      setResultat(res);
    } catch (err) {
      setErreur(err.message ?? 'La vérification a échoué. Réessayez.');
    } finally {
      setIsLoading(false);
      setFileName('');
    }
  };

  const soumettreHash = async (e) => {
    e.preventDefault();
    const h = hashSaisi.trim().toLowerCase();
    if (!REGEX_HASH.test(h)) {
      setErreur('Le hash doit être un SHA-256 hexadécimal de 64 caractères.');
      return;
    }
    setErreur(null);
    setHashVerifie(h);
    setIsLoading(true);
    try {
      const res = await verifierParHash(h);
      setResultat(res);
    } catch (err) {
      setErreur(err.message ?? 'La vérification a échoué. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isLoading) setIsDragActive(true);
  };

  const handleDragLeave = () => setIsDragActive(false);

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

  if (resultat) {
    return resultat.resultat === 'authentique' ? (
      <Valide document={resultat.document} blockchain={resultat.blockchain} verifieLe={resultat.verifie_le} onNouvelleVerification={reinitialiser} />
    ) : (
      <Revoque
        resultat={resultat.resultat}
        message={resultat.message}
        hashSoumis={hashVerifie}
        blockchain={resultat.blockchain}
        verifieLe={resultat.verifie_le}
        onRetry={reinitialiser}
        onNouvelleVerification={reinitialiser}
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.blurBg1}></div>
      <div className={styles.blurBg2}></div>

      <PublicHeader />

      <main className={styles.main}>

        <div className={styles.card}>
          <div className={styles.textCenter}>
            <h1 className={styles.title}>Vérification de Diplôme</h1>
            <p className={styles.subtitle}>
              Déposez une attestation numérique au format PDF, ou collez directement son empreinte SHA-256,
              pour vérifier instantanément son authenticité et son ancrage immuable.
            </p>
          </div>

          <div className={styles.modeToggle}>
            <button
              type="button"
              className={mode === 'upload' ? styles.modeBtnActive : styles.modeBtn}
              onClick={() => { setMode('upload'); setErreur(null); }}
            >
              Téléverser un PDF
            </button>
            <button
              type="button"
              className={mode === 'hash' ? styles.modeBtnActive : styles.modeBtn}
              onClick={() => { setMode('hash'); setErreur(null); }}
            >
              Coller un hash SHA-256
            </button>
          </div>

          {erreur && <div className={styles.errorBanner}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            {erreur}
          </div>}

          {mode === 'upload' ? (
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
                    <span className={`material-symbols-outlined ${styles.uploadIcon}`}>cloud_upload</span>
                  </div>
                  <p className={styles.dropTextMain}>
                    Glissez votre fichier PDF ici ou <span className={styles.browseText}>parcourez vos fichiers</span>
                  </p>
                  <p className={styles.dropTextSub}>
                    Fichiers PDF officiels signés uniquement (Max. 20 Mo)
                  </p>
                </>
              ) : (
                <div className={styles.loaderContainer}>
                  <span className={`material-symbols-outlined ${styles.spinIcon}`}>sync</span>
                  <p className={styles.dropTextMain}>Analyse et extraction de l'empreinte...</p>
                  <p className={styles.loaderFileBadge}>{fileName}</p>
                </div>
              )}
            </div>
          ) : (
            <form className={styles.hashForm} onSubmit={soumettreHash}>
              <input
                type="text"
                className={styles.hashInput}
                placeholder="a3f9c2d1e8b74f560ab12c3d4e5f6789..."
                value={hashSaisi}
                onChange={(e) => setHashSaisi(e.target.value)}
                disabled={isLoading}
                maxLength={64}
              />
              <button type="submit" className={styles.hashSubmitBtn} disabled={isLoading || !hashSaisi.trim()}>
                {isLoading ? 'Vérification en cours…' : 'Vérifier ce hash'}
              </button>
            </form>
          )}

          <div className={styles.footerVerified}>
            <span className={`material-symbols-outlined ${styles.verifiedIcon}`}>verified</span>
            <span className={styles.verifiedText}>Technologie Inubil Ledger Protégée</span>
          </div>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <div className={styles.stepIconBox}>
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <h3 className={styles.stepTitle}>Déposer le PDF</h3>
            <p className={styles.stepDesc}>Glissez l'attestation numérique reçue de l'établissement.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <div className={styles.stepIconBox}>
              <span className="material-symbols-outlined">fingerprint</span>
            </div>
            <h3 className={styles.stepTitle}>Calcul de l'Empreinte</h3>
            <p className={styles.stepDesc}>Extraction immédiate du hachage cryptographique du document.</p>
          </div>

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

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p>© 2026 INUBIL Verify. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
