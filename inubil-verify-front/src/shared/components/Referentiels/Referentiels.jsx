import { useEffect, useState } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, Loader2, AlertTriangle, Save,
  FileText, Award, ListChecks, Building2, UserCog,
} from 'lucide-react';
import {
  listerTypesDocument, creerTypeDocument, modifierTypeDocument, supprimerTypeDocument,
} from '../../../core/types-document/types-document.api';
import {
  listerMentions, creerMention, modifierMention, supprimerMention,
} from '../../../core/mentions/mentions.api';
import {
  listerDepartements, creerDepartement, modifierDepartement, supprimerDepartement,
} from '../../../core/departements/departements.api';
import { listerUtilisateurs, assignerDepartementsUtilisateur } from '../../../core/utilisateurs/utilisateurs.api';
import { listerRoles } from '../../../core/roles/roles.api';
import { useAuth } from '../../../core/auth/useAuth';
import { ApiError } from '../../../core/api/client';
import styles from './Referentiels.module.css';

// Référentiels (docs/ROLES_ET_PAGES.md §D item 22, GET/POST/PATCH/DELETE /types-document, /mentions,
// /departements). Page partagée agent_saisie / directeur_pedagogique / responsable_universite —
// mais l'onglet Départements est en LECTURE SEULE pour les deux premiers (permission dept:create/edit/
// delete reservee a responsable_universite, cf. seed.ts) : c'est une decision structurelle globale
// a l'universite (qui affecte le perimetre des chefs de departement), pas un referentiel de saisie
// courante comme les types de documents/mentions. Pattern master-detail identique à FicheEtudiant.jsx.

const CATEGORIES = [
  { value: 'diplome', label: 'Diplôme' },
  { value: 'releve', label: 'Relevé de notes' },
  { value: 'attestation', label: 'Attestation' },
  { value: 'certificat', label: 'Certificat' },
  { value: 'autre', label: 'Autre' },
];

const LABEL_CATEGORIE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const TYPE_VIDE = {
  code: '', nom: '', nom_court: '', categorie: 'diplome',
  niveau_bac_plus: '', a_matieres: false, est_partage: false, ordre: 0,
};

const MENTION_VIDE = { code: '', nom: '', note_min: '', note_max: '', ordre: 0 };
const DEPARTEMENT_VIDE = { code: '', nom: '', ordre: 0 };

function nettoyerNombre(v) {
  return v === '' || v === null || v === undefined ? undefined : Number(v);
}

