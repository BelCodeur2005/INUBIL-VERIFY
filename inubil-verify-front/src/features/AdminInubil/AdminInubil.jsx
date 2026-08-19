import { useState } from 'react';
import styles from './AdminInubil.module.css';
import {
  EtablissementModal,
  UserModal,
  QuotaModal,
  NodeDetailsModal,
  AuditLogDetailsModal,
} from './AdminModals';

export default function AdminInubil() {
  const [activeTab, setActiveTab] = useState('etablissements');

  // États des Modales
  const [isEtabModalOpen, setIsEtabModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [selectedEtabQuota, setSelectedEtabQuota] = useState(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Données de démonstration : Établissements
  const [etablissements] = useState([
    { id: 1, nom: 'Université de Douala - IUT', code: 'UD-IUT', type: 'Public', statut: 'ACTIF', quotas: 5000, consomme: 3750, admins: 3, directeurs: 2 },
    { id: 2, nom: 'Université de Yaoundé I - Polytechnique', code: 'UY1-ENSPY', type: 'Public', statut: 'ACTIF', quotas: 10000, consomme: 8200, admins: 5, directeurs: 4 },
    { id: 3, nom: 'Institut Saint-Jérôme', code: 'IU-SJ', type: 'Privé', statut: 'SUSPENDU', quotas: 2000, consomme: 2000, admins: 1, directeurs: 1 },
  ]);

  // Données de démonstration : Utilisateurs
  const [users] = useState([
    { id: 1, nom: 'Admin Root', email: 'admin@inubil.cm', role: 'SUPER_ADMIN', etablissement: 'INUBIL Central', statut: 'ACTIF', derniereConnexion: '30/07/2026 14:22' },
    { id: 2, nom: 'Marie Ngo', email: 'm.ngo@univ-douala.cm', role: 'AGENT_SAISIE', etablissement: 'UD-IUT', statut: 'ACTIF', derniereConnexion: '30/07/2026 09:15' },
    { id: 3, nom: 'Prof. Kamga', email: 'kamga@univ-douala.cm', role: 'DIRECTEUR_SIGNATAIRE', etablissement: 'UD-IUT', statut: 'ACTIF', derniereConnexion: '29/07/2026 16:40' },
  ]);

  // Données de démonstration : Logs d'Audit
  const logs = [
    { id: 'LOG-9921', horodatage: '30/07/2026 14:05', auteur: 'Admin Root', action: 'Attribution Quota', details: '+1 000 Crédits vers UY1-ENSPY', ip: '197.234.221.10' },
    { id: 'LOG-9920', horodatage: '30/07/2026 11:30', auteur: 'Prof. Kamga', action: 'Signature BATCH', details: 'Validation BATCH-2026-UD-DAWII-043', ip: '41.202.219.45' },
    { id: 'LOG-9919', horodatage: '30/07/2026 09:18', auteur: 'Marie Ngo', action: 'Création Manifeste', details: 'Importation 150 diplômes DAWII', ip: '41.202.219.88' },
  ];

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
          <button
            className={activeTab === 'etablissements' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('etablissements')}
          >
            <span className="material-symbols-outlined">domain</span>
            <span>Établissements</span>
          </button>
          <button
            className={activeTab === 'users' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('users')}
          >
            <span className="material-symbols-outlined">manage_accounts</span>
            <span>Utilisateurs & Rôles</span>
          </button>
          <button
            className={activeTab === 'nodes' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('nodes')}
          >
            <span className="material-symbols-outlined">dns</span>
            <span>Infrastructures & Nœuds</span>
          </button>

          <p className={styles.sectionTitle}>SÉCURITÉ & AUDIT</p>
          <button
            className={activeTab === 'logs' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('logs')}
          >
            <span className="material-symbols-outlined">shield_history</span>
            <span>Logs d'Audit Globaux</span>
          </button>
        </nav>
      </aside>

      {/* Zone Principale */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>search</span>
            <input type="text" placeholder="Rechercher énumération, utilisateur, IP..." className={styles.searchInput} />
          </div>

          <div className={styles.userProfile}>
            <span className={styles.badgeRoot}>SUPER ADMIN PLATFORME</span>
            <div className={styles.avatar}>SA</div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {/* Métriques d'En-tête */}
          <section className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>ÉTABLISSEMENTS PARTENAIRES</p>
              <h3 className={styles.kpiValue}>12</h3>
              <p className={styles.kpiSub}>11 Actifs | 1 Suspendu</p>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>CONSOMMATION GLOBALE BLOCKCHAIN</p>
              <h3 className={styles.kpiValue}>13,950 / 20,000</h3>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '69.7%' }}></div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <p className={styles.kpiLabel}>SANTÉ DU RÉSEAU (NŒUD HSM)</p>
              <h3 className={styles.kpiValue} style={{ color: 'var(--on-tertiary-container)' }}>100% OPÉRATIONNEL</h3>
              <p className={styles.kpiSub}>Latence moyenne : 18ms</p>
            </div>
          </section>

          {/* VUE 1 : GESTION DES ÉTABLISSEMENTS */}
          {activeTab === 'etablissements' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Gestion des Établissements Partenaires</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Configuration des structures universitaires et allocation des quotas.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setIsEtabModalOpen(true)}>
                  <span className="material-symbols-outlined">add</span> Ajouter un Établissement
                </button>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Nom de l'Établissement</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Quota Consommé</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {etablissements.map((etab) => (
                    <tr key={etab.id}>
                      <td className={styles.mono}><strong>{etab.code}</strong></td>
                      <td>{etab.nom}</td>
                      <td>{etab.type}</td>
                      <td>
                        <span className={etab.statut === 'ACTIF' ? styles.statusActive : styles.statusSuspended}>
                          {etab.statut}
                        </span>
                      </td>
                      <td>
                        <strong>{etab.consomme}</strong> / {etab.quotas} Crédits
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className={styles.btnSecondary} onClick={() => { setSelectedEtabQuota(etab); setIsQuotaModalOpen(true); }}>
                            Recharger Quota
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* VUE 2 : GESTION DES UTILISATEURS & RÔLES */}
          {activeTab === 'users' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Gestion des Utilisateurs & Rôles (RBAC)</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Contrôle des accès des opérateurs de saisie et des signataires.</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setIsUserModalOpen(true)}>
                  <span className="material-symbols-outlined">person_add</span> Nouvel Utilisateur
                </button>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Établissement Attribué</th>
                    <th>Dernière Connexion</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((usr) => (
                    <tr key={usr.id}>
                      <td>
                        <strong>{usr.nom}</strong><br />
                        <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{usr.email}</span>
                      </td>
                      <td><span className={styles.roleBadge}>{usr.role}</span></td>
                      <td>{usr.etablissement}</td>
                      <td className={styles.mono} style={{ fontSize: '0.75rem' }}>{usr.derniereConnexion}</td>
                      <td><span className={styles.statusActive}>{usr.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* VUE 3 : INFRASTRUCTURE & NŒUD BLOCKCHAIN */}
          {activeTab === 'nodes' && (
            <section className={styles.bentoGrid}>
              <div className={styles.bentoCard} style={{ gridColumn: 'span 6' }}>
                <h3 style={{ color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Nœud d'Ancrage Blockchain INUBIL #01</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>Type: Private Ethereum Enterprise (PoA)</p>
                <div style={{ margin: '1rem 0' }}>
                  <p style={{ fontSize: '0.75rem', margin: '0.25rem 0' }}>Dernier Bloc Ancré: <strong className={styles.mono}>#18,429,102</strong></p>
                  <p style={{ fontSize: '0.75rem', margin: '0.25rem 0' }}>Adresse du Smart Contract: <strong className={styles.mono}>0x71C...3a9B</strong></p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setSelectedNodeDetails({ id: 'NODE-01', status: 'SYNCHRONISÉ', peers: 12 })}>
                  Inspecter Métriques du Nœud
                </button>
              </div>
            </section>
          )}

          {/* VUE 4 : LOGS D'AUDIT */}
          {activeTab === 'logs' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Journal des Logs d'Audit Globaux</h3>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Log</th>
                    <th>Horodatage</th>
                    <th>Auteur</th>
                    <th>Action</th>
                    <th>Détails</th>
                    <th style={{ textAlign: 'right' }}>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className={styles.mono}>{log.id}</td>
                      <td className={styles.mono} style={{ fontSize: '0.75rem' }}>{log.horodatage}</td>
                      <td><strong>{log.auteur}</strong></td>
                      <td><span className={styles.actionBadge}>{log.action}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{log.details}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={styles.btnSecondary} onClick={() => setSelectedLog(log)}>Inspecter IP</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </main>
      </div>

      {/* MODALES INTERACTIVES */}
      {isEtabModalOpen && <EtablissementModal onClose={() => setIsEtabModalOpen(false)} />}
      {isUserModalOpen && <UserModal onClose={() => setIsUserModalOpen(false)} etablissements={etablissements} />}
      {isQuotaModalOpen && <QuotaModal etab={selectedEtabQuota} onClose={() => setIsQuotaModalOpen(false)} />}
      {selectedNodeDetails && <NodeDetailsModal node={selectedNodeDetails} onClose={() => setSelectedNodeDetails(null)} />}
      {selectedLog && <AuditLogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}