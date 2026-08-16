import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState('');

  // État pour la translation du bonhomme bleu
  const [avatarPos, setAvatarPos] = useState({ x: 0, y: 0, rotate: 0 });

  const handleMouseMove = (e) => {
    // Calcul du décalage par rapport au centre de l'écran
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Intensité du mouvement (max ~12px de déplacement)
    const moveX = ((clientX - centerX) / centerX) * 12;
    const moveY = ((clientY - centerY) / centerY) * 12;
    const rotate = moveX * 0.8; // Inclinaison dynamique

    setAvatarPos({ x: moveX, y: moveY, rotate });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErreur('');

    if (!email || !password) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }

    try {
      // Redirection automatique vers l'espace université
      navigate('/universite');
    } catch (err) {
      setErreur('Identifiants invalides. Veuillez réessayer.');
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.authCard}>
        {/* Colonne Gauche : Design & Connexion sociale */}
        <div className={styles.leftPanel}>
          <div className={styles.bgIllustration}></div>
          <div className={styles.leftContent}>
            <h2 className={styles.leftTitle}>INUBIL Verify</h2>
            <p className={styles.leftSubtitle}>
              Authentification sécurisée des diplômes & documents académiques.
            </p>

            <div className={styles.socialButtons}>
              <button type="button" className={styles.btnSocial}>
                Se connecter avec Google
              </button>
              <button type="button" className={styles.btnSocial}>
                Se connecter avec Microsoft
              </button>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Formulaire */}
        <div className={styles.rightPanel}>
          <div className={styles.topNav}>
            <span className={styles.activeTab}>Connexion</span>
            <Link to="/auth/register" className={styles.inactiveTab}>
              S'inscrire
            </Link>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.authTitle}>Connexion</h2>
            <p className={styles.authSubtitle}>
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {erreur && <div className={styles.alertError}>{erreur}</div>}

          <form onSubmit={handleSubmit} className={styles.formStack}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Adresse Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@domaine.com"
                className={styles.inputField}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mot de passe</label>
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
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  <div
                    className={`${styles.eyeIcon} ${
                      showPassword ? styles.eyeOpen : ''
                    }`}
                  ></div>
                </button>
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary}>
              Se connecter
            </button>

            <div className={styles.footerLinks}>
              <Link to="/forgot-password" className={styles.authLink}>
                Mot de passe oublié ?
              </Link>
              <span className={styles.registerText}>
                Nouveau ?{' '}
                <Link to="/auth/register" className={styles.registerLink}>
                  Créer un compte
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}