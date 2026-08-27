import { useState } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
import styles from './DashboardEtudiant.module.css';
import MesDiplomes from './Mes-diplomes/MesDiplomes.jsx';
import MesPartages from './Mes-Partages/MesPartages.jsx';
import VerificationsActivite from './Verifications/VerificationsActivite.jsx';
import ParametresEtudiants from './Parametres-Etudiants/ParametresEtudiants.jsx';
import AccueilEtudiant from './AccueilEtudiant.jsx';

export default function DashboardEtudiant() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const { utilisateur, logout } = useAuth();

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
            <AccueilEtudiant prenom={prenom} setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === 'diplomas' && <MesDiplomes />}

          {activeMenu === 'partages' && <MesPartages />}

          {activeMenu === 'views' && <VerificationsActivite />}

          {activeMenu === 'settings' && <ParametresEtudiants />}
        </div>
      </main>
    </div>
  );
}