const CONFIGS = {
  types: {
    titre: 'Types de documents',
    nomSingulier: 'ce type de document',
    article: 'un type de document',
    genreNouveau: 'Nouveau',
    icone: FileText,
    champVide: TYPE_VIDE,
    lister: () => listerTypesDocument({ estActif: null }),
    creer: creerTypeDocument,
    modifier: modifierTypeDocument,
    supprimer: supprimerTypeDocument,
    versForm(item) {
      return {
        code: item.code ?? '', nom: item.nom ?? '', nom_court: item.nom_court ?? '',
        categorie: item.categorie ?? 'diplome',
        niveau_bac_plus: item.niveau_bac_plus ?? '',
        a_matieres: Boolean(item.a_matieres), est_partage: Boolean(item.est_partage),
        ordre: item.ordre ?? 0,
      };
    },
    construirePayload(form) {
      return {
        code: form.code.trim().toUpperCase(),
        nom: form.nom.trim(),
        nom_court: form.nom_court.trim() || undefined,
        categorie: form.categorie,
        niveau_bac_plus: nettoyerNombre(form.niveau_bac_plus),
        a_matieres: form.a_matieres,
        est_partage: form.est_partage,
        ordre: Number(form.ordre) || 0,
      };
    },
  },
  mentions: {
    titre: 'Mentions',
    nomSingulier: 'cette mention',
    article: 'une mention',
    genreNouveau: 'Nouvelle',
    icone: Award,
    champVide: MENTION_VIDE,
    lister: () => listerMentions({ estActif: null }),
    creer: creerMention,
    modifier: modifierMention,
    supprimer: supprimerMention,
    versForm(item) {
      return {
        code: item.code ?? '', nom: item.nom ?? '',
        note_min: item.note_min ?? '', note_max: item.note_max ?? '',
        ordre: item.ordre ?? 0,
      };
    },
    construirePayload(form) {
      return {
        code: form.code.trim().toUpperCase(),
        nom: form.nom.trim(),
        note_min: nettoyerNombre(form.note_min),
        note_max: nettoyerNombre(form.note_max),
        ordre: Number(form.ordre) || 0,
      };
    },
  },
  departements: {
    titre: 'Départements',
    nomSingulier: 'ce département',
    article: 'un département',
    genreNouveau: 'Nouveau',
    icone: Building2,
    champVide: DEPARTEMENT_VIDE,
    // Reserve a responsable_universite (permission dept:create/edit/delete) — les autres
    // roles de ce layout (agent_saisie, directeur_pedagogique) ont dept:read seulement.
    rolesEcriture: ['responsable_universite'],
    lister: () => listerDepartements({ estActif: null }),
    creer: creerDepartement,
    modifier: modifierDepartement,
    supprimer: supprimerDepartement,
    versForm(item) {
      return { code: item.code ?? '', nom: item.nom ?? '', ordre: item.ordre ?? 0 };
    },
    construirePayload(form) {
      return {
        code: form.code.trim().toUpperCase(),
        nom: form.nom.trim(),
        ordre: Number(form.ordre) || 0,
      };
    },
  },
};

export default function Referentiels() {
  const { utilisateur } = useAuth();
  const estResponsable = utilisateur?.role?.nom === 'responsable_universite';
  const [onglet, setOnglet] = useState('types');

  return (
    <div className={styles.page}>
      <div className={styles.tabs}>
        {Object.entries(CONFIGS).map(([cle, cfg]) => {
          const Icone = cfg.icone;
          return (
            <button
              key={cle}
              type="button"
              className={`${styles.tab} ${onglet === cle ? styles.tabActive : ''}`}
              onClick={() => setOnglet(cle)}
            >
              <Icone size={16} /> {cfg.titre}
            </button>
          );
        })}
        {/* Attribution des departements a un compte — reserve a responsable_universite
            (permission dept:edit ET user:read, cf. utilisateurs.controller.ts). */}
        {estResponsable && (
          <button
            type="button"
            className={`${styles.tab} ${onglet === 'attribution' ? styles.tabActive : ''}`}
            onClick={() => setOnglet('attribution')}
          >
            <UserCog size={16} /> Attribution
          </button>
        )}
      </div>

      {/* key force le remontage (et donc la reinitialisation d'etat) au changement d'onglet */}
      {onglet === 'attribution'
        ? <PanneauAttribution key="attribution" />
        : <PanneauReferentiel key={onglet} config={CONFIGS[onglet]} />}
    </div>
  );
}

const ROLES_ATTRIBUABLES = ['agent_saisie', 'directeur_pedagogique'];
const LABEL_ROLE = { agent_saisie: 'Agent de saisie', directeur_pedagogique: 'Directeur pédagogique' };

