import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
import styles from './DashboardEtudiant.module.css';
import VerificationModal from './Visualisation.jsx';

export default function DashboardEtudiant() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Données dynamiques de l'étudiant
  const user = {
    name: "Alain Koffi",
    address: "0x9e3f42...da8c2e11a0982f55c2",
    shortAddress: "0x9e3f...82f",
    level: "Étudiant en Master",
    initials: "AK"
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={styles.sidebar}>
        {/* Logo Header */}
        <div className={styles.brandGroup}>
          <div className={styles.logoBox}>
            <img alt="INUBIL Logo" className={styles.logo} src={Logo_Inubil} />
          </div>
        </div>

        {/* User Context Section */}
        <div className={styles.userContextWrapper}>
          <div className={styles.userContextBox}>
            <div className={styles.avatarInitials}>
              {user.initials}
            </div>
            <div className={styles.userMetadata}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userWallet}>{user.shortAddress}</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className={styles.navigation}>
          <button 
            onClick={() => setActiveMenu('dashboard')}
            className={`${styles.navBtn} ${activeMenu === 'dashboard' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Tableau de Bord</span>
          </button>

          <button 
            onClick={() => setActiveMenu('diplomas')}
            className={`${styles.navBtn} ${activeMenu === 'diplomas' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined">verified_user</span>
            <span>Mes Diplômes</span>
          </button>

          <button 
            onClick={() => setActiveMenu('views')}
            className={`${styles.navBtn} ${activeMenu === 'views' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined">visibility</span>
            <span>Vues Recruteurs</span>
          </button>

          {/*<button 
            onClick={() => setActiveMenu('security')}
            className={`${styles.navBtn} ${activeMenu === 'security' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined">security</span>
            <span>Sécurité</span>
          </button>  */}

          <button 
            onClick={() => setActiveMenu('settings')}
            className={`${styles.navBtn} ${activeMenu === 'settings' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Paramètres</span>
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className={styles.sidebarFooter}>
          <button onClick={() => navigate('/login')} className={styles.logoutBtn}>
            <span className="material-symbols-outlined">logout</span>
            <span className={styles.logoutText}>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={styles.main}>
        {/* TopAppBar */}
        <header className={styles.header}>
          
          <div className={styles.headerActions}>
            <button className={styles.notifBtn} title="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className={styles.divider}></div>
            <div className={styles.profileIndicator}>
              <div className={styles.profileText}>
                <span className={styles.profileName}>{user.name}</span>
                <span className={styles.profileRole}>{user.level}</span>
              </div>
              <div className={styles.headerAvatar}>
                {user.initials}
              </div>
            </div>
          </div>
        </header>

        {/* CANVAS CONTAINER */}
        <div className={styles.canvas}>
          
          {/* Welcome Banner compacte */}
          <section className={styles.welcomeBanner}>
            <div className={styles.bannerContent}>
              <h1 className={styles.bannerTitle}>Bonjour, {user.name.split(' ')[0]} ! 👋</h1>
              <p className={styles.bannerDesc}>
                Bienvenue dans votre espace personnel INUBIL VERIFY
              </p>
            </div>
            <button className={styles.shareProfileBtn}>
              <span className="material-symbols-outlined">share</span>
              Partager mon profil
            </button>
          </section>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statIconContainer} ${styles.iconCertified}`}>
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <p className={styles.statLabel}>Diplômes Certifiés</p>
                <h3 className={styles.statCount}>2</h3>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconContainer} ${styles.iconPending}`}>
                <span className="material-symbols-outlined">hourglass_empty</span>
              </div>
              <div>
                <p className={styles.statLabel}>En Attente</p>
                <h3 className={styles.statCount}>0</h3>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIconContainer} ${styles.iconViews}`}>
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <div>
                <p className={styles.statLabel}>Vues Recruteurs</p>
                <h3 className={styles.statCount}>14</h3>
              </div>
            </div>
          </div>

          {/* Degrees Section */}
          <section className={styles.degreesSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.titleIndicator}></span>
                Mes Diplômes & Certificats
              </h2>
              <a className={styles.seeAllLink} href="#all">
                Tout Voir <span className="material-symbols-outlined">open_in_new</span>
              </a>
            </div>

            <div className={styles.degreesGrid}>
              {/* Degree Card */}
              <div className={styles.degreeCard}>
                <div className={styles.cardTopIndicator}></div>
                <div className={styles.cardBody}>
                  <div className={styles.cardMainRow}>
                    <div className={styles.degreeTitles}>
                      <h3 className={styles.degreeName}>
                        Licence en Développement Web et Applications Internet Intégrées (DAWII)
                      </h3>
                      <p className={styles.degreeInstitution}>
                        Université d'Évry / ISTAMA — <span className={styles.goldText}>2026</span>
                      </p>
                    </div>
                    <span className={styles.statusBadge}>Actif</span>
                  </div>

                  <div className={styles.metadataGrid}>
                    <div className={styles.metaBlock}>
                      <span className={styles.metaLabel}>Mention</span>
                      <p className={styles.metaValue}>Bien</p>
                    </div>
                    <div className={styles.metaBlock}>
                      <span className={styles.metaLabel}>Niveau</span>
                      <p className={styles.metaValue}>Bac +3 (Niveau 6)</p>
                    </div>
                  </div>

                  <div className={styles.hashBlock}>
                    <div className={styles.hashLeft}>
                      <span className="material-symbols-outlined">fingerprint</span>
                      <code className={styles.hashCode}>{user.address}</code>
                    </div>
                    <button 
                      onClick={() => handleCopyHash(user.address)}
                      className={styles.copyHashBtn} 
                      title="Copier le hash"
                    >
                      <span className="material-symbols-outlined">
                        {copied ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>

                  <div className={styles.cardActionGroup}>
                    <button
                      className={styles.viewDegreeBtn}
                      onClick={() => setIsModalOpen(true)}
                    >
                      <span className="material-symbols-outlined">visibility</span> Voir le Diplôme
                    </button>
                    <button className={styles.shareCardBtn} title="Partager ce diplôme">
                      <span className="material-symbols-outlined">share</span>
                    </button>
                  </div>
                </div>

                <div className={styles.sealWatermark}>
                  <span className="material-symbols-outlined">verified</span>
                </div>
              </div>

              {/* Add State Card */}
              <div className={styles.addCardPlaceholder}>
                <div className={styles.addIconBox}>
                  <span className="material-symbols-outlined">add_card</span>
                </div>
                <h4 className={styles.addTitle}>Ajouter un nouveau certificat</h4>
                <p className={styles.addDesc}>
                  Utilisez un code de vérification ou importez un fichier JSON certifié.
                </p>
                <button className={styles.startProcessBtn}>
                  Lancer la procédure <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>

          {/* Footer Sécurité compact */}
          <footer className={styles.securityTipFooter}>
            <div className={styles.securityTipIconBox}>
              <span className="material-symbols-outlined">gavel</span>
            </div>
            <div className={styles.securityTipTexts}>
              <h5 className={styles.securityTipTitle}>Conseil de sécurité</h5>
              <p className={styles.securityTipDesc}>
                Ne partagez jamais vos identifiants secrets. Utilisez le bouton de partage pour générer des preuves publiques.
              </p>
            </div>
            <button className={styles.learnMoreBtn}>En savoir plus</button>
          </footer>

        </div>
      </main>

      <VerificationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}