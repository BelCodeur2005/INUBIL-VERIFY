import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import NotificationsBell from '../../shared/components/NotificationsBell/NotificationsBell';
import MonCompte from '../../shared/components/MonCompte/MonCompte';
import styles from './AdminInubil.module.css';
import {
  InviterUtilisateurModal,
  AuditLogDetailsModal,
  ConfigEditDrawer,
} from './AdminModals';
import { listerConfigurations } from '../../core/configurations/configurations.api';
import ListeDocuments from '../../shared/components/ListeDocuments/ListeDocuments';
import TendanceChart from '../../shared/components/TendanceChart/TendanceChart';
import { plageJours } from '../../shared/components/TendanceChart/plageJours';
import RepartitionDocuments from '../../shared/components/RepartitionDocuments/RepartitionDocuments';
import { listerRoles } from '../../core/roles/roles.api';
import {
  listerUtilisateursAdmin,
  activerUtilisateurAdmin,
  desactiverUtilisateurAdmin,
  getStatistiquesGlobales,
  getStatistiquesGraphe,
  declencherBackup,
  listerJournalAudit,
} from '../../core/admin/admin.api';
import { assignerRole } from '../../core/utilisateurs/utilisateurs.api';
import { ApiError } from '../../core/api/client';

const LABELS_STATUT_UTILISATEUR = {
  actif:         { label: 'Actif',    classe: 'statusActif' },
  en_validation: { label: 'En cours', classe: 'statusEnCours' },
  brouillon:     { label: 'En cours', classe: 'statusEnCours' },
  revoque:       { label: 'Révoqué',  classe: 'statusRevoque' },
  expire:        { label: 'Expiré',   classe: 'statusExpireDoc' },
};

const ROLE_LABELS = {
  super_admin: 'Super Administrateur',
  admin_istama: 'Administration INUBIL',
};

// TendanceChart et RepartitionDocuments sont maintenant des composants partages
// (voir shared/components/) — reutilises tels quels par DashboardEtablissement.jsx.

