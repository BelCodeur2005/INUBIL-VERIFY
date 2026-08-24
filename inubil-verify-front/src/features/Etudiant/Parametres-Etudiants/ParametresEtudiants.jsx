import { useEffect, useState } from 'react';
import {
  User,
  Lock,
  Monitor,
  Mail,
  Phone,
  Building,
  IdCard,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  getProfil,
  modifierProfil,
  changerMotDePasse,
  listerSessions,
  revoquerSession,
} from '../../../core/auth/auth.api';
import { getMonProfilEtudiant } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import styles from './ParametresEtudiants.module.css';

// Page "Paramètres" de l'espace étudiant — équivalent de "Mon Compte" côté staff,
// mais propre à l'étudiant (pas de page séparée pour ce rôle). Branchée sur le
// backend réel : GET/PATCH /auth/me, PATCH /auth/password, GET/DELETE /auth/sessions,
// GET /etudiants/moi (dossier académique, lecture seule — géré par l'établissement).
// Pas de 2FA ni de préférences de notification/confidentialité ici : aucun endpoint
// backend ne les supporte, et un stockage local ne pourrait pas honnêtement piloter
// un envoi d'email ou une visibilité tierce — donc pas de faux toggles.
export default function ParametresEtudiant() {
  const [activeTab, setActiveTab] = useState('profile');

  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(null);
  const [profil, setProfil] = useState(null);
  const [etudiant, setEtudiant] = useState(null);
  const [sessions, setSessions] = useState([]);

  const [form, setForm] = useState({ prenom: '', nom: '' });
  const [savingProfil, setSavingProfil] = useState(false);
  const [erreurProfil, setErreurProfil] = useState(null);
  const [savedProfil, setSavedProfil] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [erreurPassword, setErreurPassword] = useState(null);
  const [savedPassword, setSavedPassword] = useState(false);

  const [revoquant, setRevoquant] = useState(null);

  useEffect(() => {
    let annule = false;
    Promise.all([getProfil(), getMonProfilEtudiant(), listerSessions()])
      .then(([p, e, s]) => {
        if (annule) return;
        setProfil(p);
        setEtudiant(e);
        setSessions(s ?? []);
        setForm({ prenom: p.prenom, nom: p.nom });
      })
      .catch((err) => {
        if (annule) return;
        setErreurChargement(err instanceof ApiError ? err.message : 'Impossible de charger votre compte.');
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => { annule = true; };
  }, []);

  const soumettreProfil = async (e) => {
    e.preventDefault();
    setSavingProfil(true);
    setErreurProfil(null);
    try {
      const majProfil = await modifierProfil({ prenom: form.prenom, nom: form.nom });
      setProfil(majProfil);
      setSavedProfil(true);
      setTimeout(() => setSavedProfil(false), 3000);
    } catch (err) {
      setErreurProfil(err instanceof ApiError ? err.message : 'Impossible d\'enregistrer.');
    } finally {
      setSavingProfil(false);
    }
  };

  const soumettrePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setErreurPassword(null);
    try {
      await changerMotDePasse({
        ancien_mot_de_passe: passwords.current,
        nouveau_mot_de_passe: passwords.newPass,
        confirmation_mot_de_passe: passwords.confirmPass,
      });
      setPasswords({ current: '', newPass: '', confirmPass: '' });
      setSavedPassword(true);
      setTimeout(() => setSavedPassword(false), 3000);
    } catch (err) {
      setErreurPassword(err instanceof ApiError ? err.message : 'Impossible de changer le mot de passe.');
    } finally {
      setSavingPassword(false);
    }
  };

  const revoquer = async (id) => {
    setRevoquant(id);
    try {
      await revoquerSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // La liste reste inchangee ; l'utilisateur peut reessayer.
    } finally {
      setRevoquant(null);
    }
  };

  const fmtDateHeure = (iso) => new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (chargement) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}><Loader2 size={22} className={styles.spinIcon} /> Chargement de votre compte…</div>
      </div>
    );
  }

  if (erreurChargement) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}><AlertTriangle size={18} /> {erreurChargement}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Paramètres</h1>
        <p className={styles.subtitle}>Gérez les informations de votre compte, votre mot de passe et vos sessions actives.</p>
      </div>

      <div className={styles.tabsNav}>
        <button className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={18} /> Profil
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`} onClick={() => setActiveTab('security')}>
          <Lock size={18} /> Sécurité
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'sessions' ? styles.activeTab : ''}`} onClick={() => setActiveTab('sessions')}>
          <Monitor size={18} /> Sessions actives
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className={styles.sectionsContainer}>
          <form onSubmit={soumettreProfil} className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Informations du compte</h2>
            {savedProfil && <div className={styles.alertSuccess}><CheckCircle2 size={18} /> Profil mis à jour.</div>}
            {erreurProfil && <div className={styles.errorBox}><AlertTriangle size={18} /> {erreurProfil}</div>}

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label><User size={15} /> Prénom</label>
                <input type="text" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label><User size={15} /> Nom</label>
                <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
              </div>
              <div className={styles.formGroup}>
                <label><Mail size={15} /> Adresse email</label>
                <input type="email" value={profil.email} disabled className={styles.disabledInput} />
                <span className={styles.fieldHint}>L'email de connexion ne peut pas être modifié ici.</span>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn} disabled={savingProfil}>
                <Save size={16} /> {savingProfil ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Dossier académique</h2>
            <p className={styles.sectionDesc}>Ces informations figurent sur vos diplômes — gérées par votre établissement.</p>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label><IdCard size={15} /> Nom sur le diplôme</label>
                <input type="text" value={`${etudiant.prenom} ${etudiant.nom}`} disabled className={styles.disabledInput} />
              </div>
              <div className={styles.formGroup}>
                <label>Matricule étudiant</label>
                <input type="text" value={etudiant.numero_etudiant} disabled className={styles.disabledInput} />
              </div>
              <div className={styles.formGroup}>
                <label><Building size={15} /> Établissement</label>
                <input type="text" value={etudiant.universite} disabled className={styles.disabledInput} />
              </div>
              <div className={styles.formGroup}>
                <label><Phone size={15} /> Téléphone</label>
                <input type="text" value={etudiant.telephone ?? 'Non renseigné'} disabled className={styles.disabledInput} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <form onSubmit={soumettrePassword} className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Changer le mot de passe</h2>
          {savedPassword && <div className={styles.alertSuccess}><CheckCircle2 size={18} /> Mot de passe modifié.</div>}
          {erreurPassword && <div className={styles.errorBox}><AlertTriangle size={18} /> {erreurPassword}</div>}

          <div className={styles.formGroup}>
            <label>Mot de passe actuel</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="••••••••"
                required
              />
              <button type="button" className={styles.togglePassBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Nouveau mot de passe</label>
              <input type="password" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} placeholder="8 caractères min." required />
            </div>
            <div className={styles.formGroup}>
              <label>Confirmer le nouveau mot de passe</label>
              <input type="password" value={passwords.confirmPass} onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })} placeholder="Confirmez le mot de passe" required />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={savingPassword}>
              <KeyRound size={16} /> {savingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'sessions' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Sessions actives</h2>
          {sessions.length === 0 ? (
            <p className={styles.sectionDesc}>Aucune session active.</p>
          ) : (
            <div className={styles.sessionsList}>
              {sessions.map((s) => (
                <div key={s.id} className={styles.sessionRow}>
                  <div className={styles.sessionInfo}>
                    <Monitor size={20} className={styles.sessionIcon} />
                    <div>
                      <strong>{s.user_agent ?? 'Client inconnu'}</strong>
                      <p>{s.ip_address ?? 'IP inconnue'} — connecté le {fmtDateHeure(s.created_at)}</p>
                    </div>
                  </div>
                  <button type="button" className={styles.revokeBtn} onClick={() => revoquer(s.id)} disabled={revoquant === s.id}>
                    <Trash2 size={14} /> {revoquant === s.id ? 'Révocation…' : 'Révoquer'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
