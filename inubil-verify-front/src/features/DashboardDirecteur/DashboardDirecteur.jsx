import { useState } from 'react';
import { useAuth } from '../../core/auth/useAuth';
import AccountMenu from '../../shared/components/AccountMenu/AccountMenu';
import MonCompte from '../../shared/components/MonCompte/MonCompte';
import EmissionDiplome from '../../shared/components/EmissionDiplome/EmissionDiplome';
import styles from './DashboardDirecteur.module.css';

export default function DashboardDirecteur() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [signingStates, setSigningStates] = useState({});
  const { utilisateur, logout } = useAuth();

  const prenom = utilisateur?.prenom ?? '';
  const nom = utilisateur?.nom ?? '';
  const roleLabel = utilisateur?.role?.nom === 'directeur_pedagogique' ? 'Directeur Pédagogique' : (utilisateur?.role?.nom ?? '');

  const handleLogout = async () => {
    await logout();
  };
  const [selectedManifeste, setSelectedManifeste] = useState(null);
  const [previewDiplome, setPreviewDiplome] = useState(null);

  const [etudiantsList, setEtudiantsList] = useState([
    { id: 1, nom: 'KOUAM Jean', matricule: '21U043', dateNaissance: '12/04/2001', diplome: 'Licence Pro DAWII', mention: 'Bien', moyenne: '15.5/20', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', statut: 'INCLUS' },
    { id: 2, nom: 'MBALLA Sandrine', matricule: '21U044', dateNaissance: '05/09/2002', diplome: 'Licence Pro DAWII', mention: 'Assez Bien', moyenne: '14.2/20', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4', statut: 'INCLUS' },
    { id: 3, nom: 'TCHOUA Paul', matricule: '21U045', dateNaissance: '18/11/2000', diplome: 'Licence Pro DAWII', mention: 'Très Bien', moyenne: '16.0/20', hash: 'a132470870f7a79e6022e339174092b77a94154b73e86c05a109a13b482d8c3c', statut: 'INCLUS' },
    { id: 4, nom: 'EBONE Christine', matricule: '21U046', dateNaissance: '30/01/2002', diplome: 'Licence Pro DAWII', mention: 'Passable', moyenne: '13.8/20', hash: '6c58793b58602b11d8847842e47805126f3e0988523ef21f92e92c22253303fa', statut: 'INCLUS' },
  ]);

  const toggleStudentStatus = (id) => {
    setEtudiantsList((prev) =>
      prev.map((etud) =>
        etud.id === id
          ? { ...etud, statut: etud.statut === 'INCLUS' ? 'EXCLU' : 'INCLUS' }
          : etud
      )
    );
  };

  const handleSign = (id) => {
    setSigningStates((prev) => ({ ...prev, [id]: 'loading' }));
    setTimeout(() => {
      setSigningStates((prev) => ({ ...prev, [id]: 'signed' }));
      setSelectedManifeste(null);
    }, 1500);
  };

  const handleRefuse = (id) => {
    setSigningStates((prev) => ({ ...prev, [id]: 'refused' }));
    setSelectedManifeste(null);
  };

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
            <span className={styles.badgeGold}>01</span>
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
          {activeTab === 'documents' && (
            <section className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Liste des Documents</h3>
              </div>
              <div style={{ padding: '1.5rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                Ensemble des documents de l'établissement (GET /documents).
              </div>
            </section>
          )}

          {/* File de Validation */}
          {activeTab === 'validation' && (
          <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>File d'Attente & Historique de Validation</h3>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Document</th>
                  <th>Filière / Promotion</th>
                  <th>Étudiant</th>
                  <th>Statut Ancrage</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className={styles.mono}>DOC-2026-UD-DAWII-043</span></td>
                  <td>Licence Professionnelle (DAWII)</td>
                  <td>KOUAM Jean</td>
                  <td>
                    {signingStates['bento'] === 'signed' ? (
                      <span className={styles.statusSealed}>VALIDÉ & ANCRÉ</span>
                    ) : (
                      <span className={styles.statusPending}>EN ATTENTE DE VALIDATION</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnAction} onClick={() => setSelectedManifeste({ id: 'DOC-2026-UD-DAWII-043', filiere: 'Licence Pro DAWII', etablissement: 'IUT de Douala' })}>
                      Inspecter
                    </button>
                  </td>
                </tr>
                <tr>
                  <td><span className={styles.mono}>DOC-2026-UD-GL-012</span></td>
                  <td>Master Genie Logiciel</td>
                  <td>MBALLA Sandrine</td>
                  <td><span className={styles.statusSealed}>VALIDÉ & ANCRÉ</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnAction} style={{ opacity: 0.5 }} disabled>Ancré</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          )}

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

      {/* MODALE D'INSPECTION DÉTAILLÉE */}
      {selectedManifeste && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainerLarge}>
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Inspection Détaillée : {selectedManifeste.id}</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{selectedManifeste.filiere} — {selectedManifeste.etablissement}</p>
              </div>
              <button onClick={() => setSelectedManifeste(null)} className={styles.btnClose}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ margin: 0 }}><strong>Agent Saisie :</strong> Marie Ngo</p>
                <p style={{ margin: 0 }}><strong>Contrôle Hash :</strong> <span style={{ color: 'var(--on-tertiary-container)', fontWeight: 'bold' }}>✓ 150/150 Empreintes Validées</span></p>
              </div>

              <h4 style={{ margin: '1rem 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--primary)' }}>
                Liste des Diplômés ({etudiantsList.filter(e => e.statut === 'INCLUS').length} / {etudiantsList.length} retenus dans le lot)
              </h4>

              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ border: '1px solid var(--outline-variant)', minWidth: '750px' }}>
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Titulaire</th>
                      <th>Diplôme & Mention</th>
                      <th>Statut Actuel</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etudiantsList.map((etud) => (
                      <tr key={etud.id} style={{ opacity: etud.statut === 'EXCLU' ? 0.4 : 1 }}>
                        <td className={styles.mono} style={{ fontWeight: 'bold' }}>{etud.matricule}</td>
                        <td><strong>{etud.nom}</strong></td>
                        <td>{etud.diplome} ({etud.mention})</td>
                        <td>
                          {etud.statut === 'INCLUS' ? (
                            <span className={styles.badgeInclus}>✓ INCLUS</span>
                          ) : (
                            <span className={styles.badgeExclu}>✕ EXCLU</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button className={styles.btnIcon} title="Aperçu diplôme" onClick={() => setPreviewDiplome(etud)}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>visibility</span>
                            </button>

                            <button
                              className={etud.statut === 'INCLUS' ? styles.btnExclude : styles.btnInclude}
                              onClick={() => toggleStudentStatus(etud.id)}
                            >
                              {etud.statut === 'INCLUS' ? 'Exclure' : 'Inclure'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnReject} onClick={() => handleRefuse('bento')}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>cancel</span> Refuser & Renvoyer
              </button>
              <button className={styles.btnApprove} onClick={() => handleSign('bento')}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified</span> Valider & Ancrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE APERÇU DU DIPLÔME */}
      {previewDiplome && (
        <div className={styles.modalOverlaySecondary}>
          <div className={styles.diplomaCard}>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setPreviewDiplome(null)} className={styles.btnClose}>✕</button>
            </div>
            
            <div className={styles.diplomaPaper}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid var(--primary)', paddingBottom: '0.75rem' }}>
                <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1rem' }}>RÉPUBLIQUE DU CAMEROUN</h2>
                <p style={{ margin: '0.25rem 0', fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>Université de Douala — IUT de Douala</p>
                <h1 style={{ color: 'var(--luxury-gold)', fontFamily: 'serif', margin: '0.6rem 0 0.25rem 0', fontSize: '1.25rem' }}>ATTESTATION DE DIPLÔME</h1>
              </div>

              <div style={{ margin: '1rem 0', fontSize: '0.75rem', lineHeight: '1.5' }}>
                <p style={{ margin: '0.25rem 0' }}>Le Directeur certifie que :</p>
                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)', textAlign: 'center', margin: '0.5rem 0' }}>
                  {previewDiplome.nom}
                </p>
                <p style={{ margin: '0.25rem 0' }}>Matricule : <strong>{previewDiplome.matricule}</strong></p>
                <p style={{ margin: '0.25rem 0' }}>Diplôme : <strong>{previewDiplome.diplome}</strong> ({previewDiplome.mention})</p>
              </div>

              <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '0.25rem', fontSize: '0.6rem', wordBreak: 'break-all' }}>
                <strong>Hash SHA-256 :</strong><br />
                <span className={styles.mono}>{previewDiplome.hash}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}