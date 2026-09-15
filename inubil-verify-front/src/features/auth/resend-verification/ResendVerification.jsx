import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../core/api/client';
import styles from './ResendVerification.module.css';

export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      // Reponse volontairement identique que le compte existe ou non, et qu'il soit
      // deja verifie ou non (anti-enumeration cote backend, meme principe que forgot-password).
      await api.post('/auth/verifier-email/renvoyer', { email }, { auth: false });
      setSucces(true);
    } catch (err) {
      setErreur(err.message || "Une erreur est survenue, veuillez réessayer dans quelques minutes.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authCard}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>ACTIVATION DE COMPTE</h1>
            <p className={styles.heroSubtitle}>
              Recevez un nouveau lien pour confirmer votre adresse email et activer votre espace INUBIL Verify.
            </p>
          </div>

          <div className={styles.circleBg1}></div>
          <div className={styles.circleBg2}></div>
          <div className={styles.circleBg3}></div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.textCenter}>
            <h2 className={styles.authTitle}>Email de vérification non reçu ?</h2>
            <p className={styles.authSubtitle}>
              Entrez l'adresse email utilisée à l'inscription. Si un lien vous avait été envoyé et qu'il a expiré (au bout de 24 heures) ou que vous ne l'avez jamais reçu, un nouveau lien vous sera envoyé.
            </p>
          </div>

          {succes && (
            <div className={styles.alertSuccess}>
              <span>✓</span> Si cette adresse correspond à un compte non encore vérifié, un nouvel email vient d'être envoyé.
            </div>
          )}

          {erreur && (
            <div className={styles.alertError}>{erreur}</div>
          )}

          <form onSubmit={handleSubmit} className={styles.formStack}>
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.formLabel}>ADRESSE EMAIL</label>
              </div>
              <div className={styles.inputWrapper}>
                <span className={styles.mailIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: m.ngo@universite-douala.cm"
                  className={styles.inputField}
                  required
                />
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={enCours}>
              <span>{enCours ? 'Envoi...' : "Renvoyer l'email de vérification"}</span>
              <span className={styles.arrowIcon}>→</span>
            </button>

            <Link to="/login" className={styles.btnBack}>
              <span>←</span> Retour à la page de connexion
            </Link>
          </form>

          <div className={styles.securityFooter}>
            <span>Maximum 3 envois toutes les 10 minutes, par mesure de sécurité.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
