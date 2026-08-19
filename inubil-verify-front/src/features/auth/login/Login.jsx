import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  // Position dynamique appliquée uniquement au bonhomme
  const [avatarPos, setAvatarPos] = useState({ x: 0, y: 0, rotate: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Amplitude du mouvement légèrement augmentée pour le grand bonhomme
    const moveX = ((clientX - centerX) / centerX) * 10;
    const moveY = ((clientY - centerY) / centerY) * 10;
    const rotate = moveX * 1.2;

    setAvatarPos({ x: moveX, y: moveY, rotate });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    if (!email || !password) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }

    setEnCours(true);
    try {
      const destination = await login(email, password);
      navigate(destination);
    } catch (err) {
      setErreur(err.message || 'Identifiants invalides. Veuillez réessayer.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={styles.loginWrapper} onMouseMove={handleMouseMove}>
      <div className={styles.authCard}>
        {/* Colonne Gauche */}
        <div className={styles.leftPanel}>
          <div className={styles.bgIllustration}></div>
          <div className={styles.leftContent}>
            
            {/* CERCLE BLANC FIXE (PLUS GRAND) */}
            <div className={styles.userAvatar}>
              {/* GRAND BONHOMME SVG */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={styles.avatarIcon}
                style={{
                  transform: `translate3d(${avatarPos.x}px, ${avatarPos.y}px, 0) rotate(${avatarPos.rotate}deg)`
                }}
              >
                {/* Tête */}
                <circle cx="12" cy="5" r="3" />
                {/* Corps */}
                <line x1="12" y1="8" x2="12" y2="15" />
                {/* Bras (mains) */}
                <path d="M6.5 11.5h11" />
                {/* Jambes (pieds) */}
                <path d="M8 20.5l4-5.5 4 5.5" />
              </svg>
            </div>

            <h2 className={styles.leftTitle}>INUBIL Verify</h2>
            <p className={styles.leftSubtitle}>
              Authentification sécurisée des diplômes & documents académiques.
            </p>
          </div>
        </div>

        {/* Colonne Droite */}
        <div className={styles.rightPanel}>
          <div className={styles.topNav}>
            <span className={styles.activeTab}>Connexion</span>
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
                  tabIndex="-1"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={enCours}>
              {enCours ? 'Connexion...' : 'Se connecter'}
            </button>

            <div className={styles.footerLinks}>
              <Link to="/forgot-password" className={styles.authLink}>
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}