import { useEffect, useRef, useState } from 'react';
import { Search, Eye, Download, X, Loader2, AlertTriangle, FileX } from 'lucide-react';
import { listerDocuments, getUrlPdfPresignee } from '../../../core/documents/documents.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { listerMentions } from '../../../core/mentions/mentions.api';
import { rechercherEtudiants, getEtudiant } from '../../../core/etudiants/etudiants.api';
import { ApiError } from '../../../core/api/client';
import styles from './ListeDocuments.module.css';

// Liste reelle des documents (docs/ROLES_ET_PAGES.md §D item 18, GET /documents).
// Page partagee agent_saisie / directeur_pedagogique / responsable_universite —
// utilisee a la fois par RegistreLocal (/universite/registre) et l'onglet
// "Liste des Documents" de DashboardDirecteur, pour eviter la duplication qui
// existait entre RegistreLocal.jsx et DashboardEtablissement.jsx (deux mocks
// identiques jamais synchronises).
//
// GET /documents ne renvoie que des IDs bruts (etudiant_id, type_document_id,
// mention_id) — aucune jointure cote backend. Les noms sont resolus ici :
// referentiels (petit catalogue, un seul fetch) + un lookup etudiant par ID
// pour chaque etudiant unique de la page courante (au plus `limit` requetes,
// en parallele).

const STATUTS = [
  { valeur: 'brouillon', label: 'Brouillon', classe: 'statutBrouillon' },
  { valeur: 'en_validation', label: 'En validation', classe: 'statutEnValidation' },
  { valeur: 'actif', label: 'Actif', classe: 'statutActif' },
  { valeur: 'revoque', label: 'Révoqué', classe: 'statutRevoque' },
  { valeur: 'rejete', label: 'Rejeté', classe: 'statutRejete' },
  { valeur: 'expire', label: 'Expiré', classe: 'statutExpire' },
];

function libelleStatut(valeur) {
  return STATUTS.find((s) => s.valeur === valeur)?.label ?? valeur;
}

function classeStatut(valeur) {
  return STATUTS.find((s) => s.valeur === valeur)?.classe ?? 'statutBrouillon';
}

export default function ListeDocuments() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typesDocument, setTypesDocument] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [etudiantsCache, setEtudiantsCache] = useState({});

  // Filtres
  const [statutFiltre, setStatutFiltre] = useState('');
  const [typeFiltre, setTypeFiltre] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [etudiantFiltre, setEtudiantFiltre] = useState(null);
  const [rechercheEtudiant, setRechercheEtudiant] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState([]);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  const [documentDetail, setDocumentDetail] = useState(null);
  const [telechargement, setTelechargement] = useState(null);
  const rechercheWrapperRef = useRef(null);

  useEffect(() => {
    if (!rechercheOuverte) return;
    const handleClickOutside = (e) => {
      if (rechercheWrapperRef.current?.contains(e.target)) return;
      setRechercheOuverte(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [rechercheOuverte]);

  // Référentiels — un seul fetch, réutilisé pour résoudre les libellés.
  useEffect(() => {
    listerTypesDocument({}).then(setTypesDocument).catch(() => {});
    listerMentions({}).then(setMentions).catch(() => {});
  }, []);

  // Recherche étudiant (filtre) — débattue.
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

  // Chargement de la page de documents courante.
  useEffect(() => {
    let annule = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listerDocuments({
          statut: statutFiltre || undefined,
          typeDocumentId: typeFiltre || undefined,
          etudiantId: etudiantFiltre?.id,
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
          page,
          limit,
        });
        if (annule) return;
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);

        // Résout les étudiants pas encore en cache pour cette page.
        const idsManquants = [...new Set((res.items ?? []).map((d) => d.etudiant_id))]
          .filter((id) => id && !etudiantsCache[id]);
        if (idsManquants.length > 0) {
          const resultats = await Promise.all(
            idsManquants.map((id) => getEtudiant(id).catch(() => null)),
          );
          if (annule) return;
          setEtudiantsCache((prev) => {
            const next = { ...prev };
            resultats.forEach((e) => { if (e) next[e.id] = e; });
            return next;
          });
        }
      } catch (err) {
        if (annule) return;
        setError(err instanceof ApiError ? err.message : 'Impossible de charger les documents.');
      } finally {
        if (!annule) setLoading(false);
      }
    })();
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutFiltre, typeFiltre, etudiantFiltre, dateDebut, dateFin, page]);

  const reinitialiserFiltres = () => {
    setStatutFiltre('');
    setTypeFiltre('');
    setDateDebut('');
    setDateFin('');
    setEtudiantFiltre(null);
    setRechercheEtudiant('');
    setPage(1);
  };

  const filtresActifs = Boolean(statutFiltre || typeFiltre || dateDebut || dateFin || etudiantFiltre);

  const nomType = (id) => typesDocument.find((t) => t.id === id)?.nom ?? '—';
  const nomEtudiant = (id) => {
    const e = etudiantsCache[id];
    return e ? `${e.prenom} ${e.nom}` : '…';
  };
  const matriculeEtudiant = (id) => etudiantsCache[id]?.numero_etudiant ?? '';

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const telechargerPdf = async (doc) => {
    setTelechargement(doc.id);
    try {
      const { url } = await getUrlPdfPresignee(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Téléchargement impossible.');
    } finally {
      setTelechargement(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Registre des documents</div>
          <span className={styles.totalCount}>{total} document{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Filtres */}
        <div className={styles.filtersBar}>
          <div className={styles.filterGroup}>
            <label>Statut</label>
            <select value={statutFiltre} onChange={(e) => { setStatutFiltre(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              {STATUTS.map((s) => <option key={s.valeur} value={s.valeur}>{s.label}</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Type de diplôme</label>
            <select value={typeFiltre} onChange={(e) => { setTypeFiltre(e.target.value); setPage(1); }}>
              <option value="">Tous</option>
              {typesDocument.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Du</label>
            <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(1); }} />
          </div>
          <div className={styles.filterGroup}>
            <label>Au</label>
            <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(1); }} />
          </div>
          <div className={`${styles.filterGroup} ${styles.filterGroupSearch}`} ref={rechercheWrapperRef}>
            <label>Étudiant</label>
            <div className={styles.searchInputWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Nom, prénom, matricule..."
                value={etudiantFiltre ? `${etudiantFiltre.prenom} ${etudiantFiltre.nom}` : rechercheEtudiant}
                onFocus={() => setRechercheOuverte(true)}
                onChange={(e) => { setEtudiantFiltre(null); setRechercheEtudiant(e.target.value); setRechercheOuverte(true); }}
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
                  <button
                    type="button"
                    key={e.id}
                    className={styles.searchResultItem}
                    onClick={() => { setEtudiantFiltre(e); setRechercheOuverte(false); setPage(1); }}
                  >
                    <strong>{e.prenom} {e.nom}</strong>
                    <span>{e.numero_etudiant}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {filtresActifs && (
            <button type="button" className={styles.resetBtn} onClick={reinitialiserFiltres}>
              <X size={14} /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {error && <p className={styles.errorText}><AlertTriangle size={14} /> {error}</p>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Numéro unique</th>
                <th>Étudiant</th>
                <th>Type de diplôme</th>
                <th>Filière</th>
                <th>Date d'émission</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className={styles.loadingCell}><Loader2 size={18} className={styles.spinnerIcon} /> Chargement...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    <FileX size={22} />
                    {filtresActifs ? 'Aucun document ne correspond à ces filtres.' : 'Aucun document émis pour le moment.'}
                  </td>
                </tr>
              )}
              {!loading && items.map((doc) => (
                <tr key={doc.id}>
                  <td className={styles.mono}>{doc.numero_unique}</td>
                  <td className={styles.bold}>
                    {nomEtudiant(doc.etudiant_id)}
                    {matriculeEtudiant(doc.etudiant_id) && <span className={styles.subText}>{matriculeEtudiant(doc.etudiant_id)}</span>}
                  </td>
                  <td>{nomType(doc.type_document_id)}</td>
                  <td>{doc.filiere || '—'}</td>
                  <td className={styles.dateCell}>{doc.date_emission ? new Date(doc.date_emission).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[classeStatut(doc.statut)]}`}>{libelleStatut(doc.statut)}</span>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button type="button" className={styles.iconBtn} title="Voir le détail" onClick={() => setDocumentDetail(doc)}>
                        <Eye size={16} />
                      </button>
                      {doc.pdf_url && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          title="Télécharger le PDF"
                          disabled={telechargement === doc.id}
                          onClick={() => telechargerPdf(doc)}
                        >
                          {telechargement === doc.id ? <Loader2 size={16} className={styles.spinnerIcon} /> : <Download size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span className={styles.paginInfo}>
            {total === 0 ? 'Aucun résultat' : `Page ${page} sur ${totalPages} — ${total} document${total !== 1 ? 's' : ''}`}
          </span>
          <div className={styles.paginBtns}>
            <button className={styles.paginBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
            <button className={styles.paginBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {documentDetail && (
        <div className={styles.modalOverlay} onClick={() => setDocumentDetail(null)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{documentDetail.numero_unique}</h3>
              <button className={styles.closeBtn} onClick={() => setDocumentDetail(null)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}><span>Étudiant</span><strong>{nomEtudiant(documentDetail.etudiant_id)} — {matriculeEtudiant(documentDetail.etudiant_id)}</strong></div>
              <div className={styles.detailRow}><span>Type de diplôme</span><strong>{nomType(documentDetail.type_document_id)}</strong></div>
              <div className={styles.detailRow}><span>Filière</span><strong>{documentDetail.filiere || '—'}</strong></div>
              <div className={styles.detailRow}><span>Mention</span><strong>{mentions.find((m) => m.id === documentDetail.mention_id)?.nom ?? '—'}</strong></div>
              <div className={styles.detailRow}><span>Date d'émission</span><strong>{documentDetail.date_emission ? new Date(documentDetail.date_emission).toLocaleDateString('fr-FR') : '—'}</strong></div>
              <div className={styles.detailRow}><span>Année académique</span><strong>{documentDetail.annee_academique || '—'}</strong></div>
              <div className={styles.detailRow}><span>Statut</span><strong><span className={`${styles.badge} ${styles[classeStatut(documentDetail.statut)]}`}>{libelleStatut(documentDetail.statut)}</span></strong></div>
              <div className={styles.detailRow}><span>Hash SHA-256</span><strong className={styles.mono}>{documentDetail.hash_sha256 ?? '—'}</strong></div>
              <div className={styles.detailRow}><span>Ancrage blockchain</span><strong className={styles.mono}>{documentDetail.transaction_hash ?? 'Pas encore ancré'}</strong></div>
            </div>
            {documentDetail.pdf_url && (
              <div className={styles.modalFooter}>
                <button type="button" className={styles.primaryBtn} onClick={() => telechargerPdf(documentDetail)}>
                  <Download size={16} /> Télécharger le PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
