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
import { listerRoles } from '../../core/roles/roles.api';
import {
  listerUtilisateursAdmin,
  activerUtilisateurAdmin,
  desactiverUtilisateurAdmin,
  getStatistiquesGlobales,
  declencherBackup,
  listerJournalAudit,
} from '../../core/admin/admin.api';
import { assignerRole } from '../../core/utilisateurs/utilisateurs.api';
import { ApiError } from '../../core/api/client';

const LABELS_STATUT_UTILISATEUR = {
  actif: 'Actif',
  inactif: 'Inactif',
  suspendu: 'Suspendu',
  en_attente_email: 'Email non vérifié',
};

const ROLE_LABELS = {
  super_admin: 'Super Administrateur',
  admin_istama: 'Administration INUBIL',
};

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
      } else {
        await activerUtilisateurAdmin(u.id);
      }
      await chargerUtilisateurs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Action impossible.');
    } finally {
      setActionEnCours(null);
    }
  };

  const changerRoleUtilisateur = async (u, roleId) => {
    if (!roleId || roleId === u.role?.id) return;
    setActionEnCours(u.id);
    try {
      await assignerRole(u.id, roleId);
      await chargerUtilisateurs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Impossible de changer le rôle.');
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
            <button className={styles.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
            </button>
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
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Statistiques Globales</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Chiffres agrégés de la plateforme, toutes universités confondues.</p>
                </div>
              </div>
              {statsError && <p style={{ color: '#ba1a1a', fontSize: '0.8rem' }}>{statsError}</p>}
              {statsLoading && <p style={{ fontSize: '0.8rem' }}>Chargement…</p>}
              {!statsLoading && stats && (
                <section className={styles.kpiGrid}>
                  <div className={styles.kpiCard}>
                    <p className={styles.kpiLabel}>UNIVERSITÉS</p>
                    <h3 className={styles.kpiValue}>{stats.universites.total}</h3>
                    <p className={styles.kpiSub}>{stats.universites.actives} active{stats.universites.actives > 1 ? 's' : ''}</p>
                  </div>
                  <div className={styles.kpiCard}>
                    <p className={styles.kpiLabel}>DOCUMENTS ÉMIS</p>
                    <h3 className={styles.kpiValue}>{stats.documents.total}</h3>
                    <p className={styles.kpiSub}>{stats.documents.actifs} actifs · {stats.documents.en_validation} en validation · {stats.documents.revoques} révoqués</p>
                  </div>
                  <div className={styles.kpiCard}>
                    <p className={styles.kpiLabel}>VÉRIFICATIONS</p>
                    <h3 className={styles.kpiValue}>{stats.verifications.total}</h3>
                    <p className={styles.kpiSub}>{stats.verifications.ce_mois} ce mois-ci</p>
                  </div>
                  <div className={styles.kpiCard}>
                    <p className={styles.kpiLabel}>ÉTUDIANTS</p>
                    <h3 className={styles.kpiValue}>{stats.etudiants}</h3>
                  </div>
                  <div className={styles.kpiCard}>
                    <p className={styles.kpiLabel}>UTILISATEURS</p>
                    <h3 className={styles.kpiValue}>{stats.utilisateurs}</h3>
                  </div>
                  <div className={styles.kpiCard}>
                    <p className={styles.kpiLabel}>PARTAGES ACTIFS</p>
                    <h3 className={styles.kpiValue}>{stats.partages.actifs}</h3>
                  </div>
                </section>
              )}
            </section>
          )}

          {/* VUE : DOCUMENTS (toutes universités) */}
          {activeTab === 'documents' && <ListeDocuments admin />}

          {/* VUE 2 : GESTION DES UTILISATEURS */}
          {activeTab === 'users' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Gestion des Utilisateurs</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{usersState.total} compte{usersState.total > 1 ? 's' : ''} sur la plateforme.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setIsUserModalOpen(true)}>
                  <span className="material-symbols-outlined">person_add</span> Inviter un Collaborateur
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', margin: '0 0 1rem', flexWrap: 'wrap' }}>
                <input
                  type="search"
                  placeholder="Rechercher nom, prénom, email…"
                  value={usersSearch}
                  onChange={(e) => { setUsersPage(1); setUsersSearch(e.target.value); }}
                  style={{ flex: '1 1 220px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)', fontSize: '0.8rem' }}
                />
                <select
                  value={usersFiltreStatut}
                  onChange={(e) => { setUsersPage(1); setUsersFiltreStatut(e.target.value); }}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)', fontSize: '0.8rem' }}
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(LABELS_STATUT_UTILISATEUR).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={usersFiltreRole}
                  onChange={(e) => { setUsersPage(1); setUsersFiltreRole(e.target.value); }}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)', fontSize: '0.8rem' }}
                >
                  <option value="">Tous les rôles</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>

              {usersError && <p style={{ color: '#ba1a1a', fontSize: '0.8rem' }}>{usersError}</p>}

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
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Chargement…</td></tr>
                  )}
                  {!usersLoading && usersState.data.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Aucun utilisateur ne correspond à ces filtres.</td></tr>
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
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)' }}
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    disabled={usersState.page <= 1}
                  >
                    Précédent
                  </button>
                  <span style={{ fontSize: '0.75rem', alignSelf: 'center' }}>Page {usersState.page} / {usersState.totalPages}</span>
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
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Journal des Logs d'Audit Globaux</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{auditState.total} entrée{auditState.total > 1 ? 's' : ''}.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', margin: '0 0 1rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filtrer par action (ex: CREATE_DOCUMENT)"
                  value={auditFiltreAction}
                  onChange={(e) => { setAuditPage(1); setAuditFiltreAction(e.target.value); }}
                  style={{ flex: '1 1 220px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="Filtrer par module (ex: documents)"
                  value={auditFiltreModule}
                  onChange={(e) => { setAuditPage(1); setAuditFiltreModule(e.target.value); }}
                  style={{ flex: '1 1 220px', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)', fontSize: '0.8rem' }}
                />
              </div>

              {auditError && <p style={{ color: '#ba1a1a', fontSize: '0.8rem' }}>{auditError}</p>}

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
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Chargement…</td></tr>
                  )}
                  {!auditLoading && auditState.data.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Aucune entrée ne correspond à ces filtres.</td></tr>
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditState.page <= 1}
                  >
                    Précédent
                  </button>
                  <span style={{ fontSize: '0.75rem', alignSelf: 'center' }}>Page {auditState.page} / {auditTotalPages}</span>
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
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Rôles & Permissions</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Catalogue des rôles métier et de leurs permissions RBAC.</p>
                </div>
              </div>
              {rolesError && <p style={{ color: '#ba1a1a', fontSize: '0.8rem' }}>{rolesError}</p>}
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
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Chargement…</td></tr>
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
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Paramètres Système</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Clés de configuration globales de la plateforme.</p>
                </div>
              </div>
              {configsError && <p style={{ color: '#ba1a1a', fontSize: '0.8rem' }}>{configsError}</p>}
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
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Chargement…</td></tr>
                  )}
                  {!configsLoading && configs.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem' }}>Aucun paramètre enregistré.</td></tr>
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
                {backupErreur && <p style={{ color: '#ba1a1a', fontSize: '0.8rem' }}>{backupErreur}</p>}
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
    </div>
  );
}