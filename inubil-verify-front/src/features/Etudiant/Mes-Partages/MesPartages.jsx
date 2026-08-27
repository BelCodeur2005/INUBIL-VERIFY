import { useEffect, useState } from 'react';
import {
  Share2,
  Link2,
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  Clock,
  ListChecks,
  Calendar,
  X,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { listerMesPartages, creerPartage, revoquerPartage, listerMesDocuments } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import styles from './MesPartages.module.css';

const URL_PARTAGE_BASE = 'https://verify.inubil.com/partages/';

const DUREES = [
  { valeur: '7',         label: '7 jours' },
  { valeur: '30',        label: '30 jours (par défaut)' },
  { valeur: '90',        label: '90 jours' },
  { valeur: '365',       label: '1 an' },
  { valeur: 'permanent', label: 'Permanent (sans expiration)' },
];

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MesPartages() {
  const [partages, setPartages] = useState([]);
  const [documentsActifs, setDocumentsActifs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [revocationId, setRevocationId] = useState(null);

  const [drawerOuvert, setDrawerOuvert] = useState(false);
  const [formulaire, setFormulaire] = useState({ document_id: '', email_destinataire: '', duree: '30' });
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [creationErreur, setCreationErreur] = useState(null);

  useEffect(() => {
    (async () => {
      setChargement(true);
      setErreur(null);
      try {
        const [reponsePartages, reponseDocs] = await Promise.all([
          listerMesPartages(),
          listerMesDocuments({ statut: 'actif', limit: 100 }),
        ]);
        setPartages(reponsePartages);
        setDocumentsActifs(reponseDocs.data);
      } catch (err) {
        setErreur(err instanceof ApiError ? err.message : 'Impossible de charger vos partages');
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const handleCopyLink = (id, token) => {
    navigator.clipboard.writeText(`${URL_PARTAGE_BASE}${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoquerPartage = async (id) => {
    setRevocationId(id);
    try {
      await revoquerPartage(id);
      setPartages((prev) => prev.map((p) => (p.id === id ? { ...p, statut: 'revoque' } : p)));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : 'Révocation impossible.');
    } finally {
      setRevocationId(null);
    }
  };

  const ouvrirDrawer = () => {
    setCreationErreur(null);
    setFormulaire({ document_id: documentsActifs[0]?.id ?? '', email_destinataire: '', duree: '30' });
    setDrawerOuvert(true);
  };

  const handleCreerPartage = async (e) => {
    e.preventDefault();
    if (!formulaire.document_id) return;

    setCreationEnCours(true);
    setCreationErreur(null);
    try {
      const dto = { document_id: formulaire.document_id };
      if (formulaire.email_destinataire) dto.email_destinataire = formulaire.email_destinataire;
      if (formulaire.duree === 'permanent') {
        dto.permanent = true;
      } else {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + Number(formulaire.duree));
        dto.date_expiration = expiration.toISOString();
      }

      const cree = await creerPartage(dto);
      setPartages((prev) => [cree, ...prev]);
      setDrawerOuvert(false);
    } catch (err) {
      setCreationErreur(err instanceof ApiError ? err.message : 'Création du lien impossible.');
    } finally {
      setCreationEnCours(false);
    }
  };

  const liensActifs = partages.filter((p) => p.statut === 'actif').length;
  const totalConsultations = partages.reduce((acc, p) => acc + (p.nb_consultations ?? 0), 0);

  return (
    <div className={styles.container}>
      {/* Entête */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Share2 className={styles.titleIcon} size={28} />
            Mes Partages & Liens de Vérification
          </h1>
          <p className={styles.subtitle}>
            Gérez les accès sécurisés que vous avez générés pour les recruteurs et institutions.
          </p>
        </div>
        <button className={styles.createBtn} onClick={ouvrirDrawer} disabled={documentsActifs.length === 0}>
          <Plus size={18} />
          Nouveau Lien de Partage
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.blueIcon}`}><Link2 size={20} /></div>
          <div>
            <span className={styles.statNumber}>{liensActifs}</span>
            <span className={styles.statLabel}>Liens Actifs</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.greenIcon}`}><Eye size={20} /></div>
          <div>
            <span className={styles.statNumber}>{totalConsultations}</span>
            <span className={styles.statLabel}>Consultations Totales</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.iconBox} ${styles.purpleIcon}`}><ListChecks size={20} /></div>
          <div>
            <span className={styles.statNumber}>{partages.length}</span>
            <span className={styles.statLabel}>Liens Créés au Total</span>
          </div>
        </div>
      </div>

      {/* Liste des Partages */}
      <div className={styles.sharesListSection}>
        <h2 className={styles.sectionTitle}>Historique des accès générés</h2>

        {chargement && (
          <div className={styles.etatVide}>
            <Loader2 size={22} className={styles.spin} />
            <p>Chargement de vos partages...</p>
          </div>
        )}

        {!chargement && erreur && (
          <div className={styles.etatVide}>
            <AlertTriangle size={22} />
            <p>{erreur}</p>
          </div>
        )}

        {!chargement && !erreur && partages.length === 0 && (
          <div className={styles.etatVide}>
            <Share2 size={22} />
            <p>Vous n'avez encore créé aucun lien de partage.</p>
          </div>
        )}

        {!chargement && !erreur && partages.length > 0 && (
          <div className={styles.sharesGrid}>
            {partages.map((share) => {
              const estActif = share.statut === 'actif';
              return (
                <div key={share.id} className={styles.shareCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderInfo}>
                      <h3 className={styles.shareTitle}>{share.document_titre}</h3>
                    </div>
                    <span className={`${styles.statusBadge} ${estActif ? styles.statusActive : styles.statusExpired}`}>
                      {share.statut === 'actif' ? 'Actif' : share.statut === 'revoque' ? 'Révoqué' : 'Expiré'}
                    </span>
                  </div>

                  <div className={styles.linkBox}>
                    <code className={styles.urlText}>{URL_PARTAGE_BASE}{share.token_acces}</code>
                    <button
                      className={styles.copyBtn}
                      onClick={() => handleCopyLink(share.id, share.token_acces)}
                      title="Copier le lien"
                      disabled={!estActif}
                    >
                      {copiedId === share.id ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    </button>
                  </div>

                  <div className={styles.cardMeta}>
                    <div className={styles.metaItem}><Calendar size={14} /><span>Créé le : {fmtDate(share.created_at)}</span></div>
                    <div className={styles.metaItem}><Clock size={14} /><span>{share.date_expiration ? `Expire le ${fmtDate(share.date_expiration)}` : 'Permanent'}</span></div>
                    <div className={styles.metaItem}><Eye size={14} /><span>{share.nb_consultations} vues</span></div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.recipient}>
                      Destinataire : <strong>{share.email_destinataire ?? share.universite_destinataire ?? 'Non renseigné'}</strong>
                    </span>
                    {estActif && (
                      <button
                        className={styles.revokeBtn}
                        onClick={() => handleRevoquerPartage(share.id)}
                        disabled={revocationId === share.id}
                      >
                        <Trash2 size={14} /> {revocationId === share.id ? 'Révocation...' : 'Révoquer'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER DE CRÉATION */}
      {drawerOuvert && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOuvert(false)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Générer un lien de vérification</h3>
              <button className={styles.closeModalBtn} onClick={() => setDrawerOuvert(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreerPartage} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="partage-document">Diplôme concerné</label>
                <select
                  id="partage-document"
                  value={formulaire.document_id}
                  onChange={(e) => setFormulaire({ ...formulaire, document_id: e.target.value })}
                  required
                >
                  {documentsActifs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.type_document} — {doc.numero_unique}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="partage-email">Email du destinataire (optionnel)</label>
                <input
                  id="partage-email"
                  type="email"
                  placeholder="Ex: rh@entreprise.cm"
                  value={formulaire.email_destinataire}
                  onChange={(e) => setFormulaire({ ...formulaire, email_destinataire: e.target.value })}
                />
                <span className={styles.formHint}>Si renseigné, un email avec le lien lui est envoyé automatiquement.</span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="partage-duree">Durée de validité du lien</label>
                <select
                  id="partage-duree"
                  value={formulaire.duree}
                  onChange={(e) => setFormulaire({ ...formulaire, duree: e.target.value })}
                >
                  {DUREES.map((d) => (
                    <option key={d.valeur} value={d.valeur}>{d.label}</option>
                  ))}
                </select>
              </div>

              {creationErreur && <p className={styles.formError}>{creationErreur}</p>}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setDrawerOuvert(false)}>
                  Annuler
                </button>
                <button type="submit" className={styles.submitBtn} disabled={creationEnCours || !formulaire.document_id}>
                  {creationEnCours ? <Loader2 size={16} className={styles.spin} /> : 'Générer le lien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
