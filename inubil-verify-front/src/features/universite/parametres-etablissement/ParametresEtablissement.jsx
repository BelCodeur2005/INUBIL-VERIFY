import { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { getUniversite, modifierUniversite } from '../../../core/universites/universites.api';
import { ApiError } from '../../../core/api/client';
import styles from './ParametresEtablissement.module.css';

const TYPES_UNIVERSITE = [
  { valeur: 'publique', label: 'Publique' },
  { valeur: 'privee', label: 'Privée' },
];

const CHAMPS_VIDES = {
  nom: '', nom_court: '', type: 'privee', logo_url: '',
  pays: '', ville: '', adresse: '',
  site_web: '', email_contact: '', telephone: '',
  description: '',
};

/** Normalise la reponse API (champs eventuellement null) vers des chaines controlees pour les inputs. */
function versFormulaire(universite) {
  const f = { ...CHAMPS_VIDES };
  for (const cle of Object.keys(CHAMPS_VIDES)) {
    if (universite[cle] !== null && universite[cle] !== undefined) f[cle] = universite[cle];
  }
  return f;
}

/** Ne renvoie au PATCH que les champs reellement modifies (evite d'ecraser avec des chaines vides
 * les champs optionnels qu'on a simplement laisses tels quels). */
function versPatch(formulaire, original) {
  const patch = {};
  for (const cle of Object.keys(CHAMPS_VIDES)) {
    const valeur = formulaire[cle].trim ? formulaire[cle].trim() : formulaire[cle];
    if (valeur !== (original[cle] ?? '')) patch[cle] = valeur || undefined;
  }
  return patch;
}

/** Page "Paramètres de l'établissement" (responsable_universite) — identité affichée dans toute
 * l'app : logo, nom, coordonnées. GET/PATCH /universites/:id (permission univ:edit). */
export default function ParametresEtablissement() {
  const { utilisateur, rafraichirProfil } = useAuth();
  const universiteId = utilisateur?.universite?.id;

  const [chargement, setChargement] = useState(() => !!universiteId);
  const [erreurChargement, setErreurChargement] = useState(null);
  const [original, setOriginal] = useState(CHAMPS_VIDES);
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [logoErreur, setLogoErreur] = useState(false);

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    if (!universiteId) return;
    let annule = false;
    getUniversite(universiteId)
      .then((res) => {
        if (annule) return;
        const f = versFormulaire(res);
        setOriginal(f);
        setForm(f);
      })
      .catch((err) => {
        if (annule) return;
        setErreurChargement(err instanceof ApiError ? err.message : "Impossible de charger l'établissement.");
      })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [universiteId]);

  const maj = (champ) => (e) => {
    setForm((f) => ({ ...f, [champ]: e.target.value }));
    setEnregistre(false);
  };

  const modifie = JSON.stringify(form) !== JSON.stringify(original);

  const soumettre = async (e) => {
    e.preventDefault();
    if (!universiteId || !modifie) return;
    setEnregistrement(true);
    setErreurEnvoi(null);
    try {
      const patch = versPatch(form, original);
      const maj_ = await modifierUniversite(universiteId, patch);
      const f = versFormulaire(maj_);
      setOriginal(f);
      setForm(f);
      setEnregistre(true);
      await rafraichirProfil?.(); // le logo/nom du header et de la sidebar reflete le changement immediatement
      setTimeout(() => setEnregistre(false), 2500);
    } catch (err) {
      setErreurEnvoi(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setEnregistrement(false);
    }
  };

  if (chargement) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBox}><Loader2 size={22} className={styles.spin} /> Chargement…</div>
      </div>
    );
  }

  if (erreurChargement || !universiteId) {
    return (
      <div className={styles.page}>
        <p className={styles.errorBanner}>
          <AlertTriangle size={16} /> {erreurChargement ?? "Aucun établissement rattaché à votre compte."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Établissement</h1>
        <p className={styles.subtitle}>
          Ces informations apparaissent dans toute la plateforme — en-tête, rapports de vérification, page publique.
        </p>
      </div>

      <form onSubmit={soumettre} className={styles.form}>
        {/* ── Identité visuelle ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}><ImageIcon size={17} /> Identité visuelle</h2>

          <div className={styles.identityRow}>
            <div className={styles.logoPreviewBox}>
              {form.logo_url && !logoErreur ? (
                <img
                  src={form.logo_url}
                  alt={`Logo ${form.nom || "de l'établissement"}`}
                  className={styles.logoPreviewImg}
                  onError={() => setLogoErreur(true)}
                  onLoad={() => setLogoErreur(false)}
                />
              ) : (
                <div className={styles.logoPreviewEmpty}>
                  <Building2 size={28} />
                  <span>{logoErreur ? 'Image illisible' : 'Aucun logo'}</span>
                </div>
              )}
            </div>

            <div className={styles.identityFields}>
              <div className={styles.inputGroup}>
                <label>URL du logo</label>
                <input
                  type="url"
                  value={form.logo_url}
                  onChange={(e) => { setLogoErreur(false); maj('logo_url')(e); }}
                  placeholder="https://…/logo.png"
                />
                <span className={styles.fieldHint}>
                  Hébergez l'image (site de l'établissement, service d'hébergement d'images) puis collez son lien ici.
                </span>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Nom complet</label>
                  <input type="text" value={form.nom} onChange={maj('nom')} placeholder="ex : Institut Universitaire Bilingue du Littoral" required />
                </div>
                <div className={styles.inputGroup}>
                  <label>Nom court / sigle</label>
                  <input type="text" value={form.nom_court} onChange={maj('nom_court')} placeholder="ex : INUBIL" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Type d'établissement</label>
                  <select value={form.type} onChange={maj('type')}>
                    {TYPES_UNIVERSITE.map((t) => <option key={t.valeur} value={t.valeur}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Localisation ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}><MapPin size={17} /> Localisation</h2>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Pays</label>
              <input type="text" value={form.pays} onChange={maj('pays')} placeholder="ex : Cameroun" />
            </div>
            <div className={styles.inputGroup}>
              <label>Ville</label>
              <input type="text" value={form.ville} onChange={maj('ville')} placeholder="ex : Douala" />
            </div>
            <div className={`${styles.inputGroup} ${styles.colSpan2}`}>
              <label>Adresse</label>
              <input type="text" value={form.adresse} onChange={maj('adresse')} placeholder="ex : Rue de la Joie, Bonapriso" />
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}><Phone size={17} /> Contact</h2>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label><Globe size={13} /> Site web</label>
              <input type="text" value={form.site_web} onChange={maj('site_web')} placeholder="https://…" />
            </div>
            <div className={styles.inputGroup}>
              <label>Email de contact</label>
              <input type="email" value={form.email_contact} onChange={maj('email_contact')} placeholder="contact@etablissement.cm" />
            </div>
            <div className={styles.inputGroup}>
              <label>Téléphone</label>
              <input type="text" value={form.telephone} onChange={maj('telephone')} placeholder="+237 6…" />
            </div>
          </div>
        </section>

        {/* ── Description ── */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}><FileText size={17} /> Description</h2>
          <textarea
            className={styles.textarea}
            rows={4}
            value={form.description}
            onChange={maj('description')}
            placeholder="Présentation courte de l'établissement, visible sur les pages publiques."
          />
        </section>

        {erreurEnvoi && <p className={styles.errorBanner}><AlertTriangle size={16} /> {erreurEnvoi}</p>}

        <div className={styles.footer}>
          {enregistre && <span className={styles.savedTag}><CheckCircle2 size={15} /> Enregistré</span>}
          <button type="submit" className={styles.saveBtn} disabled={!modifie || enregistrement}>
            {enregistrement && <Loader2 size={15} className={styles.spin} />}
            {enregistrement ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
