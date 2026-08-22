import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Valide.module.css';
import Logo_Inubil from '../../assets/Logo_Inubil.png';
import { telechargerRapport } from '../../core/verify/verify.api';

const LABELS_CATEGORIE = {
  diplome: 'Diplôme',
  releve_notes: 'Relevé de Notes',
  attestation: 'Attestation',
};

const LABELS_RESEAU = {
  polygon_amoy: 'Polygon Amoy (Testnet)',
  polygon_mainnet: 'Polygon Mainnet',
};

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateHeure(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Rendu du resultat "authentique" de GET /verify/:identifiant — donnees reelles uniquement. */
export default function Valide({ document: doc, blockchain, verifieLe, onNouvelleVerification }) {
  const [copie, setCopie] = useState(false);
  const [telechargement, setTelechargement] = useState(false);
  const [erreurRapport, setErreurRapport] = useState(null);
  const navigate = useNavigate();

  const urlPartage = doc.url_verification || `${window.location.origin}/d/${doc.numero_unique}`;

  const copierLien = () => {
    navigator.clipboard.writeText(urlPartage);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  const telecharger = async () => {
    setErreurRapport(null);
    setTelechargement(true);
    try {
      await telechargerRapport(doc.numero_unique);
    } catch (err) {
      setErreurRapport(err.message ?? 'Le rapport n\'a pas pu etre genere.');
    } finally {
      setTelechargement(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.brandGroup}>
            <img alt="INUBIL Logo" className={styles.logo} src={Logo_Inubil} />
          </div>
          <div className={styles.navGroup}>
            <nav>
              <button
                type="button"
                className={styles.navLink}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => (onNouvelleVerification ? onNouvelleVerification() : navigate('/verification-publique'))}
              >
                Nouvelle vérification
              </button>
            </nav>
            <button className={styles.connexionBtn} onClick={() => navigate('/login')}>
              Connexion
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.mainContainer}>

          <div className={styles.banner}>
            <div className={styles.bannerIconContainer}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                check_circle
              </span>
            </div>
            <div>
              <h2 className={styles.bannerTitle}>DOCUMENT AUTHENTIQUE & VALIDE</h2>
              <p className={styles.bannerDesc}>
                Ce document académique a été certifié conforme par l'institution émettrice
                {blockchain?.enregistre ? ' et ancré avec succès sur la blockchain Polygon.' : '.'}
              </p>
            </div>
          </div>

          <div className={styles.grid}>

            <div className={styles.leftCard}>
              <div className={styles.watermark}>
                <span className={`material-symbols-outlined ${styles.watermarkIcon}`}>verified</span>
              </div>

              <div style={{ position: 'relative', zIndex: 10 }}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>
                    <span className="material-symbols-outlined">description</span>
                    Données Certifiées
                  </h3>
                  <span className={styles.badge}>{LABELS_CATEGORIE[doc.categorie] ?? doc.categorie}</span>
                </div>

                <div className={styles.dataGrid}>
                  <div className={styles.field}>
                    <span className={styles.label}>Titulaire</span>
                    <span className={styles.valueBold}>{doc.etudiant_nom}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Établissement</span>
                    <span className={styles.valueBold}>{doc.universite}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Type de Document</span>
                    <span className={styles.valueNormal}>{doc.type_document}</span>
                  </div>
                  {doc.filiere && (
                    <div className={styles.field}>
                      <span className={styles.label}>Filière / Parcours</span>
                      <span className={styles.valueNormal}>{doc.filiere}</span>
                    </div>
                  )}
                  {doc.annee_academique && (
                    <div className={styles.field}>
                      <span className={styles.label}>Année Académique</span>
                      <span className={styles.valueNormal}>{doc.annee_academique}</span>
                    </div>
                  )}
                  {doc.mention && (
                    <div className={styles.field}>
                      <span className={styles.label}>Mention</span>
                      <span className={styles.valueAccent}>{doc.mention}</span>
                    </div>
                  )}
                  {doc.moyenne_generale !== null && doc.moyenne_generale !== undefined && (
                    <div className={styles.field}>
                      <span className={styles.label}>Moyenne Générale</span>
                      <span className={styles.valueNormal}>{doc.moyenne_generale}/20</span>
                    </div>
                  )}
                  <div className={styles.field}>
                    <span className={styles.label}>Date d'Émission</span>
                    <span className={styles.valueNormal}>{fmtDate(doc.date_emission)}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.label}>Numéro Unique</span>
                    <span className={styles.valueCode}>{doc.numero_unique}</span>
                  </div>
                </div>

                {doc.matieres?.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <span className={styles.label}>Relevé des Matières</span>
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {doc.matieres.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex', justifyContent: 'space-between', gap: '12px',
                            padding: '8px 12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '14px',
                          }}
                        >
                          <span>{m.nom_matiere}</span>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {m.note !== null ? `${m.note}/${m.note_max}` : m.resultat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className={styles.downloadBtn} onClick={telecharger} disabled={telechargement}>
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                  {telechargement ? 'Génération en cours…' : 'Télécharger le rapport de vérification (PDF)'}
                </button>
                {erreurRapport && (
                  <p style={{ color: '#ba1a1a', fontSize: '13px', marginTop: '8px' }}>{erreurRapport}</p>
                )}
              </div>
            </div>

            <div className={styles.rightCard}>
              <h3 className={styles.cardTitle} style={{ marginBottom: '24px' }}>Partager cette vérification</h3>
              <p style={{ fontSize: '14px', color: '#42474f', marginBottom: '16px' }}>
                Ce lien permet à quiconque de vérifier ce document, sans compte, en quelques secondes.
              </p>
              <div className={styles.hashRow}>
                <div style={{ minWidth: 0 }}>
                  <span className={styles.hashLabel}>Lien de vérification</span>
                  <code className={styles.hashCode} style={{ wordBreak: 'break-all' }}>{urlPartage}</code>
                </div>
                <button
                  className={`${styles.copyBtn} ${copie ? styles.copyBtnSuccess : ''}`}
                  onClick={copierLien}
                  title="Copier le lien"
                >
                  <span className="material-symbols-outlined">{copie ? 'check' : 'content_copy'}</span>
                </button>
              </div>
            </div>

            {blockchain ? (
              <div className={styles.cryptoCard}>
                <div className={styles.cryptoTitleGroup}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>lock</span>
                  <h3 className={styles.cardTitle} style={{ color: 'inherit' }}>Preuves Cryptographiques (Immuables)</h3>
                </div>

                <div className={styles.cryptoList}>
                  {blockchain.transaction_hash && (
                    <div className={styles.hashRow}>
                      <div style={{ minWidth: 0 }}>
                        <span className={styles.hashLabel}>Transaction Hash</span>
                        <code className={styles.hashCode}>{blockchain.transaction_hash}</code>
                      </div>
                    </div>
                  )}

                  <div className={styles.subCryptoGrid}>
                    <div className={styles.cryptoBlock}>
                      <span className={styles.hashLabel}>Réseau Blockchain</span>
                      <div className={styles.networkStatus}>
                        <span className={styles.pulseDot}></span>
                        <span className={styles.valueBold} style={{ fontSize: '16px' }}>
                          {LABELS_RESEAU[blockchain.reseau] ?? blockchain.reseau}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cryptoBlock}>
                      <span className={styles.hashLabel}>Ancrage on-chain</span>
                      <span className={styles.valueBold} style={{ fontSize: '16px' }}>
                        {blockchain.enregistre ? 'Confirmé' : 'Non confirmé'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.cryptoCard}>
                <p style={{ fontSize: '14px', color: '#42474f', margin: 0 }}>
                  L'ancrage blockchain n'est pas disponible pour cette vérification. L'authenticité du document
                  reste garantie par l'établissement émetteur.
                </p>
              </div>
            )}

            <div className={styles.auditCard}>
              <h4 className={styles.auditTitle}>Historique d'Audit</h4>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotGreen}></div>
                    <div className={styles.timelineLine}></div>
                  </div>
                  <div>
                    <p className={styles.timelineNodeTitle}>Certifié par {doc.universite}</p>
                    <p className={styles.label} style={{ textTransform: 'none', color: '#42474f', fontWeight: 400 }}>
                      {fmtDate(doc.date_emission)}
                    </p>
                  </div>
                </div>

                {blockchain?.date_enregistrement && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineAxis}>
                      <div className={styles.timelineDotGreen}></div>
                      <div className={styles.timelineLine}></div>
                    </div>
                    <div>
                      <p className={styles.timelineNodeTitle}>Ancrage Blockchain</p>
                      <p className={styles.label} style={{ textTransform: 'none', color: '#42474f', fontWeight: 400 }}>
                        {fmtDateHeure(blockchain.date_enregistrement)}
                      </p>
                    </div>
                  </div>
                )}

                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotOutline}></div>
                  </div>
                  <div>
                    <p className={styles.timelineNodeTitleActive}>Consultation actuelle</p>
                    <p className={styles.label} style={{ textTransform: 'none', color: '#42474f', fontWeight: 400 }}>
                      {fmtDateHeure(verifieLe)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
