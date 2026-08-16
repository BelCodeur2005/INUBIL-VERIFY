import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ResetPassword.module.css'; 

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/auth/login');
  };

  return (
    <div className={styles.authCard}>
      <div className={styles.textCenter}>
        <h2 className={styles.authTitle}>Nouveau mot de passe</h2>
        <p className={styles.authSubtitle}>Saisissez vos nouvelles informations de connexion.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formStack}>
        {/* Même structure de champs et cadre gris "EXIGENCES" qu'avant... */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Nouveau mot de passe</label>
          <div className={styles.passwordWrapper}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={styles.inputField} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeButton}>
              <div className={`${styles.eyeIcon} ${showPassword ? styles.eyeOpen : ''}`}></div>
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Confirmer le mot de passe</label>
          <div className={styles.passwordWrapper}>
            <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={styles.inputField} required />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={styles.eyeButton}>
              <div className={`${styles.eyeIcon} ${showConfirmPassword ? styles.eyeOpen : ''}`}></div>
            </button>
          </div>
        </div>

        <div className={styles.requirementsBox}>
          <h3 className={styles.requirementsTitle}>EXIGENCES :</h3>
          <ul className={styles.requirementsList}>
            <li><span className={styles.checkIcon}>✓</span> 8 caractères minimum</li>
            <li><span className={styles.checkIcon}>✓</span> Une majuscule</li>
            <li><span className={styles.checkIcon}>✓</span> Un chiffre</li>
            <li><span className={styles.checkIcon}>✓</span> Un caractère spécial</li>
          </ul>
        </div>

        <button type="submit" className={styles.btnPrimary}>Mettre jour le mot de passe</button>
      </form>
    </div>
  );
}