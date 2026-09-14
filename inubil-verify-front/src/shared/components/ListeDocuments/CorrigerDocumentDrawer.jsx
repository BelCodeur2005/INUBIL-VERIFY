import { useState } from 'react';
import { X, AlertTriangle, Upload, FileText, Trash2, Plus } from 'lucide-react';
import { modifierDocument, uploaderPdf } from '../../../core/documents/documents.api';
import { ApiError } from '../../../core/api/client';
// Reutilise les styles de bloc "matieres" (carte, grille, boutons) deja etablis dans
// le composeur d'emission — meme structure visuelle pour la correction d'un dossier.
import emissionStyles from '../EmissionDiplome/EmissionDiplome.module.css';
import styles from './CorrigerDocumentDrawer.module.css';

const RESULTATS_MATIERE = [
  { valeur: 'valide', label: 'Validé' },
  { valeur: 'ajourne', label: 'Ajourné' },
  { valeur: 'absent', label: 'Absent' },
  { valeur: 'dispense', label: 'Dispensé' },
];

const MATIERE_VIDE = {
  code_matiere: '', nom_matiere: '', credits: '', semestre: '',
  note: '', note_max: '20', coefficient: '1', resultat: 'valide',
};

function versMatiereEditable(m) {
  return {
    code_matiere: m.code_matiere ?? '',
    nom_matiere: m.nom_matiere ?? '',
    credits: m.credits ?? '',
    semestre: m.semestre ?? '',
    note: m.note ?? '',
    note_max: m.note_max ?? '20',
    coefficient: m.coefficient ?? '1',
    resultat: m.resultat ?? 'valide',
  };
}

/**
 * Tiroir de correction d'un document rejete — édite les champs + le releve de
 * matieres (PATCH /documents/:id), puis reuploade le PDF corrige, ce qui repasse
 * automatiquement le document en "en_validation" et efface le motif de rejet
 * cote backend (documents.service.ts, uploadPdf()). Le nouveau PDF est donc
 * obligatoire : sans lui, la resoumission n'a pas lieu.
 */
export default function CorrigerDocumentDrawer({ doc, typeDocument, mentions, filieres, onClose, onResoumis }) {
  const aUneMention = typeDocument?.categorie === 'diplome';
  const aDesMatieres = Boolean(typeDocument?.a_matieres);

  const [filiereId, setFiliereId] = useState(doc.filiere_id ?? '');
  const [mentionId, setMentionId] = useState(doc.mention_id ?? '');
  const [dateEmission, setDateEmission] = useState(doc.date_emission ? doc.date_emission.slice(0, 10) : '');
  const [anneeAcademique, setAnneeAcademique] = useState(doc.annee_academique ?? '');
  const [lieuDelivrance, setLieuDelivrance] = useState(doc.lieu_delivrance ?? '');
  const [matieres, setMatieres] = useState(
    (doc.matieres_document ?? []).map(versMatiereEditable),
  );
  const [fichierPdf, setFichierPdf] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const ajouterMatiere = () => setMatieres((prev) => [...prev, { ...MATIERE_VIDE }]);
  const retirerMatiere = (idx) => setMatieres((prev) => prev.filter((_, i) => i !== idx));
  const majMatiere = (idx, champ) => (e) => {
    const valeur = e.target.value;
    setMatieres((prev) => prev.map((m, i) => (i === idx ? { ...m, [champ]: valeur } : m)));
  };

  const handleFileChange = (e) => {
    const fichier = e.target.files[0];
    if (fichier && fichier.type !== 'application/pdf') {
      setErreur('Le fichier doit être un PDF.');
      return;
    }
    setErreur(null);
    setFichierPdf(fichier ?? null);
  };

  const soumettre = async (e) => {
    e.preventDefault();
    if (!fichierPdf) {
      setErreur('Un nouveau PDF corrigé est requis pour resoumettre ce dossier.');
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      await modifierDocument(doc.id, {
        date_emission: dateEmission || undefined,
        annee_academique: anneeAcademique || undefined,
        lieu_delivrance: lieuDelivrance || undefined,
        filiere_id: filiereId || undefined,
        mention_id: aUneMention ? (mentionId || undefined) : undefined,
        ...(aDesMatieres
          ? {
              matieres: matieres.map((m, i) => ({
                code_matiere: m.code_matiere.trim() || undefined,
                nom_matiere: m.nom_matiere.trim(),
                credits: m.credits !== '' ? Number(m.credits) : undefined,
                semestre: m.semestre !== '' ? Number(m.semestre) : undefined,
                note: m.note !== '' ? Number(m.note) : undefined,
                note_max: m.note_max !== '' ? Number(m.note_max) : undefined,
                coefficient: m.coefficient !== '' ? Number(m.coefficient) : undefined,
                resultat: m.resultat,
                ordre: i,
              })),
            }
          : {}),
      });
      await uploaderPdf(doc.id, fichierPdf);
      onResoumis();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Impossible d'enregistrer les corrections.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div>
            <h3>Corriger et resoumettre</h3>
            <span className={styles.mono}>{doc.numero_unique}</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {doc.motif_rejet && (
          <div className={styles.motifBox}>
            <AlertTriangle size={16} />
            <div>
              <strong>Motif du rejet</strong>
              <p>{doc.motif_rejet}</p>
            </div>
          </div>
        )}

        <form onSubmit={soumettre} className={styles.form}>
          {erreur && <p className={styles.errorText}><AlertTriangle size={14} /> {erreur}</p>}

          <div className={styles.formGrid}>
            <label>Filière
              <select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
                <option value="">Choisir...</option>
                {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </label>
            {aUneMention && (
              <label>Mention
                <select value={mentionId} onChange={(e) => setMentionId(e.target.value)}>
                  <option value="">Aucune</option>
                  {mentions.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </label>
            )}
            <label>Date d'émission
              <input type="date" value={dateEmission} onChange={(e) => setDateEmission(e.target.value)} />
            </label>
            <label>Année académique
              <input type="text" value={anneeAcademique} onChange={(e) => setAnneeAcademique(e.target.value)} placeholder="2025-2026" />
            </label>
            <label>Lieu de délivrance
              <input type="text" value={lieuDelivrance} onChange={(e) => setLieuDelivrance(e.target.value)} placeholder="Douala, Cameroun" />
            </label>
          </div>

          {aDesMatieres && (
            <div className={emissionStyles.matieresBlock}>
              <div className={emissionStyles.matieresHeader}>
                <h3 className={emissionStyles.matieresTitle}>Relevé de matières</h3>
                <div className={emissionStyles.matieresActions}>
                  <button type="button" className={emissionStyles.addMatiereBtn} onClick={ajouterMatiere}>
                    <Plus size={14} /> Ajouter une matière
                  </button>
                </div>
              </div>

              {matieres.length === 0 ? (
                <div className={emissionStyles.matieresEmpty}>
                  <AlertTriangle size={16} /> Aucune matière renseignée.
                </div>
              ) : (
                <div className={emissionStyles.matiereTable}>
                  {matieres.map((m, idx) => (
                    <div className={emissionStyles.matiereCard} key={idx}>
                      <div className={emissionStyles.matiereCardTop}>
                        <input
                          type="text"
                          className={emissionStyles.matiereCode}
                          value={m.code_matiere}
                          onChange={majMatiere(idx, 'code_matiere')}
                          placeholder="Code"
                        />
                        <input
                          type="text"
                          className={emissionStyles.matiereNomInput}
                          value={m.nom_matiere}
                          onChange={majMatiere(idx, 'nom_matiere')}
                          placeholder="Nom de la matière"
                        />
                        <button type="button" className={emissionStyles.removeMatiereBtn} title="Retirer" onClick={() => retirerMatiere(idx)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className={emissionStyles.matiereCardGrid}>
                        <label>Crédits
                          <input type="number" min={0} value={m.credits} onChange={majMatiere(idx, 'credits')} />
                        </label>
                        <label>Semestre
                          <input type="number" min={1} max={6} value={m.semestre} onChange={majMatiere(idx, 'semestre')} />
                        </label>
                        <label>Note
                          <input type="number" min={0} step="0.01" value={m.note} onChange={majMatiere(idx, 'note')} />
                        </label>
                        <label>Barème
                          <input type="number" min={1} step="0.5" value={m.note_max} onChange={majMatiere(idx, 'note_max')} />
                        </label>
                        <label>Coeff.
                          <input type="number" min={0} step="0.5" value={m.coefficient} onChange={majMatiere(idx, 'coefficient')} />
                        </label>
                        <label>Résultat
                          <select value={m.resultat} onChange={majMatiere(idx, 'resultat')}>
                            {RESULTATS_MATIERE.map((r) => <option key={r.valeur} value={r.valeur}>{r.label}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={styles.uploadSection}>
            <label className={styles.uploadLabel} htmlFor="pdf-correction">
              <Upload size={14} /> Nouveau PDF corrigé (obligatoire pour resoumettre)
            </label>
            <input id="pdf-correction" type="file" accept=".pdf" onChange={handleFileChange} />
            {fichierPdf && (
              <p className={styles.fileName}><FileText size={14} /> {fichierPdf.name}</p>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={envoi}>Annuler</button>
            <button type="submit" className={styles.submitBtn} disabled={envoi}>
              {envoi ? 'Envoi…' : 'Corriger et resoumettre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
