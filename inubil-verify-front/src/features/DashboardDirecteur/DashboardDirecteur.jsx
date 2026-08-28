import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import NotificationsBell from '../../shared/components/NotificationsBell/NotificationsBell';
import MonCompte from '../../shared/components/MonCompte/MonCompte';
import EmissionDiplome from '../../shared/components/EmissionDiplome/EmissionDiplome';
import FicheEtudiant from '../../shared/components/FicheEtudiant/FicheEtudiant';
import ListeDocuments from '../../shared/components/ListeDocuments/ListeDocuments';
import FileValidation from '../../shared/components/FileValidation/FileValidation';
import Revocations from '../../shared/components/Revocations/Revocations';
import { listerDocuments } from '../../core/documents/documents.api';
import { getStatistiquesGlobales } from '../../core/admin/admin.api';
import { listerTypesDocument } from '../../core/types-document/types-document.api';
import { getEtudiant } from '../../core/etudiants/etudiants.api';
import styles from './DashboardDirecteur.module.css';

const LABELS_STATUT = {
  brouillon: 'Brouillon',
  en_validation: 'En validation',
  actif: 'Validé',
  revoque: 'Révoqué',
  rejete: 'Rejeté',
  expire: 'Expiré',
};

const CLASSES_STATUT = {
  brouillon: styles.statusPending,
  en_validation: styles.statusPending,
  actif: styles.statusSealed,
  revoque: styles.statusRevoked,
  rejete: styles.statusRevoked,
  expire: styles.statusExpired,
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtNombre(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('fr-FR');
}

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

  // Donnees reelles de la Vue d'Ensemble (KPIs + activite recente) — remplace les chiffres fictifs.
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [validesCeMois, setValidesCeMois] = useState(0);
  const [rejetesCeMois, setRejetesCeMois] = useState(0);
  const [premierEnAttente, setPremierEnAttente] = useState(null);
  const [activitesRecentes, setActivitesRecentes] = useState([]);
  const [activitesLoading, setActivitesLoading] = useState(true);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    let annule = false;

    (async () => {
      setStatsLoading(true);
      setActivitesLoading(true);

      const debutMois = new Date();
      debutMois.setDate(1);
      const debutMoisIso = debutMois.toISOString().slice(0, 10);

      try {
        const [statsGlobales, valides, rejetes, enValidation, recents, typesDoc] = await Promise.all([
          getStatistiquesGlobales(),
          listerDocuments({ statut: 'actif', dateDebut: debutMoisIso, limit: 1 }),
          listerDocuments({ statut: 'rejete', dateDebut: debutMoisIso, limit: 1 }),
          listerDocuments({ statut: 'en_validation', limit: 1 }),
          listerDocuments({ limit: 5 }),
          listerTypesDocument(),
        ]);
        if (annule) return;

        setStats(statsGlobales);
        setValidesCeMois(valides.total ?? 0);
        setRejetesCeMois(rejetes.total ?? 0);

        const typesParId = Object.fromEntries(typesDoc.map((t) => [t.id, t.nom]));

        let candidat = enValidation.items?.[0] ?? null;
        if (!candidat) {
          const brouillons = await listerDocuments({ statut: 'brouillon', limit: 1 });
          candidat = brouillons.items?.[0] ?? null;
        }

        const idsEtudiants = new Set(recents.items.map((d) => d.etudiant_id));
        if (candidat) idsEtudiants.add(candidat.etudiant_id);

        const etudiantsParId = {};
        await Promise.all(
          [...idsEtudiants].map(async (id) => {
            const e = await getEtudiant(id).catch(() => null);
            if (e) etudiantsParId[id] = e;
          }),
        );
        if (annule) return;

        const nomEtudiant = (id) =>
          etudiantsParId[id] ? `${etudiantsParId[id].prenom} ${etudiantsParId[id].nom}` : '—';

        setPremierEnAttente(
          candidat
            ? { type: typesParId[candidat.type_document_id] ?? 'Document', etudiant: nomEtudiant(candidat.etudiant_id) }
            : null,
        );

        setActivitesRecentes(
          recents.items.map((d) => ({
            id: d.id,
            numero: d.numero_unique,
            statut: d.statut,
            type: typesParId[d.type_document_id] ?? 'Document',
            etudiant: nomEtudiant(d.etudiant_id),
            date: d.created_at,
          })),
        );
      } catch {
        // La vue reste sur ses valeurs par defaut (0 / listes vides) si un appel echoue.
      } finally {
        if (!annule) {
          setStatsLoading(false);
          setActivitesLoading(false);
        }
      }
    })();

    return () => {
      annule = true;
    };
  }, [activeTab]);

  const tauxRejet = validesCeMois + rejetesCeMois > 0
    ? ((rejetesCeMois / (validesCeMois + rejetesCeMois)) * 100).toFixed(1)
    : null;

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

          {/* Grille Bento — donnees reelles (GET /admin/statistiques + GET /documents) */}
          <section className={styles.bentoGrid}>
            <div className={styles.bentoCard} style={{ gridColumn: 'span 5' }}>
              <div>
                {enAttenteCount > 0 ? (
                  <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)', fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '9999px', textTransform: 'uppercase' }}>
                    Action Immédiate
                  </span>
                ) : (
                  <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'rgba(74, 223, 158, 0.15)', color: 'var(--on-tertiary-container)', fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '9999px', textTransform: 'uppercase' }}>
                    À Jour
                  </span>
                )}
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginTop: '0.75rem' }}>
                  DIPLÔMES EN ATTENTE DE VALIDATION
                </p>
                {enAttenteCount > 0 ? (
                  <>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.25rem 0' }}>
                      {enAttenteCount} diplôme{enAttenteCount > 1 ? 's' : ''}
                    </h3>
                    {premierEnAttente && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                        Le plus ancien : {premierEnAttente.type} — {premierEnAttente.etudiant}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.25rem 0' }}>Aucun en attente</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>Tous les documents soumis ont été traités.</p>
                  </>
                )}
              </div>

              {enAttenteCount > 0 && (
                <button
                  className={styles.btnSign}
                  onClick={() => setActiveTab('validation')}
                >
                  <span className="material-symbols-outlined">visibility</span> Voir la File de Validation
                </button>
              )}
            </div>

            <div className={styles.bentoCard} style={{ gridColumn: 'span 4' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', margin: 0 }}>
                  DOCUMENTS VALIDÉS CE MOIS
                </p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0 0.25rem 0' }}>
                  {statsLoading ? '…' : fmtNombre(validesCeMois)}
                </h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', margin: 0 }}>
                  Taux de rejet : <strong>{tauxRejet !== null ? `${tauxRejet}%` : '—'}</strong>
                </p>
              </div>
            </div>

            <div className={styles.bentoCard} style={{ gridColumn: 'span 3' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', margin: 0 }}>
                  DIPLÔMES ÉMIS (TOTAL)
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0 0.25rem 0' }}>
                  {statsLoading ? '…' : fmtNombre(stats?.documents?.actifs)}
                </h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--on-tertiary-container)', fontWeight: 'bold', margin: 0 }}>
                  +{fmtNombre(validesCeMois)} ce mois-ci
                </p>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.5rem' }}>
                Vérifications publiques : <strong>{fmtNombre(stats?.verifications?.total)}</strong>
                {' '}({fmtNombre(stats?.verifications?.ce_mois)} ce mois-ci)
              </div>
            </div>
          </section>

          {/* Activité récente — 5 derniers documents créés (GET /documents?limit=5) */}
          <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Activité Récente</h3>
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Voir tous les documents →
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Étudiant</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {activitesLoading && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>Chargement…</td></tr>
                )}
                {!activitesLoading && activitesRecentes.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>Aucun document n'a encore été créé.</td></tr>
                )}
                {!activitesLoading && activitesRecentes.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div>{a.type}</div>
                      <div className={styles.mono} style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{a.numero}</div>
                    </td>
                    <td>{a.etudiant}</td>
                    <td>{fmtDate(a.date)}</td>
                    <td>
                      <span className={CLASSES_STATUT[a.statut] ?? styles.statusPending}>
                        {LABELS_STATUT[a.statut] ?? a.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          </>
          )}

          {/* Fiche Étudiant */}
          {activeTab === 'etudiants' && <FicheEtudiant />}

          {/* Émission de Diplôme */}
          {activeTab === 'emission' && <EmissionDiplome />}

          {/* Liste des Documents */}
          {activeTab === 'documents' && <ListeDocuments />}

          {/* File de Validation */}
          {activeTab === 'validation' && <FileValidation />}

          {/* Révocations */}
          {activeTab === 'revocations' && <Revocations />}

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