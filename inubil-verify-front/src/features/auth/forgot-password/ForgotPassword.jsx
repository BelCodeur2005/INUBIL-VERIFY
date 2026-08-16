import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ForgotPassword.module.css';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [succes, setSucces] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulation d'envoi de mail
    setSucces(true);

    // Pour tes tests : simuler le clic sur le lien reçu en ouvrant la page suivante après 2s
    setTimeout(() => {
      navigate('/reset-password');
    }, 2500);
  };

  return (
    <div className={styles.authCard}>
      {/* Icône du cadenas avec flèche de retour au centre */}
      <div className={styles.iconContainer}>
        <div className={styles.lockIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6M21 13a9 9 0 1 1-3-7.7L21 8" />
            <rect x="7" height="11" width="10" y="11" rx="2" ry="2" />
            <path d="M12 15v3" />
          </svg>
        </div>
      </div>

      <div className={styles.textCenter}>
        <h2 className={styles.authTitle}>Mot de passe oublié ?</h2>
        <p className={styles.authSubtitle}>
          Entrez l'adresse e-mail associée à votre compte INUBIL Verify. Nous vous enverrons un lien sécurisé pour réinitialiser instantanément votre mot de passe.
        </p>
      </div>

      {succes && (
        <div className={styles.alertSuccess}>
          Un e-mail de récupération a été envoyé ! (Simulation : redirection...)
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formStack}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ADRESSE E-MAIL PROFESSIONNELLE OU ÉTUDIANTE</label>
          <div className={styles.inputWrapper}>
            <span className={styles.mailIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Lien de retour sous forme de bouton */}
        <Link to="/login" className={styles.btnBack}>
          <span className={styles.backArrow}>←</span> Retour à la page de connexion
        </Link>
      </form>
    </div>
  );
}