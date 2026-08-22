import { Link, useNavigate } from 'react-router-dom';
import styles from './PublicHeader.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png';

/** Header unifie des pages publiques (accueil + verification + resultats authentique/revoque/introuvable). */
export default function PublicHeader({ onNouvelleVerification, verifyLabel = 'Nouvelle vérification' }) {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <Link to="/" className={styles.brandGroup}>
          <img alt="INUBIL Verify" className={styles.logo} src={Logo_Inubil} />
        </Link>
        <nav className={styles.navGroup}>
          <button
            type="button"
            className={styles.navLink}
            onClick={() => (onNouvelleVerification ? onNouvelleVerification() : navigate('/verification-publique'))}
          >
            {verifyLabel}
          </button>
          <button type="button" className={styles.navLink} onClick={() => navigate('/login')}>
            Connexion
          </button>
        </nav>
      </div>
    </header>
  );
}
