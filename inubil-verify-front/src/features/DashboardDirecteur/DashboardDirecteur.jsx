import React, { useState } from 'react';
import styles from './DashboardDirecteur.module.css';

export default function DashboardDirecteur() {
  const [signingStates, setSigningStates] = useState({});
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
          <a href="#vue-ensemble" className={styles.navItemActive}>
            <span className="material-symbols-outlined">dashboard</span>
            <span>Vue d'Ensemble</span>
          </a>
          <a href="#manifestes" className={styles.navItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="material-symbols-outlined">pending_actions</span>
              <span>File des Manifestes</span>
            </div>
            <span className={styles.badgeGold}>01</span>
          </a>
          <a href="#journal" className={styles.navItem}>
            <span className="material-symbols-outlined">history_edu</span>
            <span>Journal des Ancrages</span>
          </a>

          <p className={styles.sectionTitle}>Administration</p>
          <a href="#parametres" className={styles.navItem}>
            <span className="material-symbols-outlined">settings</span>
            <span>Configuration HSM</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)', fontSize: '1.1rem' }}>search</span>
            <input type="text" placeholder="Rechercher un certificat, lot, matricule..." className={styles.searchInput} />
          </div>

          <div className={styles.userProfile}>
            <div className={styles.avatar}>AD</div>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: 0 }}>Admin Root</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', margin: 0 }}>Superviseur</p>
            </div>
          </div>
        </header>

        <main className={styles.mainContent}>
          {/* Bandeau de Statut Intégrité */}
          <div className={styles.statusBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className={styles.statusIcon}>
                <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-container)' }}>verified_user</span>
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>Intégrité Cryptographique Active</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0 }}>Infrastructure HSM synchronisée. Tous les visas sont horodatés par bloc.</p>
              </div>
            </div>
            <div className={styles.badgeActive}>
              <span className={styles.pulseDot}></span> HSM LOCAL / CLÉ ACTIVE
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
                  LOTS EN ATTENTE DE VISA AUTORITAIRE
                </p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.25rem 0' }}>01 Manifeste</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>(150 Certificats Académiques)</p>
              </div>

              <button
                className={signingStates['bento'] === 'signed' ? styles.btnSigned : styles.btnSign}
                onClick={() => setSelectedManifeste({ id: 'BATCH-2026-UD-DAWII-043', filiere: 'Licence Pro DAWII', etablissement: 'IUT de Douala' })}
              >
                {signingStates['bento'] === 'signed' ? (
                  <>
                    <span className="material-symbols-outlined">verified</span> Signé & Ancré ✓
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">visibility</span> Inspecter & Traiter le Lot
                  </>
                )}
              </button>
            </div>

            <div className={styles.bentoCard} style={{ gridColumn: 'span 4' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--on-surface-variant)', textTransform: 'uppercase', margin: 0 }}>
                  QUOTA BLOCKCHAIN ANNUEL
                </p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', margin: '0.5rem 0 0.25rem 0' }}>
                  3,750 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--on-surface-variant)' }}>/ 5,000 Crédits</span>
                </h3>
                <div className={styles.progressBar} style={{ margin: '0.75rem 0 0.4rem 0' }}>
                  <div className={styles.progressFill} style={{ width: '75%' }}></div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', margin: 0 }}>Capacité restante : <strong>1,250 signatures</strong></p>
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

          {/* Tableau Principale */}
          <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>File d'Attente & Historique des Manifestes</h3>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Manifeste</th>
                  <th>Filière / Promotion</th>
                  <th>Nombre de Diplômes</th>
                  <th>Statut Ancrage</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className={styles.mono}>BATCH-2026-UD-DAWII-043</span></td>
                  <td>Licence Professionnelle (DAWII)</td>
                  <td>150 Diplômes</td>
                  <td>
                    {signingStates['bento'] === 'signed' ? (
                      <span className={styles.statusSealed}>SCELLÉ & ANCRÉ</span>
                    ) : (
                      <span className={styles.statusPending}>EN ATTENTE DE VISA</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnAction} onClick={() => setSelectedManifeste({ id: 'BATCH-2026-UD-DAWII-043', filiere: 'Licence Pro DAWII', etablissement: 'IUT de Douala' })}>
                      Inspecter
                    </button>
                  </td>
                </tr>
                <tr>
                  <td><span className={styles.mono}>BATCH-2026-UD-GL-012</span></td>
                  <td>Master Genie Logiciel</td>
                  <td>85 Diplômes</td>
                  <td><span className={styles.statusSealed}>SCELLÉ & ANCRÉ</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={styles.btnAction} style={{ opacity: 0.5 }} disabled>Ancré</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
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
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>verified</span> Apposer le Visa (Signer & Ancrer)
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