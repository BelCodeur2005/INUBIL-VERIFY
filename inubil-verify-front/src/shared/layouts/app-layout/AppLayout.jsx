import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';
import styles from './AppLayout.module.css';
import Logo_Inubil from '../../../assets/Logo_Inubil.png';

// Les 3 rôles qui partagent ce layout — voir docs/ROLES_ET_PAGES.md §1-2.
// directeur_pedagogique n'y atterrit pas encore via role-redirect.js (redirigé vers
// /dashboard-directeur en attendant la fusion prévue), mais le filtrage ci-dessous
// reste correct s'il y accède directement.
const ROLES = {
  AGENT: 'agent_saisie',
  DIRECTEUR: 'directeur_pedagogique',
  RESPONSABLE: 'responsable_universite',
};

const ROLE_LABELS = {
  [ROLES.AGENT]: 'Agent de Saisie',
  [ROLES.DIRECTEUR]: 'Directeur Pédagogique',
  [ROLES.RESPONSABLE]: 'Responsable Université',
};

// roles: undefined = visible pour tout le monde dans ce layout.
const navItems = [
  {
    path: '/universite',
    label: 'Tableau de Bord',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    path: '/universite/ajout',
    label: 'Ajout Unitaire',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        <line x1="12" y1="14" x2="12" y2="20"/><line x1="9" y1="17" x2="15" y2="17"/>
      </svg>
    ),
  },
  {
    path: '/universite/registre',
    label: 'Registre Local',
    badge: '1.2K',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    // doc:revoke — agent_saisie ne l'a pas (docs/ROLES_ET_PAGES.md §2).
    path: '/universite/revocations',
    label: 'Révocations',
    dot: true,
    roles: [ROLES.DIRECTEUR, ROLES.RESPONSABLE],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

const bottomNavItems = [
  {
    // Aucun des 3 rôles n'a de permission "audit"/"config" dédiée côté backend ;
    // on réserve ces deux pages au rôle le plus élevé de ce layout en attendant.
    path: '/universite/journal',
    label: 'Journal Activités',
    roles: [ROLES.RESPONSABLE],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    path: '/universite/parametres',
    label: 'Paramètres',
    roles: [ROLES.RESPONSABLE],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    path: '/universite/support',
    label: 'Support',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
];

export default function AppLayout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { utilisateur, logout } = useAuth();

  const roleNom = utilisateur?.role?.nom;
  const visible = (item) => !item.roles || roleNom === undefined || item.roles.includes(roleNom);
  const navItemsVisibles = navItems.filter(visible);
  const bottomNavItemsVisibles = bottomNavItems.filter(visible);

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || '··';
  const roleLabel = ROLE_LABELS[roleNom] ?? roleNom ?? '';

  const handleNavClick = (e, item) => {
    if (item.path === '/universite/ajout') {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={styles.shell}>

      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logoBox}>
          <img 
            src={Logo_Inubil} 
            alt="INUBIL Verify" 
            style={{ height: '100px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        {/* Navigation principale */}
        <nav className={styles.nav}>
          {navItemsVisibles.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/universite'}
              onClick={(e) => handleNavClick(e, item)}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive && item.path !== '/universite/ajout' ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
              {item.dot && <span className={styles.navDot}></span>}
            </NavLink>
          ))}
        </nav>

        {/* Navigation bas */}
        <nav className={styles.navBottom}>
          {bottomNavItemsVisibles.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── BLOC DROIT ── */}
      <div className={styles.rightBlock}>

        {/* Header */}
        <header className={styles.header}>
          {/* Barre de recherche */}
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Rechercher un matricule ou document..."
              className={styles.searchInput}
            />
          </div>

          {/* Actions droite */}
          <div className={styles.headerRight}>
            {/* Cloche notifications */}
            <button className={styles.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className={styles.notifBadge}>3</span>
            </button>

            {/* Historique */}
            <button className={styles.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
            </button>

            {/* Profil */}
            <div className={styles.userInfo}>
              <div className={styles.userTexts}>
                <span className={styles.userName}>{`${prenom} ${nom}`.trim() || 'Utilisateur'}</span>
                <span className={styles.userRole}>{roleLabel}</span>
              </div>
              <div className={styles.avatar}>{initiales}</div>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.iconBtn}
                title="Se déconnecter"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Contenu injecté */}
        <main className={styles.main}>
          <Outlet context={{ isModalOpen, setIsModalOpen }} />
        </main>
      </div>
    </div>
  );
}