// Onglet "Attribution" : associe un ou plusieurs departements a un compte agent_saisie /
// directeur_pedagogique (cf. docs/ROLES_ET_PAGES.md — portee departement). Ne suit pas le
// pattern config-driven de PanneauReferentiel : ce n'est pas un CRUD d'entite, mais un
// editeur de relation many-to-many entre un utilisateur et des departements existants.
function PanneauAttribution() {
  const { utilisateur } = useAuth();
  const universiteId = utilisateur?.universite?.id;

  const [departements, setDepartements] = useState([]);
  const [rechercheInput, setRechercheInput] = useState('');
  const [comptes, setComptes] = useState([]);
  const [loadingListe, setLoadingListe] = useState(true);
  const [erreurListe, setErreurListe] = useState(null);

  const [selectionne, setSelectionne] = useState(null);
  const [selectionDepts, setSelectionDepts] = useState([]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);
  const [enregistre, setEnregistre] = useState(false);

  const charger = async () => {
    setLoadingListe(true);
    setErreurListe(null);
    try {
      const [rolesRes, deptsRes] = await Promise.all([
        listerRoles(),
        listerDepartements({ universiteId, estActif: true }),
      ]);
      const parNom = Object.fromEntries((rolesRes ?? []).map((r) => [r.nom, r.id]));
      setDepartements(deptsRes ?? []);

      const idsRoles = ROLES_ATTRIBUABLES.map((nom) => parNom[nom]).filter(Boolean);
      const pages = await Promise.all(
        idsRoles.map((roleId) => listerUtilisateurs({ page: 1, limit: 100, roleId })),
      );
      const tous = pages.flatMap((p) => p.data ?? []);
      tous.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));
      setComptes(tous);
    } catch (err) {
      setErreurListe(err instanceof ApiError ? err.message : 'Impossible de charger les comptes.');
    } finally {
      setLoadingListe(false);
    }
  };

  useEffect(() => {
    (async () => { await charger(); })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const texte = rechercheInput.trim().toLowerCase();
  const comptesFiltres = texte
    ? comptes.filter((c) =>
        `${c.nom} ${c.prenom} ${c.email}`.toLowerCase().includes(texte))
    : comptes;

  const selectionner = (compte) => {
    setSelectionne(compte);
    setSelectionDepts(compte.departements.map((d) => d.id));
    setErreurForm(null);
  };

  const basculerDept = (id) => {
    setSelectionDepts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const enregistrer = async () => {
    setEnregistrement(true);
    setErreurForm(null);
    try {
      const maj = await assignerDepartementsUtilisateur(selectionne.id, selectionDepts);
      setComptes((prev) => prev.map((c) => (c.id === maj.id ? maj : c)));
      setSelectionne(maj);
      setEnregistre(true);
      setTimeout(() => setEnregistre(false), 1800);
    } catch (err) {
      setErreurForm(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <div className={styles.split}>
      <div className={styles.masterPanel}>
        <div className={styles.masterHeader}>
          <h2 className={styles.title}>Attribution</h2>
        </div>

        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            placeholder="Nom, prénom ou email..."
            value={rechercheInput}
            onChange={(e) => setRechercheInput(e.target.value)}
          />
        </div>

        {erreurListe && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurListe}</p>}

        <div className={styles.list}>
          {loadingListe && (
            <div className={styles.loadingRow}><Loader2 size={18} className={styles.spin} /> Chargement...</div>
          )}
          {!loadingListe && comptesFiltres.length === 0 && (
            <div className={styles.emptyList}>
              <ListChecks size={22} />
              {texte ? 'Aucun résultat.' : 'Aucun agent de saisie ni directeur pédagogique pour cette université.'}
            </div>
          )}
          {!loadingListe && comptesFiltres.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.listItem} ${selectionne?.id === c.id ? styles.listItemActive : ''}`}
              onClick={() => selectionner(c)}
            >
              <span className={styles.listItemInfo}>
                <strong>{c.nom} {c.prenom}</strong>
                <span className={styles.listItemSub}>
                  {LABEL_ROLE[c.role?.nom] ?? c.role?.nom} · {c.departements.length === 0 ? 'Scolarité (tous départements)' : c.departements.map((d) => d.nom).join(', ')}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.detailPanel}>
        {!selectionne && (
          <div className={styles.emptyDetail}>
            <UserCog size={40} />
            <p>Sélectionnez un compte dans la liste pour gérer ses départements.</p>
          </div>
        )}

        {selectionne && (
          <>
            <div className={styles.detailHeader}>
              <span className={styles.avatarLg}><UserCog size={22} /></span>
              <div className={styles.detailHeaderInfo}>
                <h2>{selectionne.nom} {selectionne.prenom}</h2>
                <span className={styles.mono}>{selectionne.email} — {LABEL_ROLE[selectionne.role?.nom] ?? selectionne.role?.nom}</span>
              </div>
            </div>

            <div className={styles.sections}>
              <section>
                <h3>Départements associés</h3>
                <p className={styles.champLabel} style={{ marginBottom: 10 }}>
                  Aucune case cochée = compte « scolarité », sans restriction (voit tous les départements).
                  Une ou plusieurs cases cochées = compte restreint à ces départements uniquement.
                </p>

                {erreurForm && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurForm}</p>}

                <div className={styles.checkRow}>
                  {departements.length === 0 && <span className={styles.champValeur}>Aucun département créé pour cette université.</span>}
                  {departements.map((d) => (
                    <label key={d.id} className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={selectionDepts.includes(d.id)}
                        onChange={() => basculerDept(d.id)}
                      />
                      {d.nom}
                    </label>
                  ))}
                </div>

                <div className={styles.formActions}>
                  {enregistre && <span className={styles.champLabel}>Enregistré.</span>}
                  <button type="button" className={styles.primaryBtn} disabled={enregistrement} onClick={enregistrer}>
                    {enregistrement ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />} Enregistrer
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PanneauReferentiel({ config }) {
  const { utilisateur } = useAuth();
  const universiteId = utilisateur?.universite?.id;
  const peutEcrire = !config.rolesEcriture || config.rolesEcriture.includes(utilisateur?.role?.nom);

  const [rechercheInput, setRechercheInput] = useState('');
  const [items, setItems] = useState([]);
  const [loadingListe, setLoadingListe] = useState(true);
  const [erreurListe, setErreurListe] = useState(null);

  const [selectionne, setSelectionne] = useState(null);
  const [mode, setMode] = useState('vide'); // vide | vue | edition | creation
  const [form, setForm] = useState(config.champVide);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurForm, setErreurForm] = useState(null);

  const [confirmSuppression, setConfirmSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreurSuppression, setErreurSuppression] = useState(null);

  const charger = async () => {
    setLoadingListe(true);
    setErreurListe(null);
    try {
      const res = await config.lister();
      setItems(res ?? []);
    } catch (err) {
      setErreurListe(err instanceof ApiError ? err.message : 'Impossible de charger la liste.');
    } finally {
      setLoadingListe(false);
    }
  };

  useEffect(() => {
    (async () => { await charger(); })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const texte = rechercheInput.trim().toLowerCase();
  const itemsFiltres = texte
    ? items.filter((it) => it.code.toLowerCase().includes(texte) || it.nom.toLowerCase().includes(texte))
    : items;

  const selectionner = (item) => {
    setSelectionne(item);
    setForm(config.versForm(item));
    setMode('vue');
    setErreurForm(null);
  };

  const demarrerCreation = () => {
    setSelectionne(null);
    setForm(config.champVide);
    setErreurForm(null);
    setMode('creation');
  };

  const demarrerEdition = () => {
    setForm(config.versForm(selectionne));
    setErreurForm(null);
    setMode('edition');
  };

  const annuler = () => {
    if (selectionne) {
      setForm(config.versForm(selectionne));
      setMode('vue');
    } else {
      setMode('vide');
    }
    setErreurForm(null);
  };

  const majChamp = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));
  const majChampBool = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.checked }));

  const soumettre = async (e) => {
    e.preventDefault();
    setEnregistrement(true);
    setErreurForm(null);
    try {
      const payload = config.construirePayload(form);
      if (mode === 'creation') {
        if (!universiteId) throw new Error('Impossible de déterminer votre établissement.');
        const cree = await config.creer({ ...payload, universite_id: universiteId });
        setItems((prev) => [cree, ...prev]);
        selectionner(cree);
      } else {
        const maj = await config.modifier(selectionne.id, payload);
        setItems((prev) => prev.map((it) => (it.id === maj.id ? maj : it)));
        selectionner(maj);
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
      await config.supprimer(selectionne.id);
      // Suppression physique si inutilise, sinon desactivation douce cote backend —
      // dans les deux cas on recharge pour refleter l'etat reel (supprime ou est_actif=false).
      await charger();
      setSelectionne(null);
      setMode('vide');
      setConfirmSuppression(false);
    } catch (err) {
      setErreurSuppression(err instanceof ApiError ? err.message : 'Suppression impossible.');
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const estTypes = config === CONFIGS.types;
  const estMentions = config === CONFIGS.mentions;

  const formulaire = (
    <form className={styles.form} onSubmit={soumettre}>
      {erreurForm && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurForm}</p>}
      <div className={styles.formGrid}>
        <label>Code
          <input value={form.code} onChange={majChamp('code')} required minLength={1} maxLength={50} placeholder="ex : LIC-INFO" />
        </label>
        <label>Nom
          <input value={form.nom} onChange={majChamp('nom')} required minLength={2} maxLength={200} />
        </label>

        {estTypes && (
          <>
            <label>Nom court
              <input value={form.nom_court} onChange={majChamp('nom_court')} maxLength={50} placeholder="ex : Licence" />
            </label>
            <label>Catégorie
              <select value={form.categorie} onChange={majChamp('categorie')}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label>Niveau (Bac+)
              <input type="number" value={form.niveau_bac_plus} onChange={majChamp('niveau_bac_plus')} min={1} max={8} />
            </label>
          </>
        )}

        {estMentions && (
          <>
            <label>Note minimale (incluse)
              <input type="number" value={form.note_min} onChange={majChamp('note_min')} min={0} max={20} step="0.01" />
            </label>
            <label>Note maximale (exclue)
              <input type="number" value={form.note_max} onChange={majChamp('note_max')} min={0} max={20} step="0.01" />
            </label>
          </>
        )}

        <label>Ordre d'affichage
          <input type="number" value={form.ordre} onChange={majChamp('ordre')} min={0} />
        </label>
      </div>

      {estTypes && (
        <div className={styles.checkRow}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.a_matieres} onChange={majChampBool('a_matieres')} />
            Ce type inclut une liste de matières (relevé de notes)
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.est_partage} onChange={majChampBool('est_partage')} />
            Visible par les universités partenaires
          </label>
        </div>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={annuler}>Annuler</button>
        <button type="submit" className={styles.primaryBtn} disabled={enregistrement}>
          {enregistrement ? <Loader2 size={15} className={styles.spin} /> : <Save size={15} />} Enregistrer
        </button>
      </div>
    </form>
  );

  const Icone = config.icone;

  return (
    <div className={styles.split}>
      <div className={styles.masterPanel}>
        <div className={styles.masterHeader}>
          <h2 className={styles.title}>{config.titre}</h2>
          {peutEcrire && (
            <button type="button" className={styles.newBtn} onClick={demarrerCreation}>
              <Plus size={15} /> Nouveau
            </button>
          )}
        </div>

        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            placeholder="Code ou nom..."
            value={rechercheInput}
            onChange={(e) => setRechercheInput(e.target.value)}
          />
        </div>

        {erreurListe && <p className={styles.errorText}><AlertTriangle size={14} /> {erreurListe}</p>}

        <div className={styles.list}>
          {loadingListe && (
            <div className={styles.loadingRow}><Loader2 size={18} className={styles.spin} /> Chargement...</div>
          )}
          {!loadingListe && itemsFiltres.length === 0 && (
            <div className={styles.emptyList}>
              <ListChecks size={22} />
              {texte ? 'Aucun résultat.' : `Aucun élément — cliquez sur « Nouveau » pour en créer un.`}
            </div>
          )}
          {!loadingListe && itemsFiltres.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`${styles.listItem} ${selectionne?.id === it.id ? styles.listItemActive : ''}`}
              onClick={() => selectionner(it)}
            >
              <span className={styles.codeBadge}>{it.code}</span>
              <span className={styles.listItemInfo}>
                <strong>{it.nom}</strong>
                {estTypes && <span className={styles.listItemSub}>{LABEL_CATEGORIE[it.categorie] ?? it.categorie}</span>}
              </span>
              {!it.est_actif && <span className={styles.inactifBadge}>Inactif</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.detailPanel}>
        {mode === 'vide' && (
          <div className={styles.emptyDetail}>
            <Icone size={40} />
            <p>
              Sélectionnez {config.article} dans la liste{peutEcrire ? ', ou créez-en un(e) nouveau(elle).' : '.'}
              {!peutEcrire && <><br /><em>Lecture seule — géré par le responsable d'université.</em></>}
            </p>
          </div>
        )}

        {mode === 'creation' && (
          <>
            <div className={styles.detailHeader}>
              <span className={styles.avatarLg}><Plus size={22} /></span>
              <div className={styles.detailHeaderInfo}>
                <h2>{config.genreNouveau} — {config.titre.replace(/s$/, '')}</h2>
                <span className={styles.mono}>Fiche à compléter</span>
              </div>
            </div>
            <div className={styles.sections}>{formulaire}</div>
          </>
        )}

        {(mode === 'vue' || mode === 'edition') && selectionne && (
          <>
            <div className={styles.detailHeader}>
              <span className={styles.avatarLg}><Icone size={22} /></span>
              <div className={styles.detailHeaderInfo}>
                <h2>{selectionne.nom}</h2>
                <span className={styles.mono}>
                  {selectionne.code}
                  {!selectionne.est_actif && <span className={styles.inactifBadgeInline}>Inactif</span>}
                </span>
              </div>
              {mode === 'vue' && peutEcrire && (
                <div className={styles.detailHeaderActions}>
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
                  <h3>Détails</h3>
                  <div className={styles.champsGrid}>
                    {estTypes ? (
                      <>
                        <Champ label="Nom court" value={selectionne.nom_court} />
                        <Champ label="Catégorie" value={LABEL_CATEGORIE[selectionne.categorie] ?? selectionne.categorie} />
                        <Champ label="Niveau (Bac+)" value={selectionne.niveau_bac_plus} />
                        <Champ label="Liste de matières" value={selectionne.a_matieres ? 'Oui' : 'Non'} />
                        <Champ label="Partagé aux partenaires" value={selectionne.est_partage ? 'Oui' : 'Non'} />
                      </>
                    ) : (
                      <>
                        <Champ label="Note minimale" value={selectionne.note_min !== null ? `${selectionne.note_min}/20` : null} />
                        <Champ label="Note maximale" value={selectionne.note_max !== null ? `${selectionne.note_max}/20` : null} />
                      </>
                    )}
                    <Champ label="Ordre d'affichage" value={selectionne.ordre} />
                    <Champ label="Statut" value={selectionne.est_actif ? 'Actif' : 'Inactif'} />
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
                <h3>Supprimer {config.nomSingulier} ?</h3>
                <p>{selectionne.nom} — {selectionne.code}</p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setConfirmSuppression(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.warningBanner}>
                S'il est encore utilisé par des documents existants, il sera simplement désactivé
                (masqué des listes actives) plutôt que supprimé. Sinon, la suppression est définitive.
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

function Champ({ label, value }) {
  return (
    <div className={styles.champ}>
      <div className={styles.champTexte}>
        <span className={styles.champLabel}>{label}</span>
        <span className={styles.champValeur}>{value === null || value === undefined || value === '' ? '—' : String(value)}</span>
      </div>
    </div>
  );
}
