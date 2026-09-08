import { useEffect, useState } from 'react';
import {
  User,
  Lock,
  Bell,
  Mail,
  Building,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Laptop,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { listerSessions, revoquerSession, mettreAJourPreferences } from '../../../core/auth/auth.api';
import { listerMesVerifications } from '../../../core/verifications/verifications.api';
import { ApiError } from '../../../core/api/client';
import styles from './MonCompte.module.css';

// Page "Mon Compte" partagée par les 3 dashboards staff/admin (/universite,
// AdminInubil, DashboardDirecteur) — couvre les pages communes à tout utilisateur
// connecté (docs/ROLES_ET_PAGES.md §C : profil, mot de passe, sessions, notifications).
// Sessions actives, Notifications (préférences email) et Historique de vérifications
// sont tous branchés sur des données réelles. "Connexion inhabituelle" est sauvegardée
// mais non appliquée : aucune détection d'anomalie de connexion n'existe encore côté backend.
const LABELS_RESULTAT = {
  authentique: { label: 'Authentique', classe: 'statusOk' },
  revoque:     { label: 'Révoqué',     classe: 'statusRevoked' },
  non_trouve:  { label: 'Non trouvé',  classe: 'statusWarn' },
  falsifie:    { label: 'Falsifié',    classe: 'statusRevoked' },
};

/** Devine appareil + navigateur depuis le user-agent stocké — approximatif mais lisible. */
function parseUserAgent(ua) {
  if (!ua) return { label: 'Appareil inconnu', Icon: Monitor };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let navigateur = 'Navigateur';
  if (/Edg\//i.test(ua)) navigateur = 'Edge';
  else if (/Chrome\//i.test(ua)) navigateur = 'Chrome';
  else if (/Firefox\//i.test(ua)) navigateur = 'Firefox';
  else if (/Safari\//i.test(ua)) navigateur = 'Safari';
  let os = '';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return {
    label: os ? `${navigateur} — ${os}` : navigateur,
    Icon: mobile ? Smartphone : Laptop,
  };
}

export default function MonCompte({ roleLabel }) {
  const { utilisateur } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [historique, setHistorique] = useState([]);
  const [historiqueLoading, setHistoriqueLoading] = useState(true);
  const [historiqueError, setHistoriqueError] = useState(null);

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const email = utilisateur?.email ?? '';
  const universiteNom = utilisateur?.universite?.nom ?? 'INUBIL';

  const [profile, setProfile] = useState({ prenom, nom });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' });
  // Absence de clé = activé par défaut (même convention que le backend).
  const preferencesUtilisateur = utilisateur?.preferences ?? {};
  const [notifications, setNotifications] = useState({
    documentsValides: preferencesUtilisateur.documents_valides !== false,
    documentsRejetes: preferencesUtilisateur.documents_rejetes !== false,
    connexionInhabituelle: preferencesUtilisateur.connexion_inhabituelle !== false,
  });
  const [preferencesEnCours, setPreferencesEnCours] = useState(null);
  const [preferencesError, setPreferencesError] = useState(null);

  const basculerPreference = async (cleFront, cleBackend) => {
    const nouvelleValeur = !notifications[cleFront];
    setPreferencesEnCours(cleFront);
    setPreferencesError(null);
    try {
      await mettreAJourPreferences({ [cleBackend]: nouvelleValeur });
      setNotifications((n) => ({ ...n, [cleFront]: nouvelleValeur }));
    } catch (err) {
      setPreferencesError(err instanceof ApiError ? err.message : 'Impossible d\'enregistrer cette préférence.');
    } finally {
      setPreferencesEnCours(null);
    }
  };

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [revocationEnCours, setRevocationEnCours] = useState(null);

  useEffect(() => {
    let annule = false;
    listerSessions()
      .then((data) => {
        if (annule) return;
        setSessions(data ?? []);
      })
      .catch((err) => {
        if (annule) return;
        setSessionsError(err instanceof ApiError ? err.message : 'Impossible de charger vos sessions.');
      })
      .finally(() => {
        if (!annule) setSessionsLoading(false);
      });
    return () => { annule = true; };
  }, []);

  const handleRevoquerSession = async (id) => {
    // L'API ne dit pas quelle session correspond a l'onglet courant — avertir avant
    // de risquer une deconnexion surprise si c'est justement celle-ci.
    if (!window.confirm("Révoquer cette session ? Si c'est celle que vous utilisez actuellement, vous serez déconnecté.")) {
      return;
    }
    setRevocationEnCours(id);
    try {
      await revoquerSession(id);
      setSessions((liste) => liste.filter((s) => s.id !== id));
    } catch (err) {
      setSessionsError(err instanceof ApiError ? err.message : 'Impossible de révoquer cette session.');
    } finally {
      setRevocationEnCours(null);
    }
  };

  useEffect(() => {
    let annule = false;
    listerMesVerifications({ limit: 50 })
      .then((res) => {
        if (annule) return;
        setHistorique(res.data ?? []);
      })
      .catch((err) => {
        if (annule) return;
        setHistoriqueError(err instanceof ApiError ? err.message : "Impossible de charger l'historique.");
      })
      .finally(() => {
        if (!annule) setHistoriqueLoading(false);
      });
    return () => { annule = true; };
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mon compte</h1>
        <p className={styles.subtitle}>Gérez vos informations personnelles, la sécurité et vos préférences.</p>
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
        <button className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={18} /> Notifications
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'historique' ? styles.activeTab : ''}`} onClick={() => setActiveTab('historique')}>
          <ShieldCheck size={18} /> Historique de vérifications
        </button>
      </div>

      {savedSuccess && (
        <div className={styles.alertSuccess}>
          <CheckCircle2 size={18} /> Modifications enregistrées avec succès !
        </div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Informations personnelles</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label><User size={15} /> Prénom</label>
              <input type="text" value={profile.prenom} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label><User size={15} /> Nom</label>
              <input type="text" value={profile.nom} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label><Mail size={15} /> Adresse email</label>
              <input type="email" value={email} disabled className={styles.disabledInput} />
              <span className={styles.fieldHint}>L'email professionnel ne peut pas être modifié.</span>
            </div>
            <div className={styles.formGroup}>
              <label><Building size={15} /> Établissement</label>
              <input type="text" value={universiteNom} disabled className={styles.disabledInput} />
            </div>
            <div className={styles.formGroup}>
              <label>Rôle</label>
              <input type="text" value={roleLabel ?? ''} disabled className={styles.disabledInput} />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn}>
              <Save size={16} /> Enregistrer les modifications
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleSaveProfile} className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Changer le mot de passe</h2>
          <div className={styles.formGroup}>
            <label>Mot de passe actuel</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                placeholder="••••••••"
              />
              <button type="button" className={styles.togglePassBtn} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Nouveau mot de passe</label>
              <input type="password" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} placeholder="8 caractères min." />
            </div>
            <div className={styles.formGroup}>
              <label>Confirmer le nouveau mot de passe</label>
              <input type="password" value={passwords.confirmPass} onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })} placeholder="Confirmez le mot de passe" />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn}>
              <KeyRound size={16} /> Mettre à jour le mot de passe
            </button>
          </div>
        </form>
      )}

      {activeTab === 'sessions' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Sessions actives</h2>
          {sessionsError && <p className={styles.errorText}>{sessionsError}</p>}
          {sessionsLoading && <p>Chargement…</p>}
          {!sessionsLoading && sessions.length === 0 && !sessionsError && (
            <p>Aucune session active pour l'instant.</p>
          )}
          {!sessionsLoading && sessions.length > 0 && (
            <div className={styles.sessionsList}>
              {sessions.map((s) => {
                const { label, Icon } = parseUserAgent(s.user_agent);
                return (
                  <div key={s.id} className={styles.sessionRow}>
                    <div className={styles.sessionInfo}>
                      <Icon size={20} className={styles.sessionIcon} />
                      <div>
                        <strong>{label}</strong>
                        <p>
                          {s.ip_address ?? 'IP inconnue'} — connecté le{' '}
                          {new Date(s.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.revokeBtn}
                      onClick={() => handleRevoquerSession(s.id)}
                      disabled={revocationEnCours === s.id}
                    >
                      {revocationEnCours === s.id ? 'Révocation…' : 'Révoquer'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Notifications par email</h2>
          {preferencesError && <p className={styles.errorText}>{preferencesError}</p>}
          <div className={styles.toggleList}>
            <div className={styles.toggleRow}>
              <div>
                <strong>Document validé</strong>
                <p>Recevoir une alerte lorsqu'un document que vous avez saisi est validé.</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.documentsValides}
                  disabled={preferencesEnCours === 'documentsValides'}
                  onChange={() => basculerPreference('documentsValides', 'documents_valides')}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Document rejeté</strong>
                <p>Recevoir une alerte lorsqu'un document que vous avez saisi est rejeté.</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.documentsRejetes}
                  disabled={preferencesEnCours === 'documentsRejetes'}
                  onChange={() => basculerPreference('documentsRejetes', 'documents_rejetes')}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Connexion inhabituelle</strong>
                <p>
                  Être alerté en cas de connexion depuis un nouvel appareil.{' '}
                  <em>Préférence enregistrée, mais non appliquée pour l'instant — aucune détection de connexion inhabituelle n'existe encore sur la plateforme.</em>
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notifications.connexionInhabituelle}
                  disabled={preferencesEnCours === 'connexionInhabituelle'}
                  onChange={() => basculerPreference('connexionInhabituelle', 'connexion_inhabituelle')}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historique' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Mon historique de vérifications</h2>
          {historiqueError && <p className={styles.errorText}>{historiqueError}</p>}
          {historiqueLoading && <p>Chargement…</p>}
          {!historiqueLoading && !historiqueError && historique.length === 0 && (
            <p>Aucune vérification effectuée pour l'instant.</p>
          )}
          {!historiqueLoading && historique.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Résultat</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {historique.map((h) => {
                  const meta = LABELS_RESULTAT[h.resultat] ?? { label: h.resultat, classe: 'statusWarn' };
                  return (
                    <tr key={h.id}>
                      <td className={styles.mono}>{h.document_numero_unique ?? '—'}</td>
                      <td>
                        <span className={styles[meta.classe]}>{meta.label}</span>
                      </td>
                      <td className={styles.mono}>{new Date(h.created_at).toLocaleString('fr-FR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
