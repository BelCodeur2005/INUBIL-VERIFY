import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Building, 
  Save, 
  KeyRound, 
  Eye, 
  EyeOff,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import styles from './ParametresEtudiants.module.css';

export default function ParametresEtudiant() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Profil Utilisateur
  const [profile, setProfile] = useState({
    fullName: 'Belvie Scindie',
    email: 'b.scindie@etudiant.inubil.org',
    phone: '+237 6 90 00 11 22',
    institution: 'ISTAMA / INUBIL',
    program: 'Licence Professionnelle DAWII',
    studentId: 'INUB-2024-8902'
  });

  // Sécurité
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirmPass: ''
  });
  const [twoFactor, setTwoFactor] = useState(true);

  // Preferences de confidentialité & notifications
  const [notifications, setNotifications] = useState({
    emailViews: true,
    emailShares: true,
    marketing: false
  });

  const [privacy, setPrivacy] = useState({
    publicProfile: false,
    showEmailToRecruiters: true
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className={styles.container}>
      {/* En-tête */}
      <div className={styles.header}>
        <h1 className={styles.title}>Paramètres du compte</h1>
        <p className={styles.subtitle}>
          Gérez vos informations personnelles, la sécurité de votre compte et vos préférences.
        </p>
      </div>

      {/* Tabs de Navigation */}
      <div className={styles.tabsNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} /> Profil
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={18} /> Sécurité
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} /> Notifications & Confidentialité
        </button>
      </div>

      {savedSuccess && (
        <div className={styles.alertSuccess}>
          <CheckCircle2 size={18} /> Modifications enregistrées avec succès !
        </div>
      )}

      {/* CONTENU 1 : PROFIL */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Informations Personnelles</h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label><User size={15} /> Nom complet</label>
              <input 
                type="text" 
                value={profile.fullName} 
                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label><Mail size={15} /> Adresse Email</label>
              <input 
                type="email" 
                value={profile.email} 
                disabled 
                className={styles.disabledInput}
              />
              <span className={styles.fieldHint}>L'email académique ne peut pas être modifié.</span>
            </div>

            <div className={styles.formGroup}>
              <label><Phone size={15} /> Numéro de Téléphone</label>
              <input 
                type="text" 
                value={profile.phone} 
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label><Building size={15} /> Établissement</label>
              <input 
                type="text" 
                value={profile.institution} 
                disabled 
                className={styles.disabledInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Filière / Parcours</label>
              <input 
                type="text" 
                value={profile.program} 
                disabled 
                className={styles.disabledInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Matricule Étudiant</label>
              <input 
                type="text" 
                value={profile.studentId} 
                disabled 
                className={styles.disabledInput}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn}>
              <Save size={16} /> Enregistrer les modifications
            </button>
          </div>
        </form>
      )}

      {/* CONTENU 2 : SÉCURITÉ */}
      {activeTab === 'security' && (
        <div className={styles.sectionsContainer}>
          <form onSubmit={handleSaveProfile} className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Changer le mot de passe</h2>

            <div className={styles.formGroup}>
              <label>Mot de passe actuel</label>
              <div className={styles.passwordInputWrapper}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  className={styles.togglePassBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Nouveau mot de passe</label>
                <input 
                  type="password" 
                  value={passwords.newPass}
                  onChange={(e) => setPasswords({...passwords, newPass: e.target.value})}
                  placeholder="8 caractères min."
                />
              </div>

              <div className={styles.formGroup}>
                <label>Confirmer le nouveau mot de passe</label>
                <input 
                  type="password" 
                  value={passwords.confirmPass}
                  onChange={(e) => setPasswords({...passwords, confirmPass: e.target.value})}
                  placeholder="Confirmez le mot de passe"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                <KeyRound size={16} /> Mettre à jour le mot de passe
              </button>
            </div>
          </form>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Double Authentification (2FA)</h2>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <div className={styles.toggleHeader}>
                  <Smartphone size={20} className={styles.toggleIcon} />
                  <strong>Authentification à deux facteurs</strong>
                </div>
                <p>Protégez l'accès à vos diplômes certifiés par un code SMS ou une application d'authentification.</p>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={twoFactor} 
                  onChange={() => setTwoFactor(!twoFactor)} 
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU 3 : NOTIFICATIONS & CONFIDENTIALITÉ */}
      {activeTab === 'notifications' && (
        <div className={styles.sectionsContainer}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Notifications par Email</h2>
            
            <div className={styles.toggleList}>
              <div className={styles.toggleRow}>
                <div>
                  <strong>Consultation de diplôme</strong>
                  <p>Recevoir une alerte par email lorsqu'un recruteur consulte l'un de vos diplômes.</p>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={notifications.emailViews} 
                    onChange={() => setNotifications({...notifications, emailViews: !notifications.emailViews})} 
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <strong>Expiration de lien de partage</strong>
                  <p>Recevoir un rappel 24h avant qu'un de vos liens de partage ne devienne inactif.</p>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={notifications.emailShares} 
                    onChange={() => setNotifications({...notifications, emailShares: !notifications.emailShares})} 
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Confidentialité</h2>

            <div className={styles.toggleList}>
              <div className={styles.toggleRow}>
                <div>
                  <strong>Afficher mon adresse email aux recruteurs</strong>
                  <p>Permet aux recruteurs de voir vos coordonnées directes lors de la vérification de vos diplômes.</p>
                </div>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={privacy.showEmailToRecruiters} 
                    onChange={() => setPrivacy({...privacy, showEmailToRecruiters: !privacy.showEmailToRecruiters})} 
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}