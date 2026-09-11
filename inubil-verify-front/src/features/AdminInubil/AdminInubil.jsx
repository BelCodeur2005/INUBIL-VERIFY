import { useState, useEffect } from 'react';
import {
  LineChart, FileText, Bell, Users, ClipboardCheck, Settings, Building2,
  ShieldCheck, GraduationCap, Share2, UserPlus, Search, DatabaseBackup, ChevronDown,
  Shield, AlertTriangle, Mail,
} from 'lucide-react';
import { SECTIONS_CONFIG, metaConfig } from './configurations-metadata';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import NotificationsBell from '../../shared/components/NotificationsBell/NotificationsBell';
import NotificationsPanel from '../../shared/components/NotificationsPanel/NotificationsPanel';
import MonCompte from '../../shared/components/MonCompte/MonCompte';
import styles from './AdminInubil.module.css';
import {
  InviterUtilisateurModal,
  ConfigEditDrawer,
} from './AdminModals';
import { listerConfigurations } from '../../core/configurations/configurations.api';
import ListeDocuments from '../../shared/components/ListeDocuments/ListeDocuments';
import TendanceChart from '../../shared/components/TendanceChart/TendanceChart';
import { plageJours } from '../../shared/components/TendanceChart/plageJours';
import RepartitionDocuments from '../../shared/components/RepartitionDocuments/RepartitionDocuments';
import JournalAudit from '../../shared/components/JournalAudit/JournalAudit';
import Pagination from '../../shared/components/Pagination/Pagination';
import { listerRoles } from '../../core/roles/roles.api';
import {
  listerUtilisateursAdmin,
  activerUtilisateurAdmin,
  desactiverUtilisateurAdmin,
  getStatistiquesGlobales,
  getStatistiquesGraphe,
  declencherBackup,
} from '../../core/admin/admin.api';
import { assignerRole } from '../../core/utilisateurs/utilisateurs.api';
import { ApiError } from '../../core/api/client';

// Statuts reels d'un compte utilisateur (enum statut_utilisateur, backend) —
// distinct des statuts de document (brouillon/en_validation/actif/revoque/...).
const LABELS_STATUT_COMPTE = {
  actif:            { label: 'Actif',              classe: 'statusActive' },
  inactif:          { label: 'Inactif',             classe: 'statusInactive' },
  suspendu:         { label: 'Suspendu',            classe: 'statusSuspended' },
  en_attente_email: { label: "En attente d'email",  classe: 'statusPending' },
};

const ROLE_LABELS = {
  super_admin: 'Super Administrateur',
  admin_istama: 'Administration INUBIL',
  responsable_universite: 'Responsable Université',
  directeur_pedagogique: 'Directeur Pédagogique',
  agent_saisie: 'Agent de Saisie',
  etudiant: 'Étudiant',
  autre_universite: 'Université Partenaire',
  employeur: 'Employeur',
};

// TendanceChart et RepartitionDocuments sont maintenant des composants partages
// (voir shared/components/) — reutilises tels quels par DashboardEtablissement.jsx.

// Item de sidebar avec sous-menu en accordéon : les sous-items se déplient sous le
// parent, dans la sidebar foncée elle-même (remplace l'ancien flyout en popup blanc
// détaché à côté de la sidebar, jugé visuellement incohérent avec le reste).
function AccordionNavItem({ label, icon, isOpen, isChildActive, onToggle, children }) {
  return (
    <div className={styles.accordionWrapper}>
      <button
        className={isChildActive ? styles.navItemActive : styles.navItem}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        {icon}
        <span>{label}</span>
        <span className={`${styles.accordionChevron} ${isOpen ? styles.accordionChevronOpen : ''}`}>
          <ChevronDown size={16} />
        </span>
      </button>
      {isOpen && <div className={styles.accordionPanel}>{children}</div>}
    </div>
  );
}

