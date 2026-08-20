import { useState } from 'react';
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
import styles from './MonCompte.module.css';

// Page "Mon Compte" partagée par les 3 dashboards staff/admin (/universite,
// AdminInubil, DashboardDirecteur) — couvre les pages communes à tout utilisateur
// connecté (docs/ROLES_ET_PAGES.md §C : profil, mot de passe, sessions,
// notifications, historique de vérifications). Contenu mock, comme le reste des
// pages derrière les liens de sidebar — accord de scope déjà établi.
export default function MonCompte({ roleLabel }) {
  const { utilisateur } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const email = utilisateur?.email ?? '';
  const universiteNom = utilisateur?.universite?.nom ?? 'INUBIL';

  const [profile, setProfile] = useState({ prenom, nom });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirmPass: '' });
  const [notifications, setNotifications] = useState({
    documentsValides: true,
    documentsRejetes: true,
    connexionInhabituelle: true,
  });

  const sessions = [
    { id: 1, appareil: 'Chrome — Windows', icon: Laptop, lieu: 'Douala, Cameroun', actuelle: true, derniereActivite: "Maintenant" },
    { id: 2, appareil: 'Application mobile — Android', icon: Smartphone, lieu: 'Douala, Cameroun', actuelle: false, derniereActivite: 'Il y a 2 jours' },
  ];

  const historique = [
    { id: 1, cible: 'INUB-2026-0143', resultat: 'Authentique', date: '18/08/2026 09:12' },
    { id: 2, cible: 'INUB-2026-0098', resultat: 'Authentique', date: '15/08/2026 16:40' },
    { id: 3, cible: 'INUB-2025-0871', resultat: 'Révoqué', date: '02/08/2026 11:05' },
  ];

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
          <div className={styles.sessionsList}>
            {sessions.map((s) => (
              <div key={s.id} className={styles.sessionRow}>
                <div className={styles.sessionInfo}>
                  <s.icon size={20} className={styles.sessionIcon} />
                  <div>
                    <strong>{s.appareil}</strong>
                    <p>{s.lieu} — {s.derniereActivite}</p>
                  </div>
                </div>
                {s.actuelle ? (
                  <span className={styles.currentBadge}>Session actuelle</span>
                ) : (
                  <button type="button" className={styles.revokeBtn}>Révoquer</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Notifications par email</h2>
          <div className={styles.toggleList}>
            <div className={styles.toggleRow}>
              <div>
                <strong>Document validé ou rejeté</strong>
                <p>Recevoir une alerte lorsqu'un document que vous avez saisi est validé ou rejeté.</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={notifications.documentsValides} onChange={() => setNotifications({ ...notifications, documentsValides: !notifications.documentsValides })} />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Document révoqué</strong>
                <p>Recevoir une alerte lorsqu'un document est révoqué.</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={notifications.documentsRejetes} onChange={() => setNotifications({ ...notifications, documentsRejetes: !notifications.documentsRejetes })} />
                <span className={styles.slider}></span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Connexion inhabituelle</strong>
                <p>Être alerté en cas de connexion depuis un nouvel appareil.</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={notifications.connexionInhabituelle} onChange={() => setNotifications({ ...notifications, connexionInhabituelle: !notifications.connexionInhabituelle })} />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historique' && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Mon historique de vérifications</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Document</th>
                <th>Résultat</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((h) => (
                <tr key={h.id}>
                  <td className={styles.mono}>{h.cible}</td>
                  <td>
                    <span className={h.resultat === 'Authentique' ? styles.statusOk : styles.statusRevoked}>{h.resultat}</span>
                  </td>
                  <td className={styles.mono}>{h.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
