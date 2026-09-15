import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Eye, Pencil, Trash2, X, Loader2, AlertTriangle, UserX,
  FileText, Save, Cake, MapPin, Flag, Mail, Phone, GraduationCap, FileDown, Send,
} from 'lucide-react';
import {
  rechercherEtudiants, creerEtudiant, modifierEtudiant, supprimerEtudiant, exporterEtudiantsCsv,
  renvoyerInvitationEtudiant,
} from '../../../core/etudiants/etudiants.api';
import { listerDepartements } from '../../../core/departements/departements.api';
import { useAuth } from '../../../core/auth/useAuth';
import { ApiError } from '../../../core/api/client';
import Pagination from '../Pagination/Pagination';
import styles from './FicheEtudiant.module.css';

// Étudiants (docs/ROLES_ET_PAGES.md §D item 16, GET/POST/PATCH/DELETE /admin/etudiants).
// Page partagée agent_saisie / directeur_pedagogique / responsable_universite —
// tableau + filtres + tiroir de détail/édition, cohérent avec ListeDocuments/AdminInubil
// (remplace l'ancien pattern maître-détail, moins adapté une fois qu'on veut filtrer sur
// plusieurs critères et garder les mêmes colonnes visibles que le reste de l'admin).

const CHAMPS_VIDES = {
  numero_etudiant: '', nom: '', prenom: '', date_naissance: '',
  lieu_naissance: '', nationalite: '', email: '', telephone: '', annee_entree: '', departement_id: '',
};

const LIMIT = 20;

const PALETTE_AVATAR = ['#2b56cb', '#0f766e', '#9333ea', '#b45309', '#be123c', '#0369a1'];

function initiales(prenom, nom) {
  const a = (prenom || '').trim()[0] ?? '';
  const b = (nom || '').trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

function couleurAvatar(seed) {
  let hash = 0;
  for (const c of seed ?? '') hash = (hash * 31 + c.charCodeAt(0)) % 997;
  return PALETTE_AVATAR[Math.abs(hash) % PALETTE_AVATAR.length];
}

function mapVersForm(e) {
  return {
    numero_etudiant: e.numero_etudiant ?? '',
    nom: e.nom ?? '',
    prenom: e.prenom ?? '',
    date_naissance: e.date_naissance ? String(e.date_naissance).slice(0, 10) : '',
    lieu_naissance: e.lieu_naissance ?? '',
    nationalite: e.nationalite ?? '',
    email: e.email ?? '',
    telephone: e.telephone ?? '',
    annee_entree: e.annee_entree ?? '',
    departement_id: e.departement_id ?? '',
  };
}

function construirePayload(form) {
  const payload = {
    numero_etudiant: form.numero_etudiant.trim(),
    nom: form.nom.trim(),
    prenom: form.prenom.trim(),
  };
  if (form.date_naissance) payload.date_naissance = form.date_naissance;
  if (form.lieu_naissance.trim()) payload.lieu_naissance = form.lieu_naissance.trim();
  if (form.nationalite.trim()) payload.nationalite = form.nationalite.trim();
  if (form.email.trim()) payload.email = form.email.trim();
  if (form.telephone.trim()) payload.telephone = form.telephone.trim();
  if (form.annee_entree) payload.annee_entree = Number(form.annee_entree);
  if (form.departement_id) payload.departement_id = form.departement_id;
  return payload;
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR');
}

function Champ({ icon, label, value }) {
  return (
    <div className={styles.champ}>
      <span className={styles.champIcon}>{icon}</span>
      <div className={styles.champTexte}>
        <span className={styles.champLabel}>{label}</span>
        <strong className={styles.champValeur}>{value || '—'}</strong>
      </div>
    </div>
  );
}

export default function FicheEtudiant() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const universiteId = utilisateur?.universite?.id;
  // Chef de departement (compte scope a un ou plusieurs departements) : le choix est
  // restreint a ceux-ci (impose, non modifiable, si un seul). Scolarite (compte non
  // scope, liste vide) : peut choisir n'importe quel departement de l'universite.
  const acteurDepartements = utilisateur?.departements ?? [];

  const [departements, setDepartements] = useState([]);
  useEffect(() => {
    listerDepartements({ universiteId }).then(setDepartements).catch(() => {});
  }, [universiteId]);

  // Recherche initiale possible via ?q= (venant de la recherche globale de l'en-tête) —
  // dans ce cas, si la recherche ne remonte qu'un seul etudiant, on l'ouvre directement.
  const [searchParams] = useSearchParams();
  const requeteInitiale = searchParams.get('q') ?? '';
  const autoSelectionRef = useRef(Boolean(requeteInitiale));

  const [rechercheInput, setRechercheInput] = useState(requeteInitiale);
  const [recherche, setRecherche] = useState(requeteInitiale);
  const [departementFiltre, setDepartementFiltre] = useState('');
  const [anneeFiltre, setAnneeFiltre] = useState('');
  const [compteFiltre, setCompteFiltre] = useState('');
  const [documentsFiltre, setDocumentsFiltre] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingListe, setLoadingListe] = useState(true);
  const [erreurListe, setErreurListe] = useState(null);

  const [drawerOuvert, setDrawerOuvert] = useState(false);
  const [selectionne, setSelectionne] = useState(null);
  const [mode, setMode] = useState('vue'); // vue | edition | creation
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);
  const [matriculeDoublon, setMatriculeDoublon] = useState(null);

  // Verification en direct du matricule (au blur), en creation comme en modification —
  // numero_etudiant est unique en base, un doublon echouerait de toute facon a
  // l'enregistrement, autant prevenir tout de suite. En modification, exclut l'etudiant
  // en cours d'edition lui-meme (sinon il "matche" toujours son propre matricule).
  const verifierMatricule = async () => {
    const matricule = form.numero_etudiant.trim();
    if (!matricule) { setMatriculeDoublon(null); return; }
    try {
      const res = await rechercherEtudiants(matricule);
      const existant = (res.data ?? []).find((e) => e.numero_etudiant === matricule && e.id !== selectionne?.id);
      setMatriculeDoublon(existant ?? null);
    } catch {
      // non bloquant : un echec de cette verification ne doit jamais empecher la saisie
    }
  };

  const [confirmSuppression, setConfirmSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState(null);

  const [invitationEnCours, setInvitationEnCours] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState(null);
  const envoyerInvitation = async () => {
    setInvitationEnCours(true);
    setInvitationMessage(null);
    try {
      await renvoyerInvitationEtudiant(selectionne.id);
      setInvitationMessage({ type: 'succes', texte: "Lien d'activation envoyé." });
    } catch (err) {
      setInvitationMessage({
        type: 'erreur',
        texte: err instanceof ApiError ? err.message : "Impossible d'envoyer le lien d'activation.",
      });
    } finally {
      setInvitationEnCours(false);
    }
  };

  const filtresPourApi = () => ({
    departementId: departementFiltre || undefined,
    anneeEntree: anneeFiltre || undefined,
    aCompte: compteFiltre === '' ? undefined : compteFiltre === 'true',
    aDocuments: documentsFiltre === '' ? undefined : documentsFiltre === 'true',
  });

  const [exportEnCours, setExportEnCours] = useState(false);
  const exporterCsv = async () => {
    setExportEnCours(true);
    try {
      await exporterEtudiantsCsv(recherche || undefined, filtresPourApi());
    } catch (err) {
      setErreurListe(err instanceof ApiError ? err.message : 'Export impossible.');
    } finally {
      setExportEnCours(false);
    }
  };

  // Débounce de la recherche libre avant de déclencher la requête.
  useEffect(() => {
    const t = setTimeout(() => { setRecherche(rechercheInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [rechercheInput]);

  const filtresActifs = Boolean(recherche || departementFiltre || anneeFiltre || compteFiltre || documentsFiltre);
  const reinitialiserFiltres = () => {
    setRechercheInput('');
    setRecherche('');
    setDepartementFiltre('');
    setAnneeFiltre('');
    setCompteFiltre('');
    setDocumentsFiltre('');
    setPage(1);
  };

  // Vrai si la fiche en cours (edition ou creation) contient des changements non
  // enregistres — evite d'ecraser silencieusement une saisie en cours quand l'agent
  // ferme le tiroir ou clique sur un autre etudiant sans avoir clique "Enregistrer".
  const formModifie = () => {
    if (mode === 'edition') return JSON.stringify(form) !== JSON.stringify(mapVersForm(selectionne));
    if (mode === 'creation') {
      return Object.entries(form).some(([champ, valeur]) => champ !== 'departement_id' && String(valeur).trim() !== '');
    }
    return false;
  };

  const confirmerAbandon = () => {
    if (!drawerOuvert || !formModifie()) return true;
    return window.confirm('Des modifications non enregistrées seront perdues. Continuer ?');
  };

  const selectionner = (e) => {
    if (!confirmerAbandon()) return;
    setSelectionne(e);
    setForm(mapVersForm(e));
    setMode('vue');
    setErreurForm(null);
    setMatriculeDoublon(null);
    setInvitationMessage(null);
    setDrawerOuvert(true);
  };

  const fermerDrawer = () => {
    if (!confirmerAbandon()) return;
    setDrawerOuvert(false);
    setSelectionne(null);
    setErreurForm(null);
    setMatriculeDoublon(null);
  };

  useEffect(() => {
    let annule = false;
    (async () => {
      setLoadingListe(true);
      setErreurListe(null);
      try {
        const res = await rechercherEtudiants(recherche || undefined, { page, limit: LIMIT, ...filtresPourApi() });
        if (annule) return;
        setItems(res.data ?? []);
        setTotal(res.total ?? 0);
        if (autoSelectionRef.current) {
          autoSelectionRef.current = false;
          if (res.data?.length === 1) selectionner(res.data[0]);
        }
      } catch (err) {
        if (annule) return;
        setErreurListe(err instanceof ApiError ? err.message : 'Impossible de charger les étudiants.');
      } finally {
        if (!annule) setLoadingListe(false);
      }
    })();
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, page, departementFiltre, anneeFiltre, compteFiltre, documentsFiltre]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const demarrerCreation = () => {
    if (!confirmerAbandon()) return;
    setSelectionne(null);
    setForm({ ...CHAMPS_VIDES, departement_id: acteurDepartements.length === 1 ? acteurDepartements[0].id : '' });
    setErreurForm(null);
    setMatriculeDoublon(null);
    setMode('creation');
    setDrawerOuvert(true);
  };

  const demarrerEdition = () => {
    setForm(mapVersForm(selectionne));
    setErreurForm(null);
    setMatriculeDoublon(null);
    setMode('edition');
  };

  const annulerEdition = () => {
    if (selectionne) {
      setForm(mapVersForm(selectionne));
      setMode('vue');
    } else {
      setDrawerOuvert(false);
    }
    setErreurForm(null);
    setMatriculeDoublon(null);
  };

  const majChamp = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const soumettre = async (e) => {
    e.preventDefault();
    setEnregistrement(true);
    setErreurForm(null);
    try {
      const payload = construirePayload(form);
      if (mode === 'creation') {
        if (!universiteId) throw new Error("Impossible de déterminer votre établissement.");
        const cree = await creerEtudiant({ ...payload, universite_id: universiteId });
        setItems((prev) => [cree, ...prev]);
        setTotal((t) => t + 1);
        setSelectionne(cree);
        setForm(mapVersForm(cree));
        setMode('vue');
        setMatriculeDoublon(null);
      } else {
        const maj = await modifierEtudiant(selectionne.id, payload);
        setItems((prev) => prev.map((it) => (it.id === maj.id ? maj : it)));
        setSelectionne(maj);
        setForm(mapVersForm(maj));
        setMode('vue');
        setMatriculeDoublon(null);
      }
    } catch (err) {
      setErreurForm(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setEnregistrement(false);
    }
  };

  const confirmerSuppression = async () => {
    setSuppressionEnCours(true);
    setErreurSuppression(null);
    try {
      await supprimerEtudiant(selectionne.id);
      setItems((prev) => prev.filter((it) => it.id !== selectionne.id));
      setTotal((t) => Math.max(0, t - 1));
      setSelectionne(null);
      setDrawerOuvert(false);
      setConfirmSuppression(false);
    } catch (err) {
      setErreurSuppression(err instanceof ApiError ? err.message : 'Suppression impossible.');
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const voirDocuments = () => {
    navigate('/universite/registre', { state: { etudiantFiltre: selectionne } });
  };

  const listeDepartementsFiltre = acteurDepartements.length > 0 ? acteurDepartements : departements;

  const formulaire = (
    <form className={styles.form} onSubmit={soumettre}>
      {erreurForm && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurForm}</p>}
      <div className={styles.formGrid}>
        <label>Matricule
          <input
            value={form.numero_etudiant}
            onChange={(e) => { majChamp('numero_etudiant')(e); setMatriculeDoublon(null); }}
            onBlur={verifierMatricule}
            required
            minLength={3}
            maxLength={50}
          />
        </label>
        {matriculeDoublon && (
          <p className={styles.doublonWarning}>
            <AlertTriangle size={14} /> Ce matricule est déjà utilisé par {matriculeDoublon.prenom} {matriculeDoublon.nom}.
          </p>
        )}
        <label>Nom
          <input value={form.nom} onChange={majChamp('nom')} required minLength={2} maxLength={100} />
        </label>
        <label>Prénom
          <input value={form.prenom} onChange={majChamp('prenom')} required minLength={2} maxLength={100} />
        </label>
        <label>Date de naissance
          <input type="date" value={form.date_naissance} onChange={majChamp('date_naissance')} />
        </label>
        <label>Lieu de naissance
          <input value={form.lieu_naissance} onChange={majChamp('lieu_naissance')} maxLength={150} />
        </label>
        <label>Nationalité
          <input value={form.nationalite} onChange={majChamp('nationalite')} maxLength={100} />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={majChamp('email')} />
        </label>
        <label>Téléphone
          <input value={form.telephone} onChange={majChamp('telephone')} maxLength={50} />
        </label>
        <label>Année d'entrée
          <input type="number" value={form.annee_entree} onChange={majChamp('annee_entree')} min={1990} max={2100} />
        </label>
        <label>Département
          {acteurDepartements.length === 1 ? (
            <input value={acteurDepartements[0].nom} disabled title="Imposé par votre compte (chef de département)" />
          ) : (
            <select value={form.departement_id} onChange={majChamp('departement_id')}>
              <option value="">Non renseigné</option>
              {listeDepartementsFiltre.map((d) => (
                <option key={d.id} value={d.id}>{d.nom}</option>
              ))}
            </select>
          )}
        </label>
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={annulerEdition}>Annuler</button>
        <button type="submit" className={styles.primaryBtn} disabled={enregistrement}>
          {enregistrement ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />} Enregistrer
        </button>
      </div>
    </form>
  );

  return (
    <div className={styles.page}>
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Étudiants</div>
          <div className={styles.headerActions}>
            <span className={styles.totalCount}>{total} étudiant{total !== 1 ? 's' : ''}</span>
            <button type="button" className={styles.exportBtn} onClick={exporterCsv} disabled={exportEnCours}>
              <FileDown size={14} /> {exportEnCours ? 'Export…' : 'CSV'}
            </button>
            <button type="button" className={styles.newBtn} onClick={demarrerCreation}>
              <Plus size={15} /> Nouveau
            </button>
          </div>
        </div>

        <div className={styles.filtersBar}>
          <div className={`${styles.filterGroup} ${styles.filterGroupSearch}`}>
            <label>Recherche</label>
            <div className={styles.searchInputWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Nom, prénom, matricule..."
                value={rechercheInput}
                onChange={(e) => setRechercheInput(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>Département</label>
            <select value={departementFiltre} onChange={(e) => { setPage(1); setDepartementFiltre(e.target.value); }}>
              <option value="">Tous</option>
              {listeDepartementsFiltre.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Année d'entrée</label>
            <input
              type="number"
              placeholder="Toutes"
              value={anneeFiltre}
              onChange={(e) => { setPage(1); setAnneeFiltre(e.target.value); }}
              min={1990}
              max={2100}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Compte</label>
            <select value={compteFiltre} onChange={(e) => { setPage(1); setCompteFiltre(e.target.value); }}>
              <option value="">Tous</option>
              <option value="true">Avec compte</option>
              <option value="false">Sans compte</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Diplômes</label>
            <select value={documentsFiltre} onChange={(e) => { setPage(1); setDocumentsFiltre(e.target.value); }}>
              <option value="">Tous</option>
              <option value="true">Avec diplômes</option>
              <option value="false">Aucun diplôme</option>
            </select>
          </div>
          {filtresActifs && (
            <button type="button" className={styles.resetBtn} onClick={reinitialiserFiltres}>
              <X size={14} /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {erreurListe && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurListe}</p>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Département</th>
                <th>Année d'entrée</th>
                <th>Compte</th>
                <th>Diplômes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingListe && (
                <tr><td colSpan={6} className={styles.loadingCell}><Loader2 size={18} className={styles.spinnerIcon} /> Chargement...</td></tr>
              )}
              {!loadingListe && items.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    <div className={styles.emptyCellInner}>
                      <UserX size={22} />
                      {filtresActifs ? 'Aucun étudiant ne correspond à ces filtres.' : 'Aucun étudiant enregistré.'}
                    </div>
                  </td>
                </tr>
              )}
              {!loadingListe && items.map((e) => (
                <tr key={e.id} className={styles.clickableRow} onClick={() => selectionner(e)}>
                  <td>
                    <div className={styles.etudiantCell}>
                      <span className={styles.avatar} style={{ background: couleurAvatar(e.id) }}>{initiales(e.prenom, e.nom)}</span>
                      <span className={styles.bold}>
                        {e.prenom} {e.nom}
                        <span className={styles.subText}>{e.numero_etudiant}</span>
                      </span>
                    </div>
                  </td>
                  <td>{e.departement_nom ?? '—'}</td>
                  <td>{e.annee_entree ?? '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${e.a_compte ? styles.badgeAvecCompte : styles.badgeSansCompte}`}>
                      {e.a_compte ? 'Avec compte' : 'Sans compte'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${e.nb_documents > 0 ? styles.badgeDocs : styles.badgeDocsVide}`}>
                      {e.nb_documents > 0 ? e.nb_documents : 'Aucun'}
                    </span>
                  </td>
                  <td onClick={(ev) => ev.stopPropagation()}>
                    <div className={styles.actionsCell}>
                      <button type="button" className={styles.iconBtn} title="Voir la fiche" onClick={() => selectionner(e)}>
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} itemLabel="étudiant" />
      </div>

      {drawerOuvert && (
        <div className={styles.drawerOverlay} onClick={fermerDrawer}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            {mode === 'creation' && (
              <>
                <div className={styles.detailHeader}>
                  <span className={styles.avatarLg} style={{ background: '#94a3b8' }}>+</span>
                  <div className={styles.detailHeaderInfo}>
                    <h2>Nouvel étudiant</h2>
                    <span className={styles.mono}>Fiche à compléter</span>
                  </div>
                  <button type="button" className={styles.closeBtn} onClick={fermerDrawer}><X size={18} /></button>
                </div>
                {formulaire}
              </>
            )}

            {(mode === 'vue' || mode === 'edition') && selectionne && (
              <>
                <div className={styles.detailHeader}>
                  <span className={styles.avatarLg} style={{ background: couleurAvatar(selectionne.id) }}>
                    {initiales(selectionne.prenom, selectionne.nom)}
                  </span>
                  <div className={styles.detailHeaderInfo}>
                    <h2>{selectionne.prenom} {selectionne.nom}</h2>
                    <span className={styles.mono}>{selectionne.numero_etudiant}</span>
                  </div>
                  {mode === 'vue' && (
                    <div className={styles.detailHeaderActions}>
                      {!selectionne.a_compte && (
                        <button type="button" className={styles.secondaryBtn} onClick={envoyerInvitation} disabled={invitationEnCours}>
                          {invitationEnCours ? <Loader2 size={15} className={styles.spin} /> : <Send size={15} />} Renvoyer le lien d'activation
                        </button>
                      )}
                      <button type="button" className={styles.secondaryBtn} onClick={voirDocuments}>
                        <FileText size={15} /> Ses documents{selectionne.nb_documents > 0 ? ` (${selectionne.nb_documents})` : ''}
                      </button>
                      <button type="button" className={styles.iconBtn} title="Modifier" onClick={demarrerEdition}>
                        <Pencil size={16} />
                      </button>
                      {!(utilisateur?.role?.nom === 'agent_saisie' && selectionne.a_compte) && (
                        <button type="button" className={styles.iconBtnDanger} title="Supprimer" onClick={() => { setErreurSuppression(null); setConfirmSuppression(true); }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  <button type="button" className={styles.closeBtn} onClick={fermerDrawer}><X size={18} /></button>
                </div>

                {mode === 'vue' && (
                  <div className={styles.sections}>
                    {invitationMessage && (
                      <p className={invitationMessage.type === 'succes' ? styles.invitationSucces : styles.errorText}>
                        {invitationMessage.type === 'succes' ? null : <AlertTriangle size={14} />} {invitationMessage.texte}
                      </p>
                    )}
                    <section>
                      <h3>Identité</h3>
                      <div className={styles.champsGrid}>
                        <Champ icon={<Cake size={15} />} label="Date de naissance" value={fmtDate(selectionne.date_naissance)} />
                        <Champ icon={<MapPin size={15} />} label="Lieu de naissance" value={selectionne.lieu_naissance} />
                        <Champ icon={<Flag size={15} />} label="Nationalité" value={selectionne.nationalite} />
                      </div>
                    </section>
                    <section>
                      <h3>Contact</h3>
                      <div className={styles.champsGrid}>
                        <Champ icon={<Mail size={15} />} label="Email" value={selectionne.email} />
                        <Champ icon={<Phone size={15} />} label="Téléphone" value={selectionne.telephone} />
                      </div>
                    </section>
                    <section>
                      <h3>Scolarité</h3>
                      <div className={styles.champsGrid}>
                        <Champ icon={<GraduationCap size={15} />} label="Établissement" value={selectionne.universite_nom} />
                        <Champ icon={<GraduationCap size={15} />} label="Département" value={selectionne.departement_nom} />
                        <Champ icon={<GraduationCap size={15} />} label="Année d'entrée" value={selectionne.annee_entree} />
                        <Champ icon={<FileText size={15} />} label="Documents émis" value={selectionne.nb_documents} />
                      </div>
                    </section>
                  </div>
                )}

                {mode === 'edition' && formulaire}
              </>
            )}
          </div>
        </div>
      )}

      {confirmSuppression && selectionne && (
        <div className={styles.modalOverlay} onClick={() => setConfirmSuppression(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}><Trash2 size={18} /></div>
              <div>
                <h3>Supprimer cette fiche ?</h3>
                <p>{selectionne.prenom} {selectionne.nom} ({selectionne.numero_etudiant})</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setConfirmSuppression(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.warningBanner}>
                {selectionne.nb_documents > 0
                  ? `Cet étudiant a ${selectionne.nb_documents} document(s) émis, la suppression sera refusée tant qu'ils existent.`
                  : "Cette fiche sera masquée et n'apparaîtra plus dans les recherches."}
              </p>
              {erreurSuppression && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurSuppression}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={() => setConfirmSuppression(false)}>Annuler</button>
              <button type="button" className={styles.confirmDangerBtn} disabled={suppressionEnCours} onClick={confirmerSuppression}>
                {suppressionEnCours ? <Loader2 size={15} className={styles.spin} /> : <Trash2 size={15} />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