export default function AdminInubil() {
  const [activeTab, setActiveTab] = useState('statistiques');
  const [openAccordion, setOpenAccordion] = useState(null);
  const { utilisateur, logout } = useAuth();

  const toggleAccordion = (id) => setOpenAccordion((prev) => (prev === id ? null : id));
  const selectFromAccordion = (tab) => {
    setActiveTab(tab);
    setOpenAccordion(null);
  };

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const roleNom = utilisateur?.role?.nom;
  const roleLabel = ROLE_LABELS[roleNom] ?? roleNom ?? '';

  const handleLogout = async () => {
    await logout();
  };

  // ── Toast de retour d'action (remplace window.alert()) ──
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // États des Modales
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // ── Paramètres Système (GET/PUT /configurations) ──
  const [configs, setConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState(null);
  const [configEnEdition, setConfigEnEdition] = useState(null);
  const [settingsSection, setSettingsSection] = useState('securite');

  const chargerConfigurations = async () => {
    setConfigsLoading(true);
    setConfigsError(null);
    try {
      const res = await listerConfigurations();
      setConfigs(res ?? []);
    } catch (err) {
      setConfigsError(err instanceof ApiError ? err.message : 'Impossible de charger les paramètres.');
    } finally {
      setConfigsLoading(false);
    }
  };

  useEffect(() => { (async () => { await chargerConfigurations(); })(); }, []);

  // ── Sauvegarde Manuelle (POST /admin/backup) ──
  const [backupEnCours, setBackupEnCours] = useState(false);
  const [backupResultat, setBackupResultat] = useState(null);
  const [backupErreur, setBackupErreur] = useState(null);

  const lancerBackup = async () => {
    setBackupEnCours(true);
    setBackupErreur(null);
    setBackupResultat(null);
    try {
      const res = await declencherBackup();
      setBackupResultat(res);
    } catch (err) {
      setBackupErreur(err instanceof ApiError ? err.message : 'Le backup a échoué.');
    } finally {
      setBackupEnCours(false);
    }
  };

  // ── Statistiques globales (GET /admin/statistiques) ──
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    let annule = false;
    getStatistiquesGlobales()
      .then((s) => { if (!annule) setStats(s); })
      .catch((err) => { if (!annule) setStatsError(err instanceof ApiError ? err.message : 'Impossible de charger les statistiques.'); })
      .finally(() => { if (!annule) setStatsLoading(false); });
    return () => { annule = true; };
  }, []);

  // ── Tendance 30 jours (GET /admin/statistiques/graphe) ──
  const [graphePoints, setGraphePoints] = useState([]);
  const [grapheLoading, setGrapheLoading] = useState(true);
  const [grapheError, setGrapheError] = useState(null);

  useEffect(() => {
    let annule = false;
    const jours = plageJours(30);
    getStatistiquesGraphe({ granularite: 'jour', debut: jours[0], fin: jours[jours.length - 1] })
      .then((res) => {
        if (annule) return;
        const parJour = new Map((res ?? []).map((p) => [p.date, p]));
        setGraphePoints(jours.map((date) => ({
          date,
          documents_emis: parJour.get(date)?.documents_emis ?? 0,
          verifications: parJour.get(date)?.verifications ?? 0,
        })));
      })
      .catch((err) => { if (!annule) setGrapheError(err instanceof ApiError ? err.message : 'Impossible de charger la tendance.'); })
      .finally(() => { if (!annule) setGrapheLoading(false); });
    return () => { annule = true; };
  }, []);

  // ── Rôles (partagé entre l'onglet Utilisateurs et l'onglet Rôles & Permissions) ──
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(null);

  useEffect(() => {
    let annule = false;
    listerRoles()
      .then((r) => { if (!annule) setRoles(r ?? []); })
      .catch((err) => { if (!annule) setRolesError(err instanceof ApiError ? err.message : 'Impossible de charger les rôles.'); })
      .finally(() => { if (!annule) setRolesLoading(false); });
    return () => { annule = true; };
  }, []);

  // ── Utilisateurs (GET /admin/utilisateurs) ──
  const [usersState, setUsersState] = useState({ data: [], total: 0, page: 1, totalPages: 1 });
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [usersFiltreStatut, setUsersFiltreStatut] = useState('');
  const [usersFiltreRole, setUsersFiltreRole] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [actionEnCours, setActionEnCours] = useState(null);

  const chargerUtilisateurs = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await listerUtilisateursAdmin({
        page: usersPage,
        statut: usersFiltreStatut || undefined,
        role_id: usersFiltreRole || undefined,
        search: usersSearch || undefined,
      });
      setUsersState(res);
    } catch (err) {
      setUsersError(err instanceof ApiError ? err.message : 'Impossible de charger les utilisateurs.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => { chargerUtilisateurs(); }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersPage, usersFiltreStatut, usersFiltreRole, usersSearch]);

  const toggleActivationUtilisateur = async (u) => {
    setActionEnCours(u.id);
    try {
      if (u.statut === 'actif') {
        await desactiverUtilisateurAdmin(u.id);
        setToast({ type: 'success', message: `${u.prenom} ${u.nom} désactivé.` });
      } else {
        await activerUtilisateurAdmin(u.id);
        setToast({ type: 'success', message: `${u.prenom} ${u.nom} activé.` });
      }
      await chargerUtilisateurs();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Action impossible.' });
    } finally {
      setActionEnCours(null);
    }
  };

  const changerRoleUtilisateur = async (u, roleId) => {
    if (!roleId || roleId === u.role?.id) return;
    setActionEnCours(u.id);
    try {
      await assignerRole(u.id, roleId);
      setToast({ type: 'success', message: 'Rôle mis à jour.' });
      await chargerUtilisateurs();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Impossible de changer le rôle.' });
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <div className={styles.adminContainer}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoBox}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuQhDvHr-BlU2LIoA7kIgCsaZnlAovi8jiabNdEb2zJrNgBKAFqLku-Lu4yQ7cDJ263nlS1qWR1nG8Mj6YdtvEv-WzgenNOX6i6ZJoN7A1uOAxSwe5foaNHeamjjvbfKyh8CWqIXiTgX7Vng6K4d_cCnSw1FoEXF3_LZhJEFVGqeZQ8f_UNvBTpOWGPv70EWiRwc_ZO9kdD9NNUyj3Ad3yDzsTC2gpXHK6oDafuXxrcrSxBRw9EKhMt9783jJz6UmS0JgPcjsRLrOJ"
              alt="INUBIL Admin Logo"
              className={styles.logoImg}
            />
          </div>
        </div>

        <nav className={styles.navSection}>
          <p className={styles.sectionTitle}>SUPERVISION GLOBALE</p>
          {/* Établissements (multi-tenant) : hors scope pour l'instant — INUBIL est mono-université.
              Section masquée, pas supprimée : a reprendre quand le multi-etablissement sera planifie. */}
          <button
            className={activeTab === 'statistiques' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('statistiques')}
          >
            <LineChart size={18} />
            <span>Statistiques</span>
          </button>
          <button
            className={activeTab === 'documents' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={18} />
            <span>Documents</span>
          </button>
          <button
            className={activeTab === 'notifications' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          <AccordionNavItem
            label="Utilisateurs & Rôles"
            icon={<Users size={18} />}
            isOpen={openAccordion === 'users-roles'}
            isChildActive={activeTab === 'users' || activeTab === 'roles'}
            onToggle={() => toggleAccordion('users-roles')}
          >
            <button
              className={activeTab === 'users' ? styles.accordionItemActive : styles.accordionItem}
              onClick={() => selectFromAccordion('users')}
            >
              Utilisateurs
            </button>
            <button
              className={activeTab === 'roles' ? styles.accordionItemActive : styles.accordionItem}
              onClick={() => selectFromAccordion('roles')}
            >
              Rôles & Permissions
            </button>
          </AccordionNavItem>
          {/* Infrastructures & Nœuds : retire — aucun backend ne l'alimente (pas de "noeud prive"
              administre par INUBIL, juste un acces RPC public au reseau Polygon Amoy/Mainnet). */}

          <p className={styles.sectionTitle}>SÉCURITÉ & AUDIT</p>
          <button
            className={activeTab === 'logs' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('logs')}
          >
            <ClipboardCheck size={18} />
            <span>Logs d'Audit Globaux</span>
          </button>
        </nav>

        {/* Navigation bas — épinglée au fond de la sidebar, comme /universite */}
        <nav className={styles.navBottom}>
          <AccordionNavItem
            label="Administration"
            icon={<Settings size={18} />}
            isOpen={openAccordion === 'admin'}
            isChildActive={activeTab === 'settings' || activeTab === 'backup'}
            onToggle={() => toggleAccordion('admin')}
          >
            <button
              className={activeTab === 'settings' ? styles.accordionItemActive : styles.accordionItem}
              onClick={() => selectFromAccordion('settings')}
            >
              Paramètres Système
            </button>
            <button
              className={activeTab === 'backup' ? styles.accordionItemActive : styles.accordionItem}
              onClick={() => selectFromAccordion('backup')}
            >
              Sauvegarde Manuelle
            </button>
          </AccordionNavItem>
        </nav>
      </aside>

      {/* Zone Principale */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" placeholder="Rechercher énumération, utilisateur, IP..." className={styles.searchInput} />
          </div>

          <div className={styles.headerRight}>
            <NotificationsBell onClick={() => setActiveTab('notifications')} />
            <AccountMenu
              prenom={prenom}
              nom={nom}
              roleLabel={roleLabel}
              onOpenAccount={() => setActiveTab('mon-compte')}
            />
            <button type="button" onClick={handleLogout} className={styles.iconBtn} title="Se déconnecter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </header>

        <main className={styles.mainContent}>
          {/* VUE 1 : STATISTIQUES GLOBALES */}
          {activeTab === 'statistiques' && (
            <>
              <div className={styles.viewHeader}>
                <div>
                  <h2 className={styles.viewTitle} style={{ fontSize: '1.15rem' }}>Statistiques Globales</h2>
                  <p className={styles.viewSubtitle}>Chiffres agrégés de la plateforme, toutes universités confondues.</p>
                </div>
              </div>

              {statsError && <p className={styles.errorText}>{statsError}</p>}
              {statsLoading && <p className={styles.chartLoadingState}>Chargement…</p>}

              {!statsLoading && stats && (
                <>
                  <section className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiBlue}`}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Universités</p>
                        <h3 className={styles.kpiValue}>{stats.universites.total}</h3>
                        <p className={styles.kpiSub}>{stats.universites.actives} active{stats.universites.actives > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiGold}`}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Documents émis</p>
                        <h3 className={styles.kpiValue}>{stats.documents.total}</h3>
                        <p className={styles.kpiSub}>{stats.documents.actifs} actifs · {stats.documents.en_validation} en validation · {stats.documents.revoques} révoqués</p>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiGreen}`}>
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Vérifications</p>
                        <h3 className={styles.kpiValue}>{stats.verifications.total}</h3>
                        <p className={styles.kpiSub}>{stats.verifications.ce_mois} ce mois-ci</p>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiPurple}`}>
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Étudiants</p>
                        <h3 className={styles.kpiValue}>{stats.etudiants}</h3>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiSlate}`}>
                        <Users size={20} />
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Utilisateurs</p>
                        <h3 className={styles.kpiValue}>{stats.utilisateurs}</h3>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiTeal}`}>
                        <Share2 size={20} />
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Partages actifs</p>
                        <h3 className={styles.kpiValue}>{stats.partages.actifs}</h3>
                      </div>
                    </div>
                  </section>

                  <section className={styles.analyticsRow}>
                    {grapheError ? (
                      <div className={styles.analyticsCard}><p className={styles.errorText}>{grapheError}</p></div>
                    ) : grapheLoading ? (
                      <div className={styles.analyticsCard}><p className={styles.chartLoadingState}>Chargement de la tendance…</p></div>
                    ) : (
                      <TendanceChart points={graphePoints} />
                    )}
                    <RepartitionDocuments documents={stats.documents} />
                  </section>
                </>
              )}
            </>
          )}

          {/* VUE : DOCUMENTS (toutes universités) */}
          {activeTab === 'documents' && <ListeDocuments admin />}

          {/* VUE : NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <>
              <div className={styles.viewHeader}>
                <div>
                  <h2 className={styles.viewTitle} style={{ fontSize: '1.15rem' }}>Notifications</h2>
                  <p className={styles.viewSubtitle}>Émissions, validations et révocations concernant votre activité.</p>
                </div>
              </div>
              <NotificationsPanel />
            </>
          )}

          {/* VUE 2 : GESTION DES UTILISATEURS */}
          {activeTab === 'users' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.viewTitle}>Gestion des Utilisateurs</h3>
                  <p className={styles.viewSubtitle}>{usersState.total} compte{usersState.total > 1 ? 's' : ''} sur la plateforme.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setIsUserModalOpen(true)}>
                  <UserPlus size={16} /> Inviter un Collaborateur
                </button>
              </div>

              <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                  <label>Recherche</label>
                  <div className={styles.searchInputWrap}>
                    <Search size={14} className={styles.searchInputIcon} />
                    <input
                      type="search"
                      placeholder="Nom, prénom, email…"
                      value={usersSearch}
                      onChange={(e) => { setUsersPage(1); setUsersSearch(e.target.value); }}
                      className={styles.filterInput}
                    />
                  </div>
                </div>
                <div className={styles.filterGroup}>
                  <label>Statut</label>
                  <select
                    value={usersFiltreStatut}
                    onChange={(e) => { setUsersPage(1); setUsersFiltreStatut(e.target.value); }}
                    className={styles.filterSelect}
                  >
                    <option value="">Tous les statuts</option>
                    {Object.entries(LABELS_STATUT_COMPTE).map(([val, info]) => (
                      <option key={val} value={val}>{info.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label>Rôle</label>
                  <select
                    value={usersFiltreRole}
                    onChange={(e) => { setUsersPage(1); setUsersFiltreRole(e.target.value); }}
                    className={styles.filterSelect}
                  >
                    <option value="">Tous les rôles</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{ROLE_LABELS[r.nom] ?? r.nom}</option>)}
                  </select>
                </div>
              </div>

              {usersError && <p className={styles.errorText}>{usersError}</p>}

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Établissement</th>
                    <th>Dernière connexion</th>
                    <th>Statut</th>
                    <th className={styles.tableActionsHead}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && (
                    <tr><td colSpan={6} className={styles.tableEmptyCell}>Chargement…</td></tr>
                  )}
                  {!usersLoading && usersState.data.length === 0 && (
                    <tr><td colSpan={6} className={styles.tableEmptyCell}>Aucun utilisateur ne correspond à ces filtres.</td></tr>
                  )}
                  {!usersLoading && usersState.data.map((usr) => {
                    const statutInfo = LABELS_STATUT_COMPTE[usr.statut];
                    const initiales = `${usr.prenom?.charAt(0) ?? ''}${usr.nom?.charAt(0) ?? ''}`.toUpperCase() || '··';
                    return (
                      <tr key={usr.id}>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.userAvatar}>{initiales}</span>
                            <div className={styles.userCellTexts}>
                              <strong>{usr.prenom} {usr.nom}</strong>
                              <span className={styles.userEmail}>{usr.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <select
                            value={usr.role?.id ?? ''}
                            onChange={(e) => changerRoleUtilisateur(usr, e.target.value)}
                            disabled={actionEnCours === usr.id || rolesLoading}
                            className={styles.roleSelect}
                          >
                            <option value="" disabled>Sans rôle</option>
                            {roles.map((r) => <option key={r.id} value={r.id}>{ROLE_LABELS[r.nom] ?? r.nom}</option>)}
                          </select>
                        </td>
                        <td className={styles.universiteCell}>{usr.universite?.nom ?? '—'}</td>
                        <td className={styles.dateCell}>
                          {usr.derniere_connexion ? new Date(usr.derniere_connexion).toLocaleString('fr-FR') : 'Jamais'}
                        </td>
                        <td>
                          <span className={styles[statutInfo?.classe] ?? styles.statusInactive}>
                            {statutInfo?.label ?? usr.statut}
                          </span>
                        </td>
                        <td className={styles.tableActionsCell}>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => toggleActivationUtilisateur(usr)}
                            disabled={actionEnCours === usr.id}
                          >
                            {actionEnCours === usr.id ? '…' : (usr.statut === 'actif' ? 'Désactiver' : 'Activer')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className={styles.paginationWrap}>
                <Pagination
                  page={usersState.page}
                  totalPages={usersState.totalPages}
                  total={usersState.total}
                  onChange={setUsersPage}
                  itemLabel="compte"
                />
              </div>
            </section>
          )}

          {/* VUE 4 : LOGS D'AUDIT */}
          {activeTab === 'logs' && (
            <JournalAudit
              titre="Logs d'Audit Globaux"
              sousTitre="Toutes universités confondues."
            />
          )}

          {/* VUE 5 : RÔLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.viewTitle}>Rôles & Permissions</h3>
                  <p className={styles.viewSubtitle}>Catalogue des rôles métier et de leurs permissions RBAC.</p>
                </div>
              </div>
              {rolesError && <p className={styles.errorText}>{rolesError}</p>}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rôle</th>
                    <th>Description</th>
                    <th>Portée</th>
                    <th className={styles.tableActionsHead}>Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesLoading && (
                    <tr><td colSpan={4} className={styles.tableEmptyCell}>Chargement…</td></tr>
                  )}
                  {!rolesLoading && roles.map((r) => (
                    <tr key={r.id}>
                      <td><span className={styles.roleBadge}>{ROLE_LABELS[r.nom] ?? r.nom}</span></td>
                      <td className={styles.descriptionCell}>{r.description ?? '—'}</td>
                      <td className={styles.universiteCell}>{r.est_systeme ? 'Rôle système' : 'Rôle établissement'}</td>
                      <td className={styles.tableActionsCell}>{r.permissions?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* VUE 6 : PARAMÈTRES SYSTÈME */}
          {activeTab === 'settings' && (() => {
            const configsByCle = Object.fromEntries(configs.map((c) => [c.cle, c]));
            const clesGroupees = new Set(SECTIONS_CONFIG.flatMap((s) => s.cles));
            const configsAutres = configs.filter((c) => !clesGroupees.has(c.cle));

            const onglets = [
              ...SECTIONS_CONFIG.map((s) => ({
                id: s.id,
                titre: s.titre,
                icone: s.id === 'securite'
                  ? <Shield size={15} />
                  : s.id === 'email'
                    ? <Mail size={15} />
                    : <FileText size={15} />,
                items: s.cles.map((cle) => configsByCle[cle]).filter(Boolean),
              })),
              ...(configsAutres.length > 0
                ? [{
                    id: 'autres',
                    titre: 'Autres',
                    icone: <AlertTriangle size={15} />,
                    warn: true,
                    items: configsAutres,
                  }]
                : []),
            ].filter((o) => o.items.length > 0);

            const ongletActif = onglets.find((o) => o.id === settingsSection) ?? onglets[0];

            const ligneConfig = (c) => {
              const meta = metaConfig(c.cle);
              return (
                <div key={c.id} className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingLabelRow}>
                      <span className={styles.settingLabel}>{meta.label}</span>
                      {!meta.connecte && (
                        <span className={styles.disconnectedBadge}>
                          <AlertTriangle size={11} /> Non connecté
                        </span>
                      )}
                    </div>
                    <span className={styles.settingKey}>{c.cle}</span>
                    {c.description && <p className={styles.settingDesc}>{c.description}</p>}
                  </div>
                  <div className={styles.settingControl}>
                    <span className={styles.settingValue}>{c.valeur}</span>
                    <button className={styles.btnSecondary} onClick={() => setConfigEnEdition(c)}>Modifier</button>
                  </div>
                </div>
              );
            };

            return (
              <>
                <div className={styles.viewHeader}>
                  <div>
                    <h2 className={styles.viewTitle} style={{ fontSize: '1.15rem' }}>Paramètres Système</h2>
                    <p className={styles.viewSubtitle}>Clés de configuration globales de la plateforme.</p>
                  </div>
                </div>

                {configsError && <p className={styles.errorText}>{configsError}</p>}
                {configsLoading && <p className={styles.chartLoadingState}>Chargement…</p>}

                {!configsLoading && onglets.length > 0 && (
                  <div className={styles.settingsTabsWrap}>
                    <div className={styles.settingsTabBar} role="tablist">
                      {onglets.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="tab"
                          aria-selected={ongletActif?.id === o.id}
                          className={`${styles.settingsTab} ${ongletActif?.id === o.id ? styles.settingsTabActive : ''} ${o.warn ? styles.settingsTabWarn : ''}`}
                          onClick={() => setSettingsSection(o.id)}
                        >
                          {o.icone}
                          {o.titre}
                        </button>
                      ))}
                    </div>

                    {ongletActif?.warn && (
                      <p className={styles.settingsTabWarnNote}>
                        <AlertTriangle size={13} /> Présents en base mais non lus par le backend actuel : les modifier n'a aucun effet réel.
                      </p>
                    )}

                    <div className={styles.settingsCard}>
                      <div className={styles.settingsList}>
                        {ongletActif?.items.map(ligneConfig)}
                      </div>
                    </div>
                  </div>
                )}

                {!configsLoading && configs.length === 0 && (
                  <p className={styles.tableEmptyCell}>Aucun paramètre enregistré.</p>
                )}
              </>
            );
          })()}

          {/* VUE 7 : SAUVEGARDE MANUELLE */}
          {activeTab === 'backup' && (
            <section className={styles.bentoGrid}>
              <div className={styles.bentoCard}>
                <h3 className={styles.backupTitle}>Sauvegarde Manuelle</h3>
                <p className={styles.backupDesc}>Déclenche un backup immédiat de la base (pg_dump) vers le stockage configuré.</p>
                {backupErreur && <p className={styles.errorText}>{backupErreur}</p>}
                {backupResultat && (
                  <p className={styles.backupSuccess}>
                    {backupResultat.message} : <span className={styles.mono}>{backupResultat.fichier}</span> ({backupResultat.tailleMo} Mo)
                  </p>
                )}
                <button className={styles.backupBtn} onClick={lancerBackup} disabled={backupEnCours}>
                  <DatabaseBackup size={16} /> {backupEnCours ? 'Sauvegarde en cours…' : 'Lancer une sauvegarde'}
                </button>
              </div>
            </section>
          )}

          {/* MON COMPTE — accessible via le menu de l'avatar, hors navigation principale */}
          {activeTab === 'mon-compte' && <MonCompte roleLabel={roleLabel} />}
        </main>
      </div>

      {/* MODALES INTERACTIVES */}
      {isUserModalOpen && (
        <InviterUtilisateurModal
          onClose={() => setIsUserModalOpen(false)}
          onInvited={chargerUtilisateurs}
          roles={roles}
        />
      )}
      {configEnEdition && (
        <ConfigEditDrawer
          config={configEnEdition}
          onClose={() => setConfigEnEdition(null)}
          onSaved={chargerConfigurations}
        />
      )}

      {toast && (
        <div className={toast.type === 'error' ? styles.actionToastError : styles.actionToastSuccess}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
