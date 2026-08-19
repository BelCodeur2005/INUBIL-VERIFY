import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../../core/api/client';
import styles from './ResetPassword.module.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  // Validation dynamique des critères
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    if (!token) {
      setErreur("Lien invalide : le jeton de réinitialisation est manquant.");
      return;
    }
    if (!(hasMinLength && hasUppercase && hasNumber && hasSpecialChar)) {
      setErreur('Le mot de passe ne respecte pas toutes les exigences ci-dessous.');
      return;
    }
    if (!passwordsMatch) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);
    try {
      await api.post('/auth/reset-password', { token, nouveau_mot_de_passe: password }, { auth: false });
      navigate('/login');
    } catch (err) {
      setErreur(err.message || 'Ce lien est invalide ou a expiré. Veuillez refaire une demande.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authCard}>

        {/* VOLET GAUCHE - HERO BRANDING */}
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            
            <h1 className={styles.heroTitle}>NOUVEAU MOT DE PASSE</h1>
            <p className={styles.heroSubtitle}>
              Définissez un mot de passe robuste pour garantir la sécurité de votre compte et de vos documents.
            </p>
          </div>

          <div className={styles.circleBg1}></div>
          <div className={styles.circleBg2}></div>
          <div className={styles.circleBg3}></div>
        </div>

        {/* VOLET DROIT - FORMULAIRE */}
        <div className={styles.formSection}>

          <div className={styles.topBadgeWrapper}>
            <span className={styles.topBadge}>
              <span className={styles.badgeDot}></span> SÉCURITÉ DU COMPTE
            </span>
          </div>

          <div className={styles.textCenter}>
            <h2 className={styles.authTitle}>Réinitialisation</h2>
            <p className={styles.authSubtitle}>Saisissez vos nouvelles informations de connexion.</p>
          </div>

          {erreur && <div className={styles.alertError}>{erreur}</div>}

          <form onSubmit={handleSubmit} className={styles.formStack}>
            
            {/* Champ Nouveau mot de passe */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>NOUVEAU MOT DE PASSE</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.inputField}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.eyeButton}
                  tabIndex="-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Champ Confirmer le mot de passe */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>CONFIRMER LE MOT DE PASSE</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.inputField}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.eyeButton}
                  tabIndex="-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showConfirmPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Panneau des exigences dynamiques */}
            <div className={styles.requirementsBox}>
              <h3 className={styles.requirementsTitle}>EXIGENCES DU MOT DE PASSE :</h3>
              <ul className={styles.requirementsList}>
                <li className={hasMinLength ? styles.validItem : ''}>
                  <span className={styles.checkIcon}>{hasMinLength ? '✓' : '•'}</span> 8 caractères minimum
                </li>
                <li className={hasUppercase ? styles.validItem : ''}>
                  <span className={styles.checkIcon}>{hasUppercase ? '✓' : '•'}</span> Au moins une lettre majuscule
                </li>
                <li className={hasNumber ? styles.validItem : ''}>
                  <span className={styles.checkIcon}>{hasNumber ? '✓' : '•'}</span> Au moins un chiffre
                </li>
                <li className={hasSpecialChar ? styles.validItem : ''}>
                  <span className={styles.checkIcon}>{hasSpecialChar ? '✓' : '•'}</span> Au moins un caractère spécial (@, #, !, etc.)
                </li>
              </ul>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={enCours}>
              <span>{enCours ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}</span>
              <span className={styles.arrowIcon}>→</span>
            </button>

            <Link to="/login" className={styles.btnBack}>
              <span className={styles.backArrow}>←</span> Retour à la page de connexion
            </Link>
          </form>

        </div>

      </div>
    </div>
  );
}