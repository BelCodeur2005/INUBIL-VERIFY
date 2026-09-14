import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import NotificationsBell from '../../shared/components/NotificationsBell/NotificationsBell';
import NotificationsPanel from '../../shared/components/NotificationsPanel/NotificationsPanel';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
import styles from './DashboardEtudiant.module.css';
import MesDiplomes from './Mes-diplomes/MesDiplomes.jsx';
import MesPartages from './Mes-Partages/MesPartages.jsx';
import VerificationsActivite from './Verifications/VerificationsActivite.jsx';
import ParametresEtudiants from './Parametres-Etudiants/ParametresEtudiants.jsx';
import AccueilEtudiant from './AccueilEtudiant.jsx';

export default function DashboardEtudiant() {
  // Lien de notification (?document=<id>) : capture au premier rendu, ouvre
  // directement l'onglet Diplomes sur le detail vise (cf. MesDiplomes.jsx).
  const [searchParams] = useSearchParams();
  const [documentIdToOpen] = useState(() => searchParams.get('document'));
  const [activeMenu, setActiveMenu] = useState(() => (documentIdToOpen ? 'diplomas' : 'dashboard'));
  const [searchTerm, setSearchTerm] = useState('');
  const { utilisateur, logout } = useAuth();

  // La recherche du header filtre l'onglet actif s'il affiche une liste
  // (Mes Diplômes / Vérifications) ; depuis un autre onglet, taper bascule sur
  // Mes Diplômes pour afficher les résultats.
  const handleSearchChange = (e) => {
    const valeur = e.target.value;
    setSearchTerm(valeur);
    if (activeMenu !== 'diplomas' && activeMenu !== 'views') {
      setActiveMenu('diplomas');
    }
  };

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const user = {
    name: `${prenom} ${nom}`.trim() || 'Utilisateur',
    level: 'Étudiant INUBIL',
    initials: `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '··',
  };

  const handleLogout = async () => {
    await logout();
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
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'views' ? "'FILL' 1" : "'FILL' 0" }}>verified</span>
            <span>Vérifications</span>
          </button>

          <button
            onClick={() => setActiveMenu('notifications')}
            className={`${styles.navBtn} ${activeMenu === 'notifications' ? styles.navBtnActive : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: activeMenu === 'notifications' ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
            <span>Notifications</span>
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
            <input
              type="search"
              placeholder="Rechercher un diplôme, une vérification..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className={styles.headerActions}>
            <NotificationsBell onClick={() => setActiveMenu('notifications')} />
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
            <AccueilEtudiant prenom={prenom} setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === 'diplomas' && (
            <MesDiplomes searchTerm={searchTerm} onSearchTermChange={setSearchTerm} documentIdToOpen={documentIdToOpen} />
          )}

          {activeMenu === 'partages' && <MesPartages />}

          {activeMenu === 'views' && <VerificationsActivite searchTerm={searchTerm} />}

          {activeMenu === 'settings' && <ParametresEtudiants />}

          {activeMenu === 'notifications' && <NotificationsPanel />}
        </div>
      </main>
    </div>
  );
}
