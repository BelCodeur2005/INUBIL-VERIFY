import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import MonCompte from '../../shared/components/MonCompte/MonCompte';
import EmissionDiplome from '../../shared/components/EmissionDiplome/EmissionDiplome';
import ListeDocuments from '../../shared/components/ListeDocuments/ListeDocuments';
import FileValidation from '../../shared/components/FileValidation/FileValidation';
import { listerDocuments } from '../../core/documents/documents.api';
import styles from './DashboardDirecteur.module.css';

export default function DashboardDirecteur() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { utilisateur, logout } = useAuth();

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const roleLabel = utilisateur?.role?.nom === 'directeur_pedagogique' ? 'Directeur Pédagogique' : (utilisateur?.role?.nom ?? '');

  const handleLogout = async () => {
    await logout();
  };

  // Compte reel des documents en attente de validation, pour le badge de la sidebar.
  const [enAttenteCount, setEnAttenteCount] = useState(0);
  useEffect(() => {
    Promise.all([
      listerDocuments({ statut: 'brouillon', limit: 1 }),
      listerDocuments({ statut: 'en_validation', limit: 1 }),
    ])
      .then(([a, b]) => setEnAttenteCount((a.total ?? 0) + (b.total ?? 0)))
      .catch(() => {});
  }, [activeTab]);

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoBox}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuQhDvHr-BlU2LIoA7kIgCsaZnlAovi8jiabNdEb2zJrNgBKAFqLku-Lu4yQ7cDJ263nlS1qWR1nG8Mj6YdtvEv-WzgenNOX6i6ZJoN7A1uOAxSwe5foaNHeamjjvbfKyh8CWqIXiTgX7Vng6K4d_cCnSw1FoEXF3_LZhJEFVGqeZQ8f_UNvBTpOWGPv70EWiRwc_ZO9kdD9NNUyj3Ad3yDzsTC2gpXHK6oDafuXxrcrSxBRw9EKhMt9783jJz6UmS0JgPcjsRLrOJ"
              alt="INUBIL Logo"
              className={styles.logoImg}
            />
          </div>
        </div>

        <nav className={styles.navSection}>
          <p className={styles.sectionTitle}>Menu Principal</p>
          <button
            className={activeTab === 'dashboard' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Vue d'Ensemble</span>
          </button>
          <button
            className={activeTab === 'etudiants' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('etudiants')}
          >
            <span className="material-symbols-outlined">school</span>
            <span>Fiche Étudiant</span>
          </button>
          <button
            className={activeTab === 'emission' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('emission')}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Émission de Diplôme</span>
          </button>
          <button
            className={activeTab === 'documents' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('documents')}
          >
            <span className="material-symbols-outlined">description</span>
            <span>Liste des Documents</span>
          </button>
          <button
            className={activeTab === 'validation' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('validation')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="material-symbols-outlined">pending_actions</span>
              <span>File de Validation</span>
            </div>
            {enAttenteCount > 0 && <span className={styles.badgeGold}>{enAttenteCount}</span>}
          </button>
          <button
            className={activeTab === 'revocations' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('revocations')}
          >
            <span className="material-symbols-outlined">block</span>
            <span>Révocations</span>
          </button>
          <button
            className={activeTab === 'referentiels' ? styles.navItemActive : styles.navItem}
            onClick={() => setActiveTab('referentiels')}
          >
            <span className="material-symbols-outlined">tune</span>
            <span>Référentiels</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" placeholder="Rechercher un certificat, lot, matricule..." className={styles.searchInput} />
          </div>

          <div className={styles.headerRight}>
            <button className={styles.iconBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className={styles.notifBadge}>3</span>
            </button>
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
          {activeTab === 'dashboard' && (
          <>
          {/* Bandeau de Statut Intégrité */}
          <div className={styles.statusBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className={styles.statusIcon}>
                <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-container)' }}>verified_user</span>
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Intégrité Cryptographique Active</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0 }}>Ancrage blockchain opérationnel. Chaque diplôme validé est horodaté individuellement.</p>
              </div>
            </div>
            <div className={styles.badgeActive}>
              <span className={styles.pulseDot}></span> RÉSEAU BLOCKCHAIN OPÉRATIONNEL
            </div>
          </div>

          {/* Grille Bento */}
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard} style={{ gridColumn: 'span 5' }}>
              <div>
                <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)', fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  Action Immédiate
                </span>
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginTop: '0.75rem' }}>
                  DIPLÔMES EN ATTENTE DE VALIDATION
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.25rem 0' }}>1 Diplôme</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>(Licence Pro DAWII)</p>
              </div>

              <button
                className={styles.btnSign}
                onClick={() => setActiveTab('validation')}
              >
                <span className="material-symbols-outlined">visibility</span> Voir la File de Validation
              </button>
            </div>

            <div className={styles.bentoCard} style={{ gridColumn: 'span 4' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', margin: 0 }}>
                  DOCUMENTS VALIDÉS CE MOIS
                </p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0 0.25rem 0' }}>
                  450
                </h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', margin: 0 }}>Taux de rejet : <strong>2,1%</strong></p>
              </div>
            </div>

            <div className={styles.bentoCard} style={{ gridColumn: 'span 3' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', margin: 0 }}>
                  DIPLÔMES ÉMIS
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0 0.25rem 0' }}>
                  14,250
                </h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--on-tertiary-container)', fontWeight: 'bold', margin: 0 }}>+450 ce mois-ci</p>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.5rem' }}>
                Taux de vérification publique : <strong>98.4%</strong>
              </div>
            </div>
          </section>
          </>
          )}

          {/* Fiche Étudiant */}
          {activeTab === 'etudiants' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Fiche Étudiant</h3>
              </div>
              <div style={{ padding: '1.5rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                Recherche et création inline de la fiche étudiant (GET/POST/PATCH/DELETE /etudiants-admin).
              </div>
            </section>
          )}

          {/* Émission de Diplôme */}
          {activeTab === 'emission' && <EmissionDiplome />}

          {/* Liste des Documents */}
          {activeTab === 'documents' && <ListeDocuments />}

          {/* File de Validation */}
          {activeTab === 'validation' && <FileValidation />}

          {/* Révocations */}
          {activeTab === 'revocations' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Révocations</h3>
              </div>
              <div style={{ padding: '1.5rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                Révocation de diplômes déjà émis (POST /documents/:id/revoquer).
              </div>
            </section>
          )}

          {/* Référentiels */}
          {activeTab === 'referentiels' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Référentiels</h3>
              </div>
              <div style={{ padding: '1.5rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                Types de documents et mentions (GET/POST/PATCH/DELETE /types-document, /mentions).
              </div>
            </section>
          )}

          {/* MON COMPTE — accessible via le menu de l'avatar, hors navigation principale */}
          {activeTab === 'mon-compte' && <MonCompte roleLabel={roleLabel} />}
        </main>
      </div>
    </div>
  );
}