// Item de sidebar avec sous-menu en flyout collé au bord droit de la sidebar.
// Le panneau est positionné en `fixed` (via portail) à partir de la position réelle
// du bouton : .navSection a overflow-y:auto, ce qui force aussi overflow-x à rogner
// tout enfant en position absolute qui déborderait à droite de la sidebar.
function FlyoutNavItem({ label, icon, isOpen, isChildActive, onToggle, children }) {
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [panelPos, setPanelPos] = useState(null);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.top, left: rect.right + 8 });
    }
    onToggle();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (buttonRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      onToggle();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className={styles.flyoutWrapper}>
      <button
        ref={buttonRef}
        className={isChildActive ? styles.navItemActive : styles.navItem}
        onClick={handleToggle}
      >
        <span className="material-symbols-outlined">{icon}</span>
        <span>{label}</span>
        <span className={`material-symbols-outlined ${styles.flyoutChevron}`}>chevron_right</span>
      </button>
      {isOpen && panelPos && createPortal(
        <div ref={panelRef} className={styles.flyoutPanel} style={{ top: panelPos.top, left: panelPos.left }}>
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function AdminInubil() {
  const [activeTab, setActiveTab] = useState('statistiques');
  const [openFlyout, setOpenFlyout] = useState(null);
  const { utilisateur, logout } = useAuth();

  const toggleFlyout = (id) => setOpenFlyout((prev) => (prev === id ? null : id));
  const selectFromFlyout = (tab) => {
    setActiveTab(tab);
    setOpenFlyout(null);
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
  const [selectedLog, setSelectedLog] = useState(null);

  // ── Logs d'Audit (GET /admin/audit) ──
  const [auditState, setAuditState] = useState({ data: [], total: 0, page: 1, limit: 50 });
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFiltreAction, setAuditFiltreAction] = useState('');
  const [auditFiltreModule, setAuditFiltreModule] = useState('');

  useEffect(() => {
    let annule = false;
    const timeout = setTimeout(() => {
      setAuditLoading(true);
      setAuditError(null);
      listerJournalAudit({
        page: auditPage,
        action: auditFiltreAction || undefined,
        module: auditFiltreModule || undefined,
      })
        .then((res) => { if (!annule) setAuditState(res); })
        .catch((err) => { if (!annule) setAuditError(err instanceof ApiError ? err.message : "Impossible de charger le journal d'audit."); })
        .finally(() => { if (!annule) setAuditLoading(false); });
    }, 300);
    return () => { annule = true; clearTimeout(timeout); };
  }, [auditPage, auditFiltreAction, auditFiltreModule]);

  const auditTotalPages = Math.max(1, Math.ceil(auditState.total / (auditState.limit || 50)));

  // ── Paramètres Système (GET/PUT /configurations) ──
  const [configs, setConfigs] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState(null);
  const [configEnEdition, setConfigEnEdition] = useState(null);

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
            <span className="material-symbols-outlined">monitoring</span>
            <span>Statistiques</span>
          </button>
          <button
            className={activeTab === 'documents' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('documents')}
          >
            <span className="material-symbols-outlined">description</span>
            <span>Documents</span>
          </button>
          <FlyoutNavItem
            label="Utilisateurs & Rôles"
            icon="manage_accounts"
            isOpen={openFlyout === 'users-roles'}
            isChildActive={activeTab === 'users' || activeTab === 'roles'}
            onToggle={() => toggleFlyout('users-roles')}
          >
            <button
              className={activeTab === 'users' ? styles.flyoutItemActive : styles.flyoutItem}
              onClick={() => selectFromFlyout('users')}
            >
              Utilisateurs
            </button>
            <button
              className={activeTab === 'roles' ? styles.flyoutItemActive : styles.flyoutItem}
              onClick={() => selectFromFlyout('roles')}
            >
              Rôles & Permissions
            </button>
          </FlyoutNavItem>
          {/* Infrastructures & Nœuds : retire — aucun backend ne l'alimente (pas de "noeud prive"
              administre par INUBIL, juste un acces RPC public au reseau Polygon Amoy/Mainnet). */}

          <p className={styles.sectionTitle}>SÉCURITÉ & AUDIT</p>
          <button
            className={activeTab === 'logs' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('logs')}
          >
            <span className="material-symbols-outlined">shield_history</span>
            <span>Logs d'Audit Globaux</span>
          </button>
        </nav>

        {/* Navigation bas — épinglée au fond de la sidebar, comme /universite */}
        <nav className={styles.navBottom}>
          <FlyoutNavItem
            label="Administration"
            icon="admin_panel_settings"
            isOpen={openFlyout === 'admin'}
            isChildActive={activeTab === 'settings' || activeTab === 'backup'}
            onToggle={() => toggleFlyout('admin')}
          >
            <button
              className={activeTab === 'settings' ? styles.flyoutItemActive : styles.flyoutItem}
              onClick={() => selectFromFlyout('settings')}
            >
              Paramètres Système
            </button>
            <button
              className={activeTab === 'backup' ? styles.flyoutItemActive : styles.flyoutItem}
              onClick={() => selectFromFlyout('backup')}
            >
              Sauvegarde Manuelle
            </button>
          </FlyoutNavItem>
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
            <NotificationsBell />
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
                        <span className="material-symbols-outlined">account_balance</span>
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Universités</p>
                        <h3 className={styles.kpiValue}>{stats.universites.total}</h3>
                        <p className={styles.kpiSub}>{stats.universites.actives} active{stats.universites.actives > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiGold}`}>
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Documents émis</p>
                        <h3 className={styles.kpiValue}>{stats.documents.total}</h3>
                        <p className={styles.kpiSub}>{stats.documents.actifs} actifs · {stats.documents.en_validation} en validation · {stats.documents.revoques} révoqués</p>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiGreen}`}>
                        <span className="material-symbols-outlined">verified</span>
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Vérifications</p>
                        <h3 className={styles.kpiValue}>{stats.verifications.total}</h3>
                        <p className={styles.kpiSub}>{stats.verifications.ce_mois} ce mois-ci</p>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiPurple}`}>
                        <span className="material-symbols-outlined">school</span>
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Étudiants</p>
                        <h3 className={styles.kpiValue}>{stats.etudiants}</h3>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiSlate}`}>
                        <span className="material-symbols-outlined">group</span>
                      </div>
                      <div>
                        <p className={styles.kpiLabel}>Utilisateurs</p>
                        <h3 className={styles.kpiValue}>{stats.utilisateurs}</h3>
                      </div>
                    </div>

                    <div className={styles.kpiCard}>
                      <div className={`${styles.kpiIconWrap} ${styles.kpiTeal}`}>
                        <span className="material-symbols-outlined">share</span>
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

          {/* VUE 2 : GESTION DES UTILISATEURS */}
          {activeTab === 'users' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.viewTitle}>Gestion des Utilisateurs</h3>
                  <p className={styles.viewSubtitle}>{usersState.total} compte{usersState.total > 1 ? 's' : ''} sur la plateforme.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setIsUserModalOpen(true)}>
                  <span className="material-symbols-outlined">person_add</span> Inviter un Collaborateur
                </button>
              </div>

              <div className={styles.filterRow}>
                <input
                  type="search"
                  placeholder="Rechercher nom, prénom, email…"
                  value={usersSearch}
                  onChange={(e) => { setUsersPage(1); setUsersSearch(e.target.value); }}
                  className={styles.filterInput}
                />
                <select
                  value={usersFiltreStatut}
                  onChange={(e) => { setUsersPage(1); setUsersFiltreStatut(e.target.value); }}
                  className={styles.filterSelect}
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(LABELS_STATUT_UTILISATEUR).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={usersFiltreRole}
                  onChange={(e) => { setUsersPage(1); setUsersFiltreRole(e.target.value); }}
                  className={styles.filterSelect}
                >
                  <option value="">Tous les rôles</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>

              {usersError && <p className={styles.errorText}>{usersError}</p>}

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Établissement</th>
                    <th>Dernière Connexion</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading && (
                    <tr><td colSpan={6} className={styles.tableEmptyCell}>Chargement…</td></tr>
                  )}
                  {!usersLoading && usersState.data.length === 0 && (
                    <tr><td colSpan={6} className={styles.tableEmptyCell}>Aucun utilisateur ne correspond à ces filtres.</td></tr>
                  )}
                  {!usersLoading && usersState.data.map((usr) => (
                    <tr key={usr.id}>
                      <td>
                        <strong>{usr.prenom} {usr.nom}</strong><br />
                        <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{usr.email}</span>
                      </td>
                      <td>
                        <select
                          value={usr.role?.id ?? ''}
                          onChange={(e) => changerRoleUtilisateur(usr, e.target.value)}
                          disabled={actionEnCours === usr.id || rolesLoading}
                          className={styles.roleSelect}
                        >
                          <option value="" disabled>Sans rôle</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                        </select>
                      </td>
                      <td>{usr.universite?.nom ?? '—'}</td>
                      <td className={styles.mono} style={{ fontSize: '0.75rem' }}>
                        {usr.derniere_connexion ? new Date(usr.derniere_connexion).toLocaleString('fr-FR') : 'Jamais'}
                      </td>
                      <td>
                        <span className={usr.statut === 'actif' ? styles.statusActive : styles.statusSuspended}>
                          {LABELS_STATUT_UTILISATEUR[usr.statut] ?? usr.statut}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => toggleActivationUtilisateur(usr)}
                          disabled={actionEnCours === usr.id}
                        >
                          {actionEnCours === usr.id ? '…' : (usr.statut === 'actif' ? 'Désactiver' : 'Activer')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {usersState.totalPages > 1 && (
                <div className={styles.paginationBar}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersState.page <= 1}
                  >
                    Précédent
                  </button>
                  <span className={styles.paginationInfo}>Page {usersState.page} / {usersState.totalPages}</span>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setUsersPage((p) => Math.min(usersState.totalPages, p + 1))}
                    disabled={usersState.page >= usersState.totalPages}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </section>
          )}

          {/* VUE 4 : LOGS D'AUDIT */}
          {activeTab === 'logs' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.viewTitle}>Journal des Logs d'Audit Globaux</h3>
                  <p className={styles.viewSubtitle}>{auditState.total} entrée{auditState.total > 1 ? 's' : ''}.</p>
                </div>
              </div>

              <div className={styles.filterRow}>
                <input
                  type="text"
                  placeholder="Filtrer par action (ex: CREATE_DOCUMENT)"
                  value={auditFiltreAction}
                  onChange={(e) => { setAuditPage(1); setAuditFiltreAction(e.target.value); }}
                  className={styles.filterInput}
                />
                <input
                  type="text"
                  placeholder="Filtrer par module (ex: documents)"
                  value={auditFiltreModule}
                  onChange={(e) => { setAuditPage(1); setAuditFiltreModule(e.target.value); }}
                  className={styles.filterInput}
                />
              </div>

              {auditError && <p className={styles.errorText}>{auditError}</p>}

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Horodatage</th>
                    <th>Auteur</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>IP</th>
                    <th style={{ textAlign: 'right' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading && (
                    <tr><td colSpan={6} className={styles.tableEmptyCell}>Chargement…</td></tr>
                  )}
                  {!auditLoading && auditState.data.length === 0 && (
                    <tr><td colSpan={6} className={styles.tableEmptyCell}>Aucune entrée ne correspond à ces filtres.</td></tr>
                  )}
                  {!auditLoading && auditState.data.map((log) => (
                    <tr key={log.id}>
                      <td className={styles.mono} style={{ fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                      <td><strong>{log.nom_utilisateur ?? 'Système'}</strong></td>
                      <td style={{ fontSize: '0.8rem' }}>{log.module}</td>
                      <td><span className={styles.actionBadge}>{log.action}</span></td>
                      <td className={styles.mono} style={{ fontSize: '0.75rem' }}>{log.ip_address ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={styles.btnSecondary} onClick={() => setSelectedLog(log)}>Détails</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {auditTotalPages > 1 && (
                <div className={styles.paginationBar}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditState.page <= 1}
                  >
                    Précédent
                  </button>
                  <span className={styles.paginationInfo}>Page {auditState.page} / {auditTotalPages}</span>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                    disabled={auditState.page >= auditTotalPages}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </section>
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
                    <th style={{ textAlign: 'right' }}>Permissions</th>
                  </tr>
                </thead>
                <tbody>
                  {rolesLoading && (
                    <tr><td colSpan={4} className={styles.tableEmptyCell}>Chargement…</td></tr>
                  )}
                  {!rolesLoading && roles.map((r) => (
                    <tr key={r.id}>
                      <td><span className={styles.roleBadge}>{r.nom}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{r.description ?? '—'}</td>
                      <td style={{ fontSize: '0.75rem' }}>{r.est_systeme ? 'Rôle système' : 'Rôle établissement'}</td>
                      <td style={{ textAlign: 'right' }}>{r.permissions?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* VUE 6 : PARAMÈTRES SYSTÈME */}
          {activeTab === 'settings' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 className={styles.viewTitle}>Paramètres Système</h3>
                  <p className={styles.viewSubtitle}>Clés de configuration globales de la plateforme.</p>
                </div>
              </div>
              {configsError && <p className={styles.errorText}>{configsError}</p>}
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Clé</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Valeur</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configsLoading && (
                    <tr><td colSpan={4} className={styles.tableEmptyCell}>Chargement…</td></tr>
                  )}
                  {!configsLoading && configs.length === 0 && (
                    <tr><td colSpan={4} className={styles.tableEmptyCell}>Aucun paramètre enregistré.</td></tr>
                  )}
                  {!configsLoading && configs.map((c) => (
                    <tr key={c.id}>
                      <td className={styles.mono}>{c.cle}</td>
                      <td style={{ fontSize: '0.8rem' }}>{c.description ?? '—'}</td>
                      <td className={styles.mono} style={{ textAlign: 'right' }}>{c.valeur}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={styles.btnSecondary} onClick={() => setConfigEnEdition(c)}>Modifier</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* VUE 7 : SAUVEGARDE MANUELLE */}
          {activeTab === 'backup' && (
            <section className={styles.bentoGrid}>
              <div className={styles.bentoCard} style={{ gridColumn: 'span 6' }}>
                <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Sauvegarde Manuelle</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>Déclenche un backup immédiat de la base (pg_dump) vers le stockage configuré.</p>
                {backupErreur && <p className={styles.errorText}>{backupErreur}</p>}
                {backupResultat && (
                  <p style={{ color: '#166534', fontSize: '0.8rem' }}>
                    {backupResultat.message} — <span className={styles.mono}>{backupResultat.fichier}</span> ({backupResultat.tailleMo} Mo)
                  </p>
                )}
                <button className={styles.btnPrimary} style={{ marginTop: '1rem' }} onClick={lancerBackup} disabled={backupEnCours}>
                  <span className="material-symbols-outlined">backup</span> {backupEnCours ? 'Sauvegarde en cours…' : 'Lancer une sauvegarde'}
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
      {selectedLog && <AuditLogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
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
