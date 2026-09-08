import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/useAuth';
import AccountMenu from '../../components/AccountMenu/AccountMenu';
import NotificationsBell from '../../components/NotificationsBell/NotificationsBell';
import { rechercherEtudiants } from '../../../core/etudiants/etudiants.api';
import { listerDocuments } from '../../../core/documents/documents.api';
import { ApiError } from '../../../core/api/client';
import styles from './AppLayout.module.css';
import Logo_Inubil from '../../../assets/Logo_Inubil.png';

// Les 3 rôles qui partagent ce layout — voir docs/ROLES_ET_PAGES.md §1-2.
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
    path: '/universite/etudiants',
    label: 'Étudiants',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    path: '/universite/registre',
    label: 'Registre Local',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    // doc:create (partage par les 3 roles) — GET/POST/PATCH/DELETE /types-document, /mentions
    // (docs/ROLES_ET_PAGES.md §D item 22).
    path: '/universite/referentiels',
    label: 'Référentiels',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    // doc:validate — seuls directeur_pedagogique/responsable_universite valident/rejettent
    // (docs/ROLES_ET_PAGES.md §D item 20).
    path: '/universite/validation',
    label: 'File de Validation',
    roles: [ROLES.DIRECTEUR, ROLES.RESPONSABLE],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
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
    // permission audit:read (responsable_universite uniquement, cf. seed.ts) —
    // scope automatique a sa propre universite cote backend.
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
  const { utilisateur, logout } = useAuth();
  const navigate = useNavigate();

  // Total reel de documents du registre — badge de nav "Registre Local"
  // (remplace un badge factice fixe "1.2K" jamais branche a une donnee).
  const [totalDocuments, setTotalDocuments] = useState(null);
  useEffect(() => {
    listerDocuments({ limit: 1 }).then((res) => setTotalDocuments(res.total ?? 0)).catch(() => {});
  }, []);

  // ── Recherche globale (étudiants par nom/prénom/matricule) ──────────────────
  const [rechercheTexte, setRechercheTexte] = useState('');
  const [rechercheResultats, setRechercheResultats] = useState([]);
  const [rechercheChargement, setRechercheChargement] = useState(false);
  const [rechercheErreur, setRechercheErreur] = useState(null);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const rechercheBoxRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const texte = rechercheTexte.trim();
      // En dessous de 2 caracteres, le menu deroulant n'est de toute facon pas
      // rendu (voir la condition JSX plus bas) : inutile de lancer une recherche.
      if (texte.length < 2) {
        setRechercheResultats([]);
        return;
      }
      setRechercheChargement(true);
      setRechercheErreur(null);
      try {
        const res = await rechercherEtudiants(texte, { limit: 6 });
        setRechercheResultats(res.data ?? []);
      } catch (err) {
        setRechercheResultats([]);
        setRechercheErreur(err instanceof ApiError ? err.message : 'Recherche indisponible.');
      } finally {
        setRechercheChargement(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [rechercheTexte]);

  // Ferme le menu déroulant au clic en dehors de la barre de recherche.
  useEffect(() => {
    function onClickAilleurs(e) {
      if (rechercheBoxRef.current && !rechercheBoxRef.current.contains(e.target)) {
        setRechercheOuverte(false);
      }
    }
    document.addEventListener('mousedown', onClickAilleurs);
    return () => document.removeEventListener('mousedown', onClickAilleurs);
  }, []);

  const choisirEtudiant = (etudiant) => {
    setRechercheOuverte(false);
    setRechercheTexte('');
    navigate(`/universite/etudiants?q=${encodeURIComponent(etudiant.numero_etudiant)}`);
  };

  const roleNom = utilisateur?.role?.nom;
  const visible = (item) => !item.roles || roleNom === undefined || item.roles.includes(roleNom);
  const navItemsVisibles = navItems.filter(visible);
  const bottomNavItemsVisibles = bottomNavItems.filter(visible);

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const roleLabel = ROLE_LABELS[roleNom] ?? roleNom ?? '';

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
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.path === '/universite/registre' && totalDocuments !== null && (
                <span className={styles.navBadge}>{totalDocuments.toLocaleString('fr-FR')}</span>
              )}
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
          {/* Barre de recherche — étudiants par nom, prénom ou matricule */}
          <div className={styles.searchBox} ref={rechercheBoxRef}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Rechercher un étudiant (nom, matricule...)"
              className={styles.searchInput}
              value={rechercheTexte}
              onChange={(e) => { setRechercheTexte(e.target.value); setRechercheOuverte(true); }}
              onFocus={() => setRechercheOuverte(true)}
            />

            {rechercheOuverte && rechercheTexte.trim().length >= 2 && (
              <div className={styles.searchDropdown}>
                {rechercheChargement && (
                  <div className={styles.searchDropdownMsg}>Recherche…</div>
                )}
                {!rechercheChargement && rechercheErreur && (
                  <div className={styles.searchDropdownMsg}>{rechercheErreur}</div>
                )}
                {!rechercheChargement && !rechercheErreur && rechercheResultats.length === 0 && (
                  <div className={styles.searchDropdownMsg}>Aucun étudiant ne correspond.</div>
                )}
                {!rechercheChargement && !rechercheErreur && rechercheResultats.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={styles.searchDropdownItem}
                    onClick={() => choisirEtudiant(e)}
                  >
                    <span className={styles.searchDropdownNom}>{e.prenom} {e.nom}</span>
                    <span className={styles.searchDropdownMatricule}>{e.numero_etudiant}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions droite */}
          <div className={styles.headerRight}>
            {/* Cloche notifications */}
            <NotificationsBell onClick={() => navigate('/universite/notifications')} />

            {/* Profil */}
            <AccountMenu
              prenom={prenom}
              nom={nom}
              roleLabel={roleLabel}
              onOpenAccount={() => navigate('/universite/mon-compte')}
            />
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
        </header>

        {/* Contenu injecté */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}