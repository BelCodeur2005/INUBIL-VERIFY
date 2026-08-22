import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Pencil, Trash2, X, Loader2, AlertTriangle, UserX,
  FileText, Save, ChevronLeft, ChevronRight, Cake, MapPin, Flag, Mail, Phone, GraduationCap,
} from 'lucide-react';
import {
  rechercherEtudiants, creerEtudiant, modifierEtudiant, supprimerEtudiant,
} from '../../../core/etudiants/etudiants.api';
import { useAuth } from '../../../core/auth/useAuth';
import { ApiError } from '../../../core/api/client';
import styles from './FicheEtudiant.module.css';

// Fiche Étudiant (docs/ROLES_ET_PAGES.md §D item 16, GET/POST/PATCH/DELETE /admin/etudiants).
// Page partagée agent_saisie / directeur_pedagogique / responsable_universite —
// pattern master-detail (liste à gauche, fiche à droite) : c'est le pattern standard
// pour la gestion de "dossiers" (CRM, SIS) quand chaque enregistrement a beaucoup de
// champs et qu'on navigue souvent d'un dossier à l'autre.

const CHAMPS_VIDES = {
  numero_etudiant: '', nom: '', prenom: '', date_naissance: '',
  lieu_naissance: '', nationalite: '', email: '', telephone: '', annee_entree: '',
};

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

  const [rechercheInput, setRechercheInput] = useState('');
  const [recherche, setRecherche] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loadingListe, setLoadingListe] = useState(true);
  const [erreurListe, setErreurListe] = useState(null);

  const [selectionne, setSelectionne] = useState(null);
  const [mode, setMode] = useState('vide'); // vide | vue | edition | creation
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);

  const [confirmSuppression, setConfirmSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState(null);

  // Débounce de la recherche libre avant de déclencher la requête.
  useEffect(() => {
    const t = setTimeout(() => { setRecherche(rechercheInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [rechercheInput]);

  useEffect(() => {
    let annule = false;
    (async () => {
      setLoadingListe(true);
      setErreurListe(null);
      try {
        const res = await rechercherEtudiants(recherche || undefined, { page, limit });
        if (annule) return;
        setItems(res.data ?? []);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (annule) return;
        setErreurListe(err instanceof ApiError ? err.message : 'Impossible de charger les étudiants.');
      } finally {
        if (!annule) setLoadingListe(false);
      }
    })();
    return () => { annule = true; };
  }, [recherche, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const selectionner = (e) => {
    setSelectionne(e);
    setForm(mapVersForm(e));
    setMode('vue');
    setErreurForm(null);
  };

  const demarrerCreation = () => {
    setSelectionne(null);
    setForm(CHAMPS_VIDES);
    setErreurForm(null);
    setMode('creation');
  };

  const demarrerEdition = () => {
    setForm(mapVersForm(selectionne));
    setErreurForm(null);
    setMode('edition');
  };

  const annuler = () => {
    if (selectionne) {
      setForm(mapVersForm(selectionne));
      setMode('vue');
    } else {
      setMode('vide');
    }
    setErreurForm(null);
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
      } else {
        const maj = await modifierEtudiant(selectionne.id, payload);
        setItems((prev) => prev.map((it) => (it.id === maj.id ? maj : it)));
        setSelectionne(maj);
        setForm(mapVersForm(maj));
        setMode('vue');
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
      setMode('vide');
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

  const formulaire = (
    <form className={styles.form} onSubmit={soumettre}>
      {erreurForm && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurForm}</p>}
      <div className={styles.formGrid}>
        <label>Matricule
          <input value={form.numero_etudiant} onChange={majChamp('numero_etudiant')} required minLength={3} maxLength={50} />
        </label>
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
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={annuler}>Annuler</button>
        <button type="submit" className={styles.primaryBtn} disabled={enregistrement}>
          {enregistrement ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />} Enregistrer
        </button>
      </div>
    </form>
  );

  return (
    <div className={styles.page}>
      <div className={styles.masterPanel}>
        <div className={styles.masterHeader}>
          <h2 className={styles.title}>Étudiants</h2>
          <button type="button" className={styles.newBtn} onClick={demarrerCreation}>
            <Plus size={15} /> Nouveau
          </button>
        </div>

        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            placeholder="Nom, prénom, matricule..."
            value={rechercheInput}
            onChange={(e) => setRechercheInput(e.target.value)}
          />
        </div>

        {erreurListe && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurListe}</p>}

        <div className={styles.list}>
          {loadingListe && (
            <div className={styles.loadingRow}><Loader2 size={18} className={styles.spin} /> Chargement...</div>
          )}
          {!loadingListe && items.length === 0 && (
            <div className={styles.emptyList}>
              <UserX size={22} />
              {recherche ? 'Aucun étudiant ne correspond à cette recherche.' : 'Aucun étudiant enregistré.'}
            </div>
          )}
          {!loadingListe && items.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`${styles.listItem} ${selectionne?.id === e.id ? styles.listItemActive : ''}`}
              onClick={() => selectionner(e)}
            >
              <span className={styles.avatar} style={{ background: couleurAvatar(e.id) }}>{initiales(e.prenom, e.nom)}</span>
              <span className={styles.listItemInfo}>
                <strong>{e.prenom} {e.nom}</strong>
                <span className={styles.listItemSub}>{e.numero_etudiant}</span>
              </span>
              {e.nb_documents > 0 && <span className={styles.docBadge}>{e.nb_documents}</span>}
            </button>
          ))}
        </div>

        <div className={styles.pagination}>
          <span>{total === 0 ? 'Aucun résultat' : `Page ${page} / ${totalPages} — ${total}`}</span>
          <div className={styles.paginBtns}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <div className={styles.detailPanel}>
        {mode === 'vide' && (
          <div className={styles.emptyDetail}>
            <UserX size={40} />
            <p>Sélectionnez un étudiant dans la liste, ou créez-en un nouveau.</p>
          </div>
        )}

        {mode === 'creation' && (
          <>
            <div className={styles.detailHeader}>
              <span className={styles.avatarLg} style={{ background: '#94a3b8' }}>+</span>
              <div className={styles.detailHeaderInfo}>
                <h2>Nouvel étudiant</h2>
                <span className={styles.mono}>Fiche à compléter</span>
              </div>
            </div>
            <div className={styles.sections}>{formulaire}</div>
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
                  <button type="button" className={styles.secondaryBtn} onClick={voirDocuments}>
                    <FileText size={15} /> Ses documents{selectionne.nb_documents > 0 ? ` (${selectionne.nb_documents})` : ''}
                  </button>
                  <button type="button" className={styles.iconBtn} title="Modifier" onClick={demarrerEdition}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className={styles.iconBtnDanger} title="Supprimer" onClick={() => { setErreurSuppression(null); setConfirmSuppression(true); }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {mode === 'vue' && (
              <div className={styles.sections}>
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
                    <Champ icon={<GraduationCap size={15} />} label="Année d'entrée" value={selectionne.annee_entree} />
                    <Champ icon={<FileText size={15} />} label="Documents émis" value={selectionne.nb_documents} />
                  </div>
                </section>
              </div>
            )}

            {mode === 'edition' && <div className={styles.sections}>{formulaire}</div>}
          </>
        )}
      </div>

      {confirmSuppression && selectionne && (
        <div className={styles.modalOverlay} onClick={() => setConfirmSuppression(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderIcon}><Trash2 size={18} /></div>
              <div>
                <h3>Supprimer cette fiche ?</h3>
                <p>{selectionne.prenom} {selectionne.nom} — {selectionne.numero_etudiant}</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setConfirmSuppression(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.warningBanner}>
                {selectionne.nb_documents > 0
                  ? `Cet étudiant a ${selectionne.nb_documents} document(s) émis — la suppression sera refusée tant qu'ils existent.`
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
