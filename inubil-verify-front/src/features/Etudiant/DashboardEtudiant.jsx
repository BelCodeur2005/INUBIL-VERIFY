import { useState } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
import styles from './DashboardEtudiant.module.css';
import VerificationModal from './Visualisation.jsx';
import MesDiplomes from './Mes-diplomes/MesDiplomes.jsx';
import MesPartages from './Mes-Partages/MesPartages.jsx';
import VuesRecruteurs from './Vues-Recruteurs/VuesRecruteurs.jsx';
import ParametresEtudiants from './Parametres-Etudiants/ParametresEtudiants.jsx';

export default function DashboardEtudiant() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { utilisateur, logout } = useAuth();

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const user = {
    name: `${prenom} ${nom}`.trim() || 'Utilisateur',
    address: '0x9e3f42...da8c2e11a0982f55c2',
    shortAddress: '0x...82f',
    level: 'Étudiant INUBIL',
    initials: `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '··',
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.page}>
      
      {/* Sidebar unifiee avec AppLayout/AdminInubil/DashboardDirecteur : logo, nav, nav bas —
          plus de bloc "wallet" dans la sidebar (adresse fictive retiree), deconnexion dans le header. */}
      <aside className={styles.sidebar}>
        <div className={styles.brandGroup}>
          <div className={styles.logoBox}>
            <img alt="INUBIL Logo" className={styles.logo} src={Logo_Inubil} />
          </div>
        </div>

        <nav className={styles.navigation}>
          <button 
            onClick={() => setActiveMenu('dashboard')}
            className={`${styles.navBtn} ${activeMenu === 'dashboard' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
            <span>Tableau de Bord</span>
          </button>

          <button 
            onClick={() => setActiveMenu('diplomas')}
            className={`${styles.navBtn} ${activeMenu === 'diplomas' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'diplomas' ? "'FILL' 1" : "'FILL' 0" }}>verified_user</span>
            <span>Mes Diplômes</span>
          </button>

          <button
            onClick={() => setActiveMenu('partages')}
            className={`${styles.navBtn} ${activeMenu === 'partages' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'partages' ? "'FILL' 1" : "'FILL' 0" }}>share</span>
            <span>Mes Partages</span>
          </button>

          <button
            onClick={() => setActiveMenu('views')}
            className={`${styles.navBtn} ${activeMenu === 'views' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'views' ? "'FILL' 1" : "'FILL' 0" }}>visibility</span>
            <span>Vues Recruteurs</span>
          </button>

        </nav>

        <nav className={styles.navBottom}>
          <button
            onClick={() => setActiveMenu('settings')}
            className={`${styles.navBtn} ${activeMenu === 'settings' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
            <span>Paramètres</span>
          </button>
        </nav>
      </aside>

      {/* CONTENU CENTRAL */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" placeholder="Rechercher un diplôme, une vérification..." className={styles.searchInput} />
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn}>
              <span className="material-symbols-outlined">notifications</span>
              <span className={styles.notifBadge}>3</span>
            </button>
            <button className={styles.iconBtn} title="Historique">
              <span className="material-symbols-outlined">history</span>
            </button>
            <AccountMenu
              prenom={prenom}
              nom={nom}
              roleLabel={user.level}
              onOpenAccount={() => setActiveMenu('settings')}
            />
            <button type="button" onClick={handleLogout} className={styles.iconBtn} title="Se déconnecter">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* AFFICHAGE CONDITIONNEL SELON L'ONGLET SÉLECTIONNÉ */}
        <div className={styles.canvas}>
          {activeMenu === 'dashboard' && (
            <AccueilContent 
              user={user} 
              copied={copied} 
              handleCopyHash={handleCopyHash} 
              setIsModalOpen={setIsModalOpen} 
              setActiveMenu={setActiveMenu}
            />
          )}

          {activeMenu === 'diplomas' && <MesDiplomes />}

          {activeMenu === 'partages' && <MesPartages />}

          {activeMenu === 'views' && <VuesRecruteurs />}
          

          {/*{activeMenu === 'views' && (
            <div style={{ padding: '24px' }}>
              <h2>Vues Recruteurs</h2>
              <p>Statistiques des consultations de votre profil...</p>
            </div>
          )}  */}

          {/*{activeMenu === 'settings' && (
            <div style={{ padding: '24px' }}>
              <h2>Paramètres</h2>
              <p>Gestion des préférences de votre compte...</p>
            </div>
          )} */}

          {activeMenu === 'settings' && <ParametresEtudiants />}
        </div>
      </main>

      <VerificationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

{/* SOUS-COMPOSANT ACCUEIL DU DASHBOARD */}
function AccueilContent({ user, copied, handleCopyHash, setIsModalOpen, setActiveMenu }) {
  return (
    <>
      {/* Welcome Banner */}
      <section className={styles.welcomeBanner}>
        <div className={styles.bannerContent}>
          <h1 className={styles.bannerTitle}>Bonjour, {user.name.split(' ')[0]} !</h1>
          <p className={styles.bannerDesc}>
            Bienvenue sur votre espace sécurisé INUBIL. Vos titres académiques sont ancrés sur la blockchain pour une intégrité totale.
          </p>
        </div>
        <button className={styles.shareProfileBtn}>
          <span className="material-symbols-outlined">share</span> Partager mon profil
        </button>
      </section>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconContainer} ${styles.iconCertified}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
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
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
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
            Mes Diplômes
          </h2>
          <button 
            className={styles.seeAllLink} 
            onClick={() => setActiveMenu('diplomas')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Tout Voir <span className="material-symbols-outlined">open_in_new</span>
          </button>
        </div>

        <div className={styles.degreesGrid}>
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
                  <span className="material-symbols-outlined">database</span>
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
                <button className={styles.shareCardBtn}>
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
            </div>

            <div className={styles.sealWatermark}>
              <span className="material-symbols-outlined">verified</span>
            </div>
          </div>

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

      {/* Security Tip Footer */}
      <footer className={styles.securityTipFooter}>
        <div className={styles.securityTipIconBox}>
          <span className="material-symbols-outlined">gavel</span>
        </div>
        <div className={styles.securityTipTexts}>
          <h5 className={styles.securityTipTitle}>Conseil de sécurité</h5>
          <p className={styles.securityTipDesc}>
            Ne partagez jamais vos clés privées INUBIL. Pour permettre à un recruteur de consulter vos titres, utilisez uniquement le bouton de partage.
          </p>
        </div>
        <button className={styles.learnMoreBtn}>En savoir plus</button>
      </footer>
    </>
  );
}