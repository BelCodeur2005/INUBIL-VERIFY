import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { activerInvitation, apercuInvitation } from '../../../core/invitations/invitations.api';
import { useAuth } from '../../../core/auth/useAuth';
import { ApiError } from '../../../core/api/client';
import styles from './ActiverInvitation.module.css';

// Message exact renvoye par le backend (invitations.service.ts) quand aucun compte n'existe
// encore pour l'email invite — sert a distinguer "il faut creer un compte" d'une vraie erreur
// (token invalide/expire, compte deja actif...). Pour un etudiant (cible connue via l'apercu),
// nom/prenom viennent deja de sa fiche : seul le mot de passe manque reellement, mais le backend
// renvoie le meme message generique, donc le test reste valable pour les deux cibles.
const INDICE_NOUVEAU_COMPTE = 'nom, prenom et mot_de_passe sont requis';

/** Page d'activation d'une invitation (collaborateur ou etudiant) — lien recu par email (?token=...), route publique. */
export default function ActiverInvitation() {
  const navigate = useNavigate();
  const { connecterSession } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // 'verification' | 'formulaire' | 'erreur' — pas de jeton = erreur immediate, connue des le rendu initial.
  const [phase, setPhase] = useState(() => (token ? 'verification' : 'erreur'));
  const [erreurFatale, setErreurFatale] = useState(() =>
    token ? '' : "Ce lien d'invitation est invalide : le jeton est manquant.",
  );
  const [erreurFormulaire, setErreurFormulaire] = useState('');
  const [enCours, setEnCours] = useState(false);

  // 'collaborateur' par defaut (comportement historique) tant que l'apercu n'a pas repondu.
  const [cible, setCible] = useState('collaborateur');
  const [prenomEtudiant, setPrenomEtudiant] = useState('');
  const estEtudiant = cible === 'etudiant';

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = motDePasse.length >= 8;
  const hasUppercase = /[A-Z]/.test(motDePasse);
  const hasLowercase = /[a-z]/.test(motDePasse);
  const hasNumber = /[0-9]/.test(motDePasse);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(motDePasse);
  const motsDePasseValides = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const motsDePasseCorrespondent = motDePasse.length > 0 && motDePasse === confirmMotDePasse;

  // 1. Apercu public du token (cible etudiant/collaborateur + prenom si etudiant) pour
  //    adapter la copie et le formulaire, sans encore rien activer.
  // 2. Tentative silencieuse d'activation : couvre le cas "compte deja existant" (aucun
  //    champ requis). Si le backend repond qu'un nouveau compte doit etre cree, on affiche
  //    le formulaire (sans nom/prenom pour un etudiant, deja connus de sa fiche).
  useEffect(() => {
    if (!token) return; // deja gere par l'etat initial ci-dessus

    let annule = false;
    (async () => {
      try {
        const apercu = await apercuInvitation(token);
        if (annule) return;
        setCible(apercu.cible);
        setPrenomEtudiant(apercu.prenom ?? '');
      } catch (err) {
        if (annule) return;
        const message = err instanceof ApiError ? err.message : "Ce lien d'invitation est invalide ou a expiré.";
        setPhase('erreur');
        setErreurFatale(message);
        return;
      }

      try {
        await activerInvitation({ token });
        if (annule) return;
        const destination = await connecterSession();
        navigate(destination, { replace: true });
      } catch (err) {
        if (annule) return;
        const message = err instanceof ApiError ? err.message : "Ce lien d'invitation est invalide ou a expiré.";
        if (message.includes(INDICE_NOUVEAU_COMPTE)) {
          setPhase('formulaire');
        } else {
          setPhase('erreur');
          setErreurFatale(message);
        }
      }
    })();

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreurFormulaire('');

    if (!estEtudiant && (!nom.trim() || !prenom.trim())) {
      setErreurFormulaire('Le nom et le prénom sont requis.');
      return;
    }
    if (!motsDePasseValides) {
      setErreurFormulaire('Le mot de passe ne respecte pas toutes les exigences ci-dessous.');
      return;
    }
    if (!motsDePasseCorrespondent) {
      setErreurFormulaire('Les mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);
    try {
      await activerInvitation({
        token,
        ...(estEtudiant ? {} : { nom: nom.trim(), prenom: prenom.trim() }),
        mot_de_passe: motDePasse,
      });
      const destination = await connecterSession();
      navigate(destination, { replace: true });
    } catch (err) {
      setErreurFormulaire(err instanceof ApiError ? err.message : 'Impossible de finaliser votre compte.');
    } finally {
      setEnCours(false);
    }
  };

  if (phase === 'verification') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.verificationBox}>
          <div className={styles.spinner} />
          <p>Vérification de votre invitation…</p>
        </div>
      </div>
    );
  }

  if (phase === 'erreur') {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.verificationBox}>
          <div className={styles.errorIcon}>✕</div>
          <h2 className={styles.errorTitle}>Invitation invalide</h2>
          <p className={styles.errorText}>{erreurFatale}</p>
          <Link to="/login" className={styles.btnBack}>
            <span className={styles.backArrow}>←</span> Retour à la page de connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.authCard}>

        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>{estEtudiant ? 'ESPACE PERSONNEL' : 'INVITATION COLLABORATEUR'}</span>
            <h1 className={styles.heroTitle}>
              {estEtudiant ? `Bienvenue${prenomEtudiant ? `, ${prenomEtudiant}` : ''}` : 'Bienvenue sur INUBIL Verify'}
            </h1>
            <p className={styles.heroSubtitle}>
              {estEtudiant
                ? "Votre établissement a émis un ou plusieurs documents à votre nom. Définissez un mot de passe pour accéder à votre espace personnel et les consulter à tout moment."
                : "Vous avez été invité(e) à rejoindre votre établissement sur la plateforme. Finalisez la création de votre compte pour accéder à votre espace."}
            </p>
          </div>
          <div className={styles.circleBg1}></div>
          <div className={styles.circleBg2}></div>
          <div className={styles.circleBg3}></div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.textCenter}>
            <h2 className={styles.authTitle}>{estEtudiant ? 'Définir votre mot de passe' : 'Créer votre compte'}</h2>
            <p className={styles.authSubtitle}>
              {estEtudiant ? 'Une dernière étape pour activer votre espace personnel.' : 'Renseignez vos informations pour activer votre accès.'}
            </p>
          </div>

          {erreurFormulaire && <div className={styles.alertError}>{erreurFormulaire}</div>}

          <form onSubmit={handleSubmit} className={styles.formStack}>
            {!estEtudiant && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>PRÉNOM</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Jean"
                    className={styles.inputField}
                    disabled={enCours}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>NOM</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Dupont"
                    className={styles.inputField}
                    disabled={enCours}
                    required
                  />
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>MOT DE PASSE</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className={styles.inputField}
                  disabled={enCours}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeButton} tabIndex="-1">
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

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>CONFIRMER LE MOT DE PASSE</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmMotDePasse}
                onChange={(e) => setConfirmMotDePasse(e.target.value)}
                placeholder="••••••••"
                className={styles.inputField}
                disabled={enCours}
                required
              />
            </div>

            <div className={styles.requirementsBox}>
              <h3 className={styles.requirementsTitle}>EXIGENCES DU MOT DE PASSE :</h3>
              <ul className={styles.requirementsList}>
                <li className={hasMinLength ? styles.validItem : ''}><span className={styles.checkIcon}>{hasMinLength ? '✓' : '•'}</span> 8 caractères minimum</li>
                <li className={hasUppercase && hasLowercase ? styles.validItem : ''}><span className={styles.checkIcon}>{hasUppercase && hasLowercase ? '✓' : '•'}</span> Une majuscule et une minuscule</li>
                <li className={hasNumber ? styles.validItem : ''}><span className={styles.checkIcon}>{hasNumber ? '✓' : '•'}</span> Au moins un chiffre</li>
                <li className={hasSpecialChar ? styles.validItem : ''}><span className={styles.checkIcon}>{hasSpecialChar ? '✓' : '•'}</span> Au moins un caractère spécial</li>
              </ul>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={enCours}>
              <span>{enCours ? 'Création du compte…' : 'Activer mon compte'}</span>
              <span className={styles.arrowIcon}>→</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
