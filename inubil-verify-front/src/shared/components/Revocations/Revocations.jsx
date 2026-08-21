import { useEffect, useRef, useState } from 'react';
import { Search, ShieldOff, X, Loader2, AlertTriangle, ShieldAlert, FileCheck } from 'lucide-react';
import { listerDocuments, getUrlPdfPresignee, revoquerDocument } from '../../../core/documents/documents.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { rechercherEtudiants, getEtudiant } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import styles from './Revocations.module.css';

// Revocation reelle (docs/ROLES_ET_PAGES.md §D item 21, POST /documents/:id/revoquer).
// Action irreversible et a fort impact (le document devient invalide sur la page de
// verification publique) : contrairement a la file de validation, elle merite une
// friction supplementaire avant confirmation plutot qu'un simple clic — d'ou la
// confirmation "tape le numero du document" dans la modale, en plus de la raison
// obligatoire (10 caracteres min., deja exigee par le backend).

export default function Revocations() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typesDocument, setTypesDocument] = useState([]);
  const [etudiantsCache, setEtudiantsCache] = useState({});

  const [rechercheEtudiant, setRechercheEtudiant] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [etudiantFiltre, setEtudiantFiltre] = useState(null);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const rechercheWrapperRef = useRef(null);

  const [documentARevoquer, setDocumentARevoquer] = useState(null);
  const [messageSucces, setMessageSucces] = useState(null);

  useEffect(() => {
    listerTypesDocument({}).then(setTypesDocument).catch(() => {});
  }, []);

  useEffect(() => {
    if (!rechercheOuverte) return;
    const handleClickOutside = (e) => {
      if (rechercheWrapperRef.current?.contains(e.target)) return;
      setRechercheOuverte(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [rechercheOuverte]);

  useEffect(() => {
    if (!rechercheOuverte) return;
    const q = rechercheEtudiant.trim();
    const timeout = setTimeout(async () => {
      if (q.length < 2) {
        setResultatsRecherche([]);
        return;
      }
      try {
        const res = await rechercherEtudiants(q);
        setResultatsRecherche(res.data ?? []);
      } catch {
        setResultatsRecherche([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [rechercheEtudiant, rechercheOuverte]);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await listerDocuments({ statut: 'actif', etudiantId: etudiantFiltre?.id, page, limit });
        if (annule) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);

        const idsManquants = [...new Set((res.items ?? []).map((d) => d.etudiant_id))]
          .filter((id) => id && !etudiantsCache[id]);
        if (idsManquants.length > 0) {
          const resultats = await Promise.all(idsManquants.map((id) => getEtudiant(id).catch(() => null)));
          if (annule) return;
          setEtudiantsCache((prev) => {
            const next = { ...prev };
            resultats.forEach((e) => { if (e) next[e.id] = e; });
            return next;
          });
        }
      } catch (err) {
        if (annule) return;
        setError(err instanceof ApiError ? err.message : 'Impossible de charger les documents actifs.');
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etudiantFiltre, page]);

  const nomType = (id) => typesDocument.find((t) => t.id === id)?.nom ?? '—';
  const nomEtudiant = (id) => {
    const e = etudiantsCache[id];
    return e ? `${e.prenom} ${e.nom}` : '…';
  };
  const matriculeEtudiant = (id) => etudiantsCache[id]?.numero_etudiant ?? '';
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const voirLePdf = async (doc) => {
    try {
      const { url } = await getUrlPdfPresignee(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible d\'ouvrir le PDF.');
    }
  };

  const apresRevocation = (doc) => {
    setItems((prev) => prev.filter((d) => d.id !== doc.id));
    setTotal((t) => t - 1);
    setDocumentARevoquer(null);
    setMessageSucces(`${doc.numero_unique} révoqué.`);
    setTimeout(() => setMessageSucces(null), 4000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Révocations</h1>
        <p className={styles.subtitle}>Documents actifs de l'établissement. Révoquer un diplôme est irréversible et le rend invalide sur la page de vérification publique.</p>
      </div>

      {messageSucces && <div className={styles.successBanner}><FileCheck size={16} /> {messageSucces}</div>}
      {error && <p className={styles.errorText}><AlertTriangle size={14} /> {error}</p>}

      <div className={styles.tableCard}>
        <div className={styles.searchBar} ref={rechercheWrapperRef}>
          <div className={styles.searchInputWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher un étudiant (nom, prénom, matricule)..."
              value={etudiantFiltre ? `${etudiantFiltre.prenom} ${etudiantFiltre.nom}` : rechercheEtudiant}
              onFocus={() => setRechercheOuverte(true)}
              onChange={(e) => { setEtudiantFiltre(null); setRechercheEtudiant(e.target.value); setRechercheOuverte(true); setPage(1); }}
            />
            {etudiantFiltre && (
              <button type="button" className={styles.clearInlineBtn} onClick={() => { setEtudiantFiltre(null); setRechercheEtudiant(''); setPage(1); }}>
                <X size={14} />
              </button>
            )}
          </div>
          {rechercheOuverte && !etudiantFiltre && resultatsRecherche.length > 0 && (
            <div className={styles.searchDropdown}>
              {resultatsRecherche.map((e) => (
                <button type="button" key={e.id} className={styles.searchResultItem} onClick={() => { setEtudiantFiltre(e); setRechercheOuverte(false); setPage(1); }}>
                  <strong>{e.prenom} {e.nom}</strong>
                  <span>{e.numero_etudiant}</span>
                </button>
              ))}
            </div>
          )}
          <span className={styles.totalCount}>{total} document{total !== 1 ? 's' : ''} actif{total !== 1 ? 's' : ''}</span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Numéro unique</th>
                <th>Étudiant</th>
                <th>Type de diplôme</th>
                <th>Date d'émission</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className={styles.loadingCell}><Loader2 size={18} className={styles.spinnerIcon} /> Chargement...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} className={styles.emptyCell}>Aucun document actif {etudiantFiltre ? 'pour cet étudiant' : ''}.</td></tr>
              )}
              {!loading && items.map((doc) => (
                <tr key={doc.id}>
                  <td className={styles.mono}>{doc.numero_unique}</td>
                  <td className={styles.bold}>
                    {nomEtudiant(doc.etudiant_id)}
                    {matriculeEtudiant(doc.etudiant_id) && <span className={styles.subText}>{matriculeEtudiant(doc.etudiant_id)}</span>}
                  </td>
                  <td>{nomType(doc.type_document_id)}</td>
                  <td className={styles.dateCell}>{doc.date_emission ? new Date(doc.date_emission).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button type="button" className={styles.linkBtn} onClick={() => voirLePdf(doc)}>Voir le PDF</button>
                      <button type="button" className={styles.revokeBtn} onClick={() => setDocumentARevoquer(doc)}>
                        <ShieldOff size={14} /> Révoquer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.paginInfo}>{total === 0 ? 'Aucun résultat' : `Page ${page} sur ${totalPages}`}</span>
          <div className={styles.paginBtns}>
            <button className={styles.paginBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            <button className={styles.paginBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {documentARevoquer && (
        <ModaleConfirmationRevocation
          document={documentARevoquer}
          nomEtudiant={nomEtudiant(documentARevoquer.etudiant_id)}
          nomType={nomType(documentARevoquer.type_document_id)}
          onClose={() => setDocumentARevoquer(null)}
          onRevoque={() => apresRevocation(documentARevoquer)}
          onErreur={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}

function ModaleConfirmationRevocation({ document: doc, nomEtudiant, nomType, onClose, onRevoque, onErreur }) {
  const [raison, setRaison] = useState('');
  const [confirmationTexte, setConfirmationTexte] = useState('');
  const [enCours, setEnCours] = useState(false);

  const raisonValide = raison.trim().length >= 10;
  const confirmationValide = confirmationTexte.trim() === doc.numero_unique;
  const peutConfirmer = raisonValide && confirmationValide && !enCours;

  const confirmer = async () => {
    if (!peutConfirmer) return;
    setEnCours(true);
    try {
      await revoquerDocument(doc.id, raison.trim());
      onRevoque();
    } catch (err) {
      onErreur(err instanceof ApiError ? err.message : 'Révocation impossible.');
      onClose();
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon}><ShieldAlert size={20} /></div>
          <div>
            <h3>Révoquer {doc.numero_unique} ?</h3>
            <p>{nomEtudiant} — {nomType}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.warningBanner}>
            Cette action est irréversible. Le diplôme deviendra immédiatement invalide sur la page de vérification publique. Il ne pourra pas être réactivé — seule l'émission d'un nouveau document est possible.
          </div>

          <div className={styles.formGroup}>
            <label>Raison de la révocation (visible dans l'historique, 10 caractères min.)</label>
            <textarea
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="ex : Erreur sur le nom de l'étudiant — document réémis sous un nouveau numéro."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tapez <strong className={styles.mono}>{doc.numero_unique}</strong> pour confirmer</label>
            <input
              type="text"
              value={confirmationTexte}
              onChange={(e) => setConfirmationTexte(e.target.value)}
              placeholder={doc.numero_unique}
              className={styles.confirmInput}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button type="button" className={styles.confirmRevokeBtn} disabled={!peutConfirmer} onClick={confirmer}>
            {enCours ? <Loader2 size={15} className={styles.spinnerIcon} /> : <ShieldOff size={15} />}
            Révoquer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}
