import { useEffect, useState } from 'react';
import { Rows3, Rows4, FileCheck2, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../../core/auth/useAuth';
import { listerTypesDocument } from '../../core/types-document/types-document.api';
import { lirePreferences, ecrirePreferences } from '../../core/preferences/preferences';
import styles from './Parametres_Agent.module.css';

// Preferences locales a cet appareil (localStorage, cf. core/preferences) —
// aucun backend ne persiste de preferences de saisie pour agent_saisie/directeur_pedagogique
// (seuls profil/mot de passe/sessions existent, deja couverts par "Mon Compte").
// Consommees par EmissionDiplome (type par defaut + confirmation) et
// ListeDocuments/RegistreLocal (densite du tableau).
export default function ParametresAgent() {
  const { utilisateur } = useAuth();
  const universiteId = utilisateur?.universite?.id;

  const [prefs, setPrefs] = useState(() => lirePreferences());
  const [typesDocument, setTypesDocument] = useState([]);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    let annule = false;
    listerTypesDocument({ universiteId })
      .then((types) => { if (!annule) setTypesDocument(types ?? []); })
      .catch(() => { /* referentiel optionnel pour cette page — champ desactive si indisponible */ });
    return () => { annule = true; };
  }, [universiteId]);

  const majPref = (partiel) => {
    const suivantes = ecrirePreferences(partiel);
    setPrefs(suivantes);
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 1800);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Paramètres</h1>
        <p className={styles.subtitle}>
          Préférences de saisie propres à cet appareil et ce navigateur — elles ne sont pas
          synchronisées entre vos sessions. Pour votre profil, votre mot de passe ou vos
          notifications, voir <strong>Mon compte</strong>.
        </p>
      </div>

      {enregistre && <div className={styles.savedToast}>Préférence enregistrée sur cet appareil</div>}

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Rows3 size={18} />
          <div>
            <h2 className={styles.sectionTitle}>Registre local</h2>
            <p className={styles.sectionDesc}>Densité d'affichage du tableau des documents.</p>
          </div>
        </div>

        <div className={styles.segmented}>
          <button
            type="button"
            className={prefs.densiteRegistre === 'confortable' ? styles.segmentActive : styles.segment}
            onClick={() => majPref({ densiteRegistre: 'confortable' })}
          >
            <Rows4 size={16} /> Confortable
          </button>
          <button
            type="button"
            className={prefs.densiteRegistre === 'compact' ? styles.segmentActive : styles.segment}
            onClick={() => majPref({ densiteRegistre: 'compact' })}
          >
            <Rows3 size={16} /> Compact
          </button>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <FileCheck2 size={18} />
          <div>
            <h2 className={styles.sectionTitle}>Formulaire d'émission</h2>
            <p className={styles.sectionDesc}>Accélère la saisie répétitive d'un même type de diplôme.</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Type de document pré-sélectionné</label>
          <select
            className={styles.select}
            value={prefs.typeDocumentParDefaut}
            onChange={(e) => majPref({ typeDocumentParDefaut: e.target.value })}
            disabled={typesDocument.length === 0}
          >
            <option value="">Aucun (choisir à chaque fois)</option>
            {typesDocument.map((t) => (
              <option key={t.id} value={t.nom}>{t.nom}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <ShieldQuestion size={18} />
          <div>
            <h2 className={styles.sectionTitle}>Sécurité de saisie</h2>
            <p className={styles.sectionDesc}>Un garde-fou avant d'envoyer un diplôme en validation.</p>
          </div>
        </div>

        <div className={styles.toggleRow}>
          <div>
            <strong>Demander confirmation avant de soumettre un diplôme</strong>
            <p>Une boîte de dialogue s'affichera à l'étape finale du formulaire d'émission.</p>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={prefs.confirmerAvantSoumission}
              onChange={(e) => majPref({ confirmerAvantSoumission: e.target.checked })}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
    </div>
  );
}
