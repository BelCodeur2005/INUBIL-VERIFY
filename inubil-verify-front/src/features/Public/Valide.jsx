import { useEffect, useState } from 'react';
import styles from './Valide.module.css';
import PublicHeader from './PublicHeader';
import { telechargerRapport } from '../../core/verify/verify.api';
import { genererQrDataUrl } from '../../shared/components/DiplomaBadge/DiplomaBadge.download';

const LABELS_CATEGORIE = {
  diplome: 'Diplôme',
  releve_notes: 'Relevé de Notes',
  attestation: 'Attestation',
};

const LABELS_RESEAU = {
  polygon_amoy: 'Polygon Amoy (Testnet)',
  polygon_mainnet: 'Polygon Mainnet',
};

const EXPLORATEUR_URL = {
  polygon_amoy: 'https://amoy.polygonscan.com/tx/',
  polygon_mainnet: 'https://polygonscan.com/tx/',
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
  const [explorerOuvert, setExplorerOuvert] = useState(false);
  const [copieHash, setCopieHash] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  const urlPartage = doc.url_verification || `${window.location.origin}/d/${doc.numero_unique}`;

  useEffect(() => {
    let annule = false;
    genererQrDataUrl(urlPartage).then((dataUrl) => {
      if (!annule) setQrDataUrl(dataUrl);
    });
    return () => {
      annule = true;
    };
  }, [urlPartage]);

  const copierLien = () => {
    navigator.clipboard.writeText(urlPartage);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  const copierHash = () => {
    if (!blockchain?.transaction_hash) return;
    navigator.clipboard.writeText(blockchain.transaction_hash);
    setCopieHash(true);
    setTimeout(() => setCopieHash(false), 2000);
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
      <PublicHeader onNouvelleVerification={onNouvelleVerification} />

      <main className={styles.main}>
        <div className={styles.mainContainer}>

          {/* BANNIÈRE VALIDATION */}
          <div className={styles.banner}>
            <div className={styles.bannerIconContainer}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>check_circle</span>
            </div>
            <div>
              <div className={styles.bannerTitle}>DOCUMENT AUTHENTIQUE &amp; VALIDE</div>
              <div className={styles.bannerDesc}>
                Ce document académique a été certifié conforme par l'institution émettrice
                {blockchain?.enregistre ? ' et ancré avec succès sur la blockchain Polygon.' : '.'}
              </div>
            </div>
          </div>

          <div className={styles.grid}>

            {/* CARTE GAUCHE : DONNÉES CERTIFIÉES */}
            <div className={styles.leftCard}>
              <div className={styles.watermark}>
                <span className="material-symbols-outlined" style={{ fontSize: '220px' }}>verified</span>
              </div>

              <div style={{ position: 'relative', zIndex: 10 }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className="material-symbols-outlined">description</span>
                    Données Certifiées
                  </div>
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
                  <div className={styles.matieresList}>
                    <span className={styles.label}>Relevé des Matières</span>
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {doc.matieres.map((m, i) => (
                        <div key={i} className={styles.matiereRow}>
                          <span>{m.nom_matiere}</span>
                          <span className={styles.matiereNote}>
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
                {erreurRapport && <p className={styles.downloadError}>{erreurRapport}</p>}
              </div>
            </div>

            {/* CARTE DROITE : PARTAGE & QR CODE */}
            <div className={styles.rightCard}>
              <div className={styles.cardTitle} style={{ fontSize: '18px' }}>Partager cette vérification</div>
              <p className={styles.rightCardDesc}>
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

              {qrDataUrl && (
                <div className={styles.qrContainer}>
                  <div className={styles.qrBox}>
                    <img src={qrDataUrl} alt="QR code de vérification" className={styles.qrImage} />
                  </div>
                  <div className={styles.qrText}>
                    <p className={styles.qrDesc}>
                      Faites scanner ce code par une autre personne pour qu'elle vérifie le document instantanément sur son propre appareil.
                    </p>
                    <a
                      href={qrDataUrl}
                      download={`qr-verification-${doc.numero_unique}.png`}
                      className={styles.qrDownloadLink}
                    >
                      Télécharger le QR code
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION CRYPTOGRAPHIQUE */}
            {blockchain ? (
              <div className={styles.cryptoCard}>
                <div className={styles.cryptoTitleGroup}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>lock</span>
                  <h3>Preuves Cryptographiques (Immuables)</h3>
                </div>

                <div className={styles.cryptoList}>
                  {blockchain.transaction_hash && (
                    <div className={styles.hashRow}>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.hashLabel}>Transaction Hash</div>
                        <div className={styles.hashCode}>{blockchain.transaction_hash}</div>
                      </div>
                    </div>
                  )}

                  <div className={styles.subCryptoGrid}>
                    <div className={styles.cryptoBlock}>
                      <div className={styles.hashLabel}>Réseau Blockchain</div>
                      <div className={styles.networkStatus}>
                        <span className={styles.pulseDot}></span>
                        <span>{LABELS_RESEAU[blockchain.reseau] ?? blockchain.reseau}</span>
                      </div>
                    </div>
                    <div className={styles.cryptoBlock}>
                      <div className={styles.hashLabel}>Ancrage on-chain</div>
                      <div className={styles.networkStatus}>
                        {blockchain.enregistre ? 'Confirmé' : 'Non confirmé'}
                      </div>
                    </div>
                  </div>

                  {blockchain.transaction_hash && (
                    <button type="button" className={styles.explorerBtn} onClick={() => setExplorerOuvert(true)}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>travel_explore</span>
                      Voir sur l'explorateur
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.cryptoCard}>
                <p className={styles.cryptoEmpty}>
                  L'ancrage blockchain n'est pas disponible pour cette vérification. L'authenticité du document
                  reste garantie par l'établissement émetteur.
                </p>
              </div>
            )}

            {/* HISTORIQUE D'AUDIT */}
            <div className={styles.auditCard}>
              <div className={styles.auditTitle}>Historique d'Audit</div>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotGreen}></div>
                    <div className={styles.timelineLine}></div>
                  </div>
                  <div>
                    <div className={styles.timelineNodeTitle}>Certifié par {doc.universite}</div>
                    <div className={styles.timelineSub}>{fmtDate(doc.date_emission)}</div>
                  </div>
                </div>

                {blockchain?.date_enregistrement && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineAxis}>
                      <div className={styles.timelineDotGreen}></div>
                      <div className={styles.timelineLine}></div>
                    </div>
                    <div>
                      <div className={styles.timelineNodeTitle}>Ancrage Blockchain</div>
                      <div className={styles.timelineSub}>{fmtDateHeure(blockchain.date_enregistrement)}</div>
                    </div>
                  </div>
                )}

                <div className={styles.timelineItem}>
                  <div className={styles.timelineAxis}>
                    <div className={styles.timelineDotOutline}></div>
                  </div>
                  <div>
                    <div className={styles.timelineNodeTitleActive}>Consultation actuelle</div>
                    <div className={styles.timelineSub}>{fmtDateHeure(verifieLe)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* MODALE EXPLORATEUR BLOCKCHAIN */}
      {explorerOuvert && blockchain && (
        <div className={styles.modalOverlay} onClick={() => setExplorerOuvert(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalBadge}>Public</span>
                <h2 className={styles.modalTitle}>Explorateur du registre</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setExplorerOuvert(false)} aria-label="Fermer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className={styles.modalSubtitle}>
              Aperçu public de l'ancrage enregistré sur le registre décentralisé Polygon.
            </p>

            <div className={styles.modalStatusRow}>
              <span className={styles.networkBadge}>
                <span className={styles.pulseDot}></span>
                {LABELS_RESEAU[blockchain.reseau] ?? blockchain.reseau}
              </span>
              <span className={blockchain.enregistre ? styles.confirmedTag : styles.pendingTag}>
                {blockchain.enregistre ? 'Confirmé' : 'Non confirmé'}
              </span>
            </div>

            <div className={styles.modalField}>
              <span className={styles.hashLabel}>Transaction Hash</span>
              <div className={styles.infoRow}>
                <code className={styles.hashCode} style={{ wordBreak: 'break-all' }}>{blockchain.transaction_hash}</code>
                <button
                  className={`${styles.copyIconButton} ${copieHash ? styles.copyBtnSuccess : ''}`}
                  onClick={copierHash}
                  title="Copier le hash"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{copieHash ? 'check' : 'content_copy'}</span>
                </button>
              </div>
            </div>

            {blockchain.date_enregistrement && (
              <div className={styles.modalField}>
                <span className={styles.hashLabel}>Date d'ancrage</span>
                <span className={styles.valueNormal}>{fmtDateHeure(blockchain.date_enregistrement)}</span>
              </div>
            )}

            {EXPLORATEUR_URL[blockchain.reseau] && (
              <a
                className={styles.modalExternalLink}
                href={`${EXPLORATEUR_URL[blockchain.reseau]}${blockchain.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir sur PolygonScan
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
              </a>
            )}

            <div className={styles.modalBottomSpacer} />
          </div>
        </div>
      )}
    </div>
  );
}
