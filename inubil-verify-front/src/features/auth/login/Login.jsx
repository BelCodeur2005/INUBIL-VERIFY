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

            <div className={styles.socialButtons}>
              {/* Bouton Google */}
              <button 
                type="button" 
                className={styles.btnSocialIcon}
                onClick={() => window.location.href = 'URL_AUTH_GOOGLE'}
                
              >
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
              </button>

              {/* Bouton Microsoft */}
              <button 
                type="button" 
                className={styles.btnSocialIcon}
                onClick={() => window.location.href = 'URL_AUTH_MICROSOFT'}
                
              >
                <svg width="20" height="20" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span>Microsoft</span>
              </button>
            </div>
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
                >
                  {showPassword ? '🙈' : '👁️'}
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