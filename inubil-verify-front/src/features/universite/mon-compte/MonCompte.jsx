import React, { useState } from 'react';
import styles from './MonCompte.module.css';

export default function MonCompte({ utilisateur, roleLabel, onLogout }) {
  const [formData, setFormData] = useState({
    prenom: utilisateur?.prenom || '',
    nom: utilisateur?.nom || '',
    email: utilisateur?.email || '',
    telephone: utilisateur?.telephone || '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInfoChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulation mise à jour profil
    setTimeout(() => {
      setIsSubmitting(false);
      setMessage({ type: 'success', text: 'Informations mises à jour avec succès !' });
    }, 800);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    setIsSubmitting(true);
    // Simulation mise à jour mot de passe
    setTimeout(() => {
      setIsSubmitting(false);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès !' });
    }, 800);
  };

  const initials = `${formData.prenom?.[0] || 'U'}${formData.nom?.[0] || ''}`.toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        
        {/* En-tête Profil */}
        <header className={styles.profileHeader}>
          <div className={styles.avatarZone}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <h1 className={styles.userName}>{formData.prenom} {formData.nom}</h1>
              <p className={styles.userEmail}>{formData.email}</p>
            </div>
          </div>
          <span className={styles.roleBadge}>{roleLabel}</span>
        </header>

        {message && (
          <div className={message.type === 'success' ? styles.alertSuccess : styles.alertError}>
            {message.text}
          </div>
        )}

        <div className={styles.gridSection}>
          
          {/* Section 1 : Informations Personnelles */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Informations Personnelles</h2>
            <form onSubmit={handleSaveInfo} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.fieldGroup}>
                  <label>Prénom</label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleInfoChange}
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Nom</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInfoChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>Adresse E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInfoChange}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  placeholder="+237 ..."
                  value={formData.telephone}
                  onChange={handleInfoChange}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Rôle attribué (Non modifiable)</label>
                <input type="text" value={roleLabel} disabled className={styles.inputDisabled} />
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Sauvegarder les modifications'}
              </button>
            </form>
          </section>

          {/* Section 2 : Sécurité & Mot de passe */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Sécurité du Compte</h2>
            <form onSubmit={handleUpdatePassword} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <button type="submit" className={styles.btnSecondary} disabled={isSubmitting}>
                Mettre à jour le mot de passe
              </button>
            </form>

            <hr className={styles.divider} />

            <div className={styles.dangerZone}>
              <h3>Session</h3>
              <p>Déconnectez-vous de votre session active sur cet appareil.</p>
              <button type="button" onClick={onLogout} className={styles.btnDanger}>
                Se déconnecter
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}