import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Eye, Download, X, Loader2, AlertTriangle, FileX, FileText, FileDown } from 'lucide-react';
import { listerDocuments, getUrlPdfPresignee, exporterDocumentsCsv } from '../../../core/documents/documents.api';
import { listerDocumentsAdmin } from '../../../core/admin/admin.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { listerMentions } from '../../../core/mentions/mentions.api';
import { rechercherEtudiants, getEtudiant } from '../../../core/etudiants/etudiants.api';
import { getUniversite } from '../../../core/universites/universites.api';
import { ApiError } from '../../../core/api/client';
import { lirePreferences } from '../../../core/preferences/preferences';
import Pagination from '../Pagination/Pagination';
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

const LABEL_RESULTAT_MATIERE = { valide: 'Validé', ajourne: 'Ajourné', absent: 'Absent', dispense: 'Dispensé' };
function libelleResultatMatiere(valeur) {
  return LABEL_RESULTAT_MATIERE[valeur] ?? valeur;
}

export default function ListeDocuments({ admin = false }) {
  const location = useLocation();
  const etudiantInitial = location.state?.etudiantFiltre ?? null;
  const [densite] = useState(() => lirePreferences().densiteRegistre);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typesDocument, setTypesDocument] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [etudiantsCache, setEtudiantsCache] = useState({});
  const [universitesCache, setUniversitesCache] = useState({});

  // Filtres
  const [statutFiltre, setStatutFiltre] = useState('');
  const [typeFiltre, setTypeFiltre] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [etudiantFiltre, setEtudiantFiltre] = useState(etudiantInitial);
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
        const parametres = {
          statut: statutFiltre || undefined,
          typeDocumentId: typeFiltre || undefined,
          etudiantId: etudiantFiltre?.id,
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
          page,
          limit,
        };
        const res = admin ? await listerDocumentsAdmin(parametres) : await listerDocuments(parametres);
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

        // Mode admin : resout aussi les universites (documents de toutes les universites).
        if (admin) {
          const univIdsManquants = [...new Set((res.items ?? []).map((d) => d.universite_id))]
            .filter((id) => id && !universitesCache[id]);
          if (univIdsManquants.length > 0) {
            const resultatsUniv = await Promise.all(
              univIdsManquants.map((id) => getUniversite(id).catch(() => null)),
            );
            if (annule) return;
            setUniversitesCache((prev) => {
              const next = { ...prev };
              resultatsUniv.forEach((u) => { if (u) next[u.id] = u; });
              return next;
            });
          }
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
  const nomUniversite = (id) => universitesCache[id]?.nom ?? '…';

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

  const [exportEnCours, setExportEnCours] = useState(false);
  const exporterCsv = async () => {
    setExportEnCours(true);
    try {
      await exporterDocumentsCsv({
        statut: statutFiltre || undefined,
        typeDocumentId: typeFiltre || undefined,
        etudiantId: etudiantFiltre?.id,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export impossible.");
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>{admin ? 'Documents — toutes universités' : 'Registre des documents'}</div>
          <div className={styles.headerActions}>
            <span className={styles.totalCount}>{total} document{total !== 1 ? 's' : ''}</span>
            <button type="button" className={styles.exportBtn} onClick={exporterCsv} disabled={exportEnCours}>
              <FileDown size={14} /> {exportEnCours ? 'Export…' : 'Exporter CSV'}
            </button>
          </div>
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
          <table className={`${styles.table} ${densite === 'compact' ? styles.tableCompact : ''}`}>
            <thead>
              <tr>
                <th>Numéro unique</th>
                <th>Étudiant</th>
                {admin && <th>Établissement</th>}
                <th>Type de diplôme</th>
                <th>Filière</th>
                <th>Date d'émission</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={admin ? 8 : 7} className={styles.loadingCell}><Loader2 size={18} className={styles.spinnerIcon} /> Chargement...</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={admin ? 8 : 7} className={styles.emptyCell}>
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
                  {admin && <td>{nomUniversite(doc.universite_id)}</td>}
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

        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} itemLabel="document" />
      </div>

      {documentDetail && (
        <div className={styles.modalOverlay} onClick={() => setDocumentDetail(null)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.headerIcon}><FileText size={20} /></span>
              <div className={styles.headerInfo}>
                <h3>{nomType(documentDetail.type_document_id)}</h3>
                <span className={styles.mono}>{documentDetail.numero_unique}</span>
              </div>
              <span className={`${styles.badge} ${styles[classeStatut(documentDetail.statut)]}`}>
                {libelleStatut(documentDetail.statut)}
              </span>
              <button className={styles.closeBtn} onClick={() => setDocumentDetail(null)}><X size={18} /></button>
            </div>

            <div className={styles.modalBody}>
              <section>
                <h4>Étudiant</h4>
                <div className={styles.champsGrid}>
                  <div className={styles.champ}>
                    <span className={styles.champLabel}>Nom</span>
                    <span className={styles.champValeur}>{nomEtudiant(documentDetail.etudiant_id)}</span>
                  </div>
                  <div className={styles.champ}>
                    <span className={styles.champLabel}>Matricule</span>
                    <span className={styles.champValeur}>{matriculeEtudiant(documentDetail.etudiant_id) || '—'}</span>
                  </div>
                  {admin && (
                    <div className={styles.champ}>
                      <span className={styles.champLabel}>Établissement</span>
                      <span className={styles.champValeur}>{nomUniversite(documentDetail.universite_id)}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h4>Diplôme</h4>
                <div className={styles.champsGrid}>
                  <div className={styles.champ}>
                    <span className={styles.champLabel}>Filière</span>
                    <span className={styles.champValeur}>{documentDetail.filiere || '—'}</span>
                  </div>
                  <div className={styles.champ}>
                    <span className={styles.champLabel}>Mention</span>
                    <span className={styles.champValeur}>{mentions.find((m) => m.id === documentDetail.mention_id)?.nom ?? '—'}</span>
                  </div>
                  <div className={styles.champ}>
                    <span className={styles.champLabel}>Date d'émission</span>
                    <span className={styles.champValeur}>{documentDetail.date_emission ? new Date(documentDetail.date_emission).toLocaleDateString('fr-FR') : '—'}</span>
                  </div>
                  <div className={styles.champ}>
                    <span className={styles.champLabel}>Année académique</span>
                    <span className={styles.champValeur}>{documentDetail.annee_academique || '—'}</span>
                  </div>
                </div>
              </section>

              {documentDetail.matieres_document?.length > 0 && (
                <section>
                  <h4>Relevé des matières</h4>
                  <div className={styles.matieresList}>
                    {documentDetail.matieres_document.map((m) => (
                      <div className={styles.matiereRow} key={m.id}>
                        <span className={styles.champValeur}>{m.nom_matiere}</span>
                        <span className={styles.matiereNote}>
                          {m.note !== null ? `${m.note}/${m.note_max}` : libelleResultatMatiere(m.resultat)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4>Intégrité &amp; blockchain</h4>
                <div className={styles.codeBlock}>
                  <span className={styles.champLabel}>Hash SHA-256</span>
                  <span className={styles.codeValue}>{documentDetail.hash_sha256 ?? '—'}</span>
                </div>
                <div className={styles.codeBlock}>
                  <span className={styles.champLabel}>Ancrage blockchain</span>
                  {documentDetail.transaction_hash
                    ? <span className={styles.codeValue}>{documentDetail.transaction_hash}</span>
                    : <span className={styles.codeValueMuted}>Pas encore ancré</span>}
                </div>
              </section>
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
