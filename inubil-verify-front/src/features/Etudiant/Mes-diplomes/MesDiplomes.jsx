import { useEffect, useState } from 'react';
import {
  Search,
  Share2,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldOff,
  ShieldAlert,
  Copy,
  Check,
  X,
  Award,
  Calendar,
  Building2,
  FileCheck2,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { listerMesDocuments, getUrlPdfMonDocument } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import DiplomaThumbnail from './DiplomaThumbnail';
import styles from './MesDiplomes.module.css';

const LABELS_RESEAU = {
  polygon_amoy: 'Polygon Amoy (Testnet)',
  polygon_mainnet: 'Polygon Mainnet',
};

const EXPLORATEUR_URL = {
  polygon_amoy: 'https://amoy.polygonscan.com/tx/',
  polygon_mainnet: 'https://polygonscan.com/tx/',
};

// statut_document (backend) -> presentation carte. brouillon/en_validation partagent le meme
// visuel "en cours" cote etudiant : la distinction saisie/validation n'a pas de valeur pour lui.
const STATUT_VISUEL = {
  actif:         { label: 'Certifié',  classe: 'statusCertified', icone: CheckCircle2 },
  en_validation: { label: 'En cours',  classe: 'statusPending',   icone: Clock },
  brouillon:     { label: 'En cours',  classe: 'statusPending',   icone: Clock },
  revoque:       { label: 'Révoqué',   classe: 'statusRevoked',   icone: ShieldOff },
  expire:        { label: 'Expiré',    classe: 'statusExpired',   icone: ShieldAlert },
};

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MesDiplomes() {
  const [documents, setDocuments] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'actif' | 'en_cours'
  const [copiedHashId, setCopiedHashId] = useState(null);
  const [selectedDiploma, setSelectedDiploma] = useState(null);
  const [telechargementId, setTelechargementId] = useState(null);

  useEffect(() => {
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const reponse = await listerMesDocuments({ limit: 100 });
        setDocuments(reponse.data);
      } catch (err) {
        setErreur(err instanceof ApiError ? err.message : 'Impossible de charger vos documents');
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const handleCopyHash = (id, hash, e) => {
    e.stopPropagation();
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const handleTelecharger = async (doc, e) => {
    e.stopPropagation();
    setTelechargementId(doc.id);
    try {
      const { url } = await getUrlPdfMonDocument(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Téléchargement impossible.');
    } finally {
      setTelechargementId(null);
    }
  };

  const nbCertifies = documents.filter((d) => d.statut === 'actif').length;
  const nbEnCours = documents.filter((d) => d.statut === 'en_validation' || d.statut === 'brouillon').length;

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.type_document.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.universite.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.numero_unique.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'actif' && doc.statut === 'actif') ||
      (statusFilter === 'en_cours' && (doc.statut === 'en_validation' || doc.statut === 'brouillon'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      {/* En-tête de la page */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mes Diplômes & Certifications</h1>
          <p className={styles.pageSubtitle}>
            Consultez, partagez et téléchargez l'ensemble de vos titres académiques certifiés sur la blockchain.
          </p>
        </div>
      </div>

      {/* Barre de Filtres et Recherche */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par intitulé, établissement ou identifiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tous ({documents.length})
          </button>
          <button
            className={`${styles.filterTab} ${statusFilter === 'actif' ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter('actif')}
          >
            Certifiés ({nbCertifies})
          </button>
          <button
            className={`${styles.filterTab} ${statusFilter === 'en_cours' ? styles.filterTabActive : ''}`}
            onClick={() => setStatusFilter('en_cours')}
          >
            En attente ({nbEnCours})
          </button>
        </div>
      </div>

      {chargement && (
        <div className={styles.etatVide}>
          <Loader2 size={22} className={styles.spin} />
          <p>Chargement de votre dossier académique...</p>
        </div>
      )}

      {!chargement && erreur && (
        <div className={styles.etatVide}>
          <ShieldAlert size={22} />
          <p>{erreur}</p>
        </div>
      )}

      {!chargement && !erreur && filteredDocuments.length === 0 && (
        <div className={styles.etatVide}>
          <Award size={22} />
          <p>
            {documents.length === 0
              ? "Aucun diplôme n'a encore été émis à votre nom."
              : 'Aucun document ne correspond à votre recherche.'}
          </p>
        </div>
      )}

      {/* Grille des Diplômes */}
      {!chargement && !erreur && filteredDocuments.length > 0 && (
        <div className={styles.diplomasGrid}>
          {filteredDocuments.map((doc) => {
            const visuel = STATUT_VISUEL[doc.statut] ?? STATUT_VISUEL.en_validation;
            const Icone = visuel.icone;
            const hashCourt = doc.hash_sha256 ? `${doc.hash_sha256.slice(0, 10)}…${doc.hash_sha256.slice(-6)}` : null;

            return (
              <div key={doc.id} className={styles.card}>
                <DiplomaThumbnail documentId={doc.id} aUnPdf={doc.a_un_pdf} statut={doc.statut} />

                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <div className={styles.titleGroup}>
                      <span className={styles.levelBadge}>{doc.categorie}</span>
                      <h3 className={styles.degreeTitle}>{doc.type_document}{doc.filiere ? ` — ${doc.filiere}` : ''}</h3>
                      <p className={styles.institutionName}>{doc.universite}</p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles[visuel.classe]}`}>
                      <Icone size={12} /> {visuel.label}
                    </span>
                  </div>

                  <div className={styles.metadataGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Date d'émission</span>
                      <span className={styles.metaValue}>{fmtDate(doc.date_emission) ?? '—'}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Mention</span>
                      <span className={styles.metaValue}>{doc.mention ?? '—'}</span>
                    </div>
                  </div>

                  {/* Bloc Empreinte Blockchain */}
                  <div className={styles.blockchainBlock}>
                    <div className={styles.blockchainInfo}>
                      <ShieldCheck size={14} className={doc.statut === 'actif' ? styles.shieldCertified : styles.shieldPending} />
                      <span className={styles.hashCode}>
                        {hashCourt ?? "En attente d'ancrage blockchain"}
                      </span>
                    </div>
                    {hashCourt && (
                      <button
                        className={styles.copyBtn}
                        onClick={(e) => handleCopyHash(doc.id, doc.hash_sha256, e)}
                        title="Copier le hash complet"
                      >
                        {copiedHashId === doc.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Actions de la carte */}
                  <div className={styles.cardActions}>
                    <button className={styles.primaryActionBtn} onClick={() => setSelectedDiploma(doc)}>
                      <FileCheck2 size={14} />
                      <span>Voir le certificat</span>
                    </button>
                    {doc.a_un_pdf && (
                      <button
                        className={styles.secondaryActionBtn}
                        title="Télécharger le PDF"
                        onClick={(e) => handleTelecharger(doc, e)}
                        disabled={telechargementId === doc.id}
                      >
                        {telechargementId === doc.id ? <Loader2 size={14} className={styles.spin} /> : <Download size={14} />}
                      </button>
                    )}
                    <button className={styles.secondaryActionBtn} title="Partager l'accès">
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer de détail d'un certificat */}
      {selectedDiploma && (() => {
        const visuel = STATUT_VISUEL[selectedDiploma.statut] ?? STATUT_VISUEL.en_validation;
        return (
          <div className={styles.drawerOverlay} onClick={() => setSelectedDiploma(null)}>
            <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleBox}>
                  <Award size={20} className={styles.modalIcon} />
                  <h2>Détails du Certificat</h2>
                </div>
                <button className={styles.closeBtn} onClick={() => setSelectedDiploma(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalBanner}>
                  <span className={`${styles.statusBadge} ${styles[visuel.classe]}`}>{visuel.label}</span>
                  <p className={styles.certIdText}>{selectedDiploma.numero_unique}</p>
                </div>

                <div className={styles.detailSection}>
                  <h3>{selectedDiploma.type_document}{selectedDiploma.filiere ? ` — ${selectedDiploma.filiere}` : ''}</h3>
                  <p className={styles.institutionDetail}>
                    <Building2 size={14} /> {selectedDiploma.universite}
                  </p>
                  <p className={styles.dateDetail}>
                    <Calendar size={14} /> Émis le : {fmtDate(selectedDiploma.date_emission) ?? '—'}
                  </p>
                </div>

                <div className={styles.proofBox}>
                  <h4>Preuve cryptographique</h4>
                  {selectedDiploma.hash_sha256 ? (
                    <>
                      <div className={styles.hashDetailRow}>
                        <span className={styles.fieldLabel}>Hash SHA-256 du document :</span>
                        <p className={styles.fullHashText}>{selectedDiploma.hash_sha256}</p>
                      </div>
                      {selectedDiploma.transaction_hash && (
                        <div className={styles.hashDetailRow}>
                          <span className={styles.fieldLabel}>Transaction ({LABELS_RESEAU[selectedDiploma.reseau] ?? selectedDiploma.reseau}) :</span>
                          <p className={styles.fullHashText}>{selectedDiploma.transaction_hash}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className={styles.fieldLabel}>Ce document n'est pas encore ancré sur la blockchain.</p>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                {selectedDiploma.transaction_hash && EXPLORATEUR_URL[selectedDiploma.reseau] && (
                  <a
                    href={`${EXPLORATEUR_URL[selectedDiploma.reseau]}${selectedDiploma.transaction_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.modalVerifyBtn}
                  >
                    <ExternalLink size={14} /> Vérifier sur l'explorateur
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
