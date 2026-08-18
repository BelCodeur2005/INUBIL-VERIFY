import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './ForgotPassword.module.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [succes, setSucces] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSucces(true);

    setTimeout(() => {
      navigate('/reset-password');
    }, 2500);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authCard}>

        {/* VOLET GAUCHE - GRAPHISME & BRANDING */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            
            <h1 className={styles.heroTitle}>SÉCURITÉ & AUTHENTIFICATION</h1>
            <p className={styles.heroSubtitle}>
              Récupérez l'accès à votre espace en toute sécurité via notre protocole de vérification d'identité.
            </p>
          </div>

          <div className={styles.circleBg1}></div>
          <div className={styles.circleBg2}></div>
          <div className={styles.circleBg3}></div>
        </div>

        {/* VOLET DROIT - TON CODE AMÉLIORÉ ICI */}
        <div className={styles.formSection}>

          {/* Badge de catégorie */}
          <div className={styles.topBadgeWrapper}>
            <span className={styles.topBadge}>
              <span className={styles.badgeDot}></span> SÉCURITÉ DU COMPTE
            </span>
          </div>

          {/* Icône stylisée avec glow */}
          {/*<div className={styles.iconContainer}>
            <div className={styles.lockIconBox}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M21 13a9 9 0 1 1-3-7.7L21 8" />
                <rect x="7" y="11" width="10" height="11" rx="2" ry="2" />
                <path d="M12 15v3" />
              </svg>
            </div>
          </div>*/}

          <div className={styles.textCenter}>
            <h2 className={styles.authTitle}>Mot de passe oublié ?</h2>
            <p className={styles.authSubtitle}>
              Entrez l'adresse e-mail associée à votre compte <strong>INUBIL Verify</strong>. Vous recevrez un lien sécurisé pour réinitialiser votre accès.
            </p>
          </div>

          {succes && (
            <div className={styles.alertSuccess}>
              <span className={styles.alertIcon}>✓</span> E-mail de récupération envoyé ! Redirection...
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.formStack}>
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label className={styles.formLabel}>ADRESSE E-MAIL PROFESSIONNELLE</label>
          
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

            <button type="submit" className={styles.btnPrimary}>
              <span>Envoyer le lien de récupération</span>
              <span className={styles.arrowIcon}>→</span>
            </button>

            <Link to="/login" className={styles.btnBack}>
              <span className={styles.backArrow}>←</span> Retour à la page de connexion
            </Link>
          </form>

          {/* Footer de réassurance */}
          <div className={styles.securityFooter}>
            <span>Le lien expire après 15 minutes d'inactivité.</span>
          </div>
        </div>

      </div>
    </div>
  );
}