import { useEffect, useRef, useState } from 'react';
import {
  Search,
  UserPlus,
  Check,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  FileUp,
  FileText,
  X,
  ClipboardCheck,
  Sparkles,
  Loader2,
  AlertTriangle,
  BookOpen,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  History,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { rechercherEtudiants, creerEtudiant } from '../../../core/etudiants/etudiants.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { listerMentions } from '../../../core/mentions/mentions.api';
import { listerFilieres } from '../../../core/filieres/filieres.api';
import { creerDocument, uploaderPdf } from '../../../core/documents/documents.api';
import { ApiError } from '../../../core/api/client';
import { lirePreferences } from '../../../core/preferences/preferences';
import { matieresDepuisCsv, genererModeleCsv } from './matieresImport';
import { sauvegarderBrouillon, chargerBrouillon, effacerBrouillon, brouillonEstVide, formaterAge } from './brouillonEmission';
import styles from './EmissionDiplome.module.css';

// Stepper d'emission de diplome — branche sur le backend reel :
// [creation etudiant si nouveau] -> POST /documents -> POST /documents/:id/pdf.
// Le document reste en statut "brouillon" a l'issue de ce flux : la validation
// (ancrage blockchain, QR, activation) est une etape separee (POST /documents/:id/valider),
// reservee a directeur_pedagogique/responsable_universite (docs/ROLES_ET_PAGES.md).

const STEPS = [
  { id: 1, label: 'Étudiant', icon: UserPlus },
  { id: 2, label: 'Diplôme', icon: GraduationCap },
  { id: 3, label: 'Document', icon: FileUp },
  { id: 4, label: 'Récapitulatif', icon: ClipboardCheck },
];

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

export default function EmissionDiplome() {
  const { utilisateur } = useAuth();
  const universiteId = utilisateur?.universite?.id;

  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Brouillon local (localStorage) — protege contre une coupure reseau/onglet ferme
  // par erreur en cours de saisie. Charge une seule fois au montage ; l'agent choisit
  // explicitement de le reprendre ou de recommencer avant que le stepper s'affiche.
  const [brouillon] = useState(() => chargerBrouillon());
  const [brouillonTraite, setBrouillonTraite] = useState(false);
  const brouillonProposable = !brouillonTraite && !brouillonEstVide(brouillon);

  // ── Étudiant ──
  const [studentMode, setStudentMode] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({ nom: '', prenom: '', numero_etudiant: '', date_naissance: '' });

  useEffect(() => {
    if (studentMode !== 'search') return;
    const q = searchQuery.trim();
    const timeout = setTimeout(async () => {
      if (q.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }
      setSearching(true);
      setSearchError(null);
      try {
        const res = await rechercherEtudiants(q);
        setSearchResults(res.data ?? []);
      } catch (err) {
        setSearchError(err instanceof ApiError ? err.message : 'Recherche impossible — réessayez.');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, studentMode]);

  const etudiant = studentMode === 'search'
    ? selectedStudent
    : (newStudent.nom && newStudent.prenom ? newStudent : null);

  const step1Valid = studentMode === 'search'
    ? !!selectedStudent
    : Boolean(newStudent.nom && newStudent.prenom && newStudent.numero_etudiant);

  // ── Diplôme (référentiels réels) ──
  const [typesDocument, setTypesDocument] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loadingReferentiels, setLoadingReferentiels] = useState(true);
  const [referentielsError, setReferentielsError] = useState(null);
  const [diplome, setDiplome] = useState({ type_document_id: '', filiere_id: '', mention_id: '', date_emission: '', annee_academique: '' });
  const typeSelectionne = typesDocument.find((t) => t.id === diplome.type_document_id);
  const aDesMatieres = Boolean(typeSelectionne?.a_matieres);

  const [matieres, setMatieres] = useState([]);
  const [importErreur, setImportErreur] = useState(null);
  const importInputRef = useRef(null);
  const ajouterMatiere = () => setMatieres((prev) => [...prev, { ...MATIERE_VIDE }]);
  const retirerMatiere = (idx) => setMatieres((prev) => prev.filter((_, i) => i !== idx));
  const majMatiere = (idx, champ) => (e) => {
    const valeur = e.target.value;
    setMatieres((prev) => prev.map((m, i) => (i === idx ? { ...m, [champ]: valeur } : m)));
  };

  const handleImportClick = () => importInputRef.current?.click();
  const handleImportFile = async (e) => {
    const fichier = e.target.files[0];
    e.target.value = ''; // permet de reimporter le meme fichier corrige sans le renommer
    if (!fichier) return;
    setImportErreur(null);
    try {
      const texte = await fichier.text();
      const importees = matieresDepuisCsv(texte);
      setMatieres(importees);
    } catch (err) {
      setImportErreur(err.message || "Impossible de lire ce fichier.");
    }
  };
  const handleTelechargerModele = () => {
    const csv = genererModeleCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'modele-releve-de-notes.csv';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
  };

  // Reprise du brouillon : le fichier PDF n'est jamais sauvegarde (voir brouillonEmission.js),
  // donc on ne restaure jamais directement a l'etape Document/Recapitulatif — l'agent est
  // ramene a l'etape Document pour rejoindre son fichier avant de continuer.
  const reprendreBrouillon = () => {
    if (brouillon.studentMode) setStudentMode(brouillon.studentMode);
    if (brouillon.selectedStudent) setSelectedStudent(brouillon.selectedStudent);
    if (brouillon.newStudent) setNewStudent(brouillon.newStudent);
    if (brouillon.diplome) setDiplome(brouillon.diplome);
    if (brouillon.matieres) setMatieres(brouillon.matieres);
    setCurrentStep(Math.min(brouillon.currentStep ?? 1, 3));
    setBrouillonTraite(true);
  };

  const demarrerAZero = () => {
    effacerBrouillon();
    setBrouillonTraite(true);
  };

  const step2Valid = Boolean(
    diplome.type_document_id && diplome.filiere_id && diplome.date_emission
    && (!aDesMatieres || (matieres.length > 0 && matieres.every((m) => m.nom_matiere.trim()))),
  );

  // Moyenne generale calculee automatiquement (note ponderee par coefficient, ramenee
  // sur 20 quel que soit le bareme de chaque matiere) — non modifiable manuellement,
  // pour eviter toute incoherence avec les notes saisies par matiere.
  const moyenneCalculee = (() => {
    const notees = matieres.filter((m) => m.note !== '' && Number(m.note_max) > 0);
    if (notees.length === 0) return null;
    const sommePonderee = notees.reduce((acc, m) => acc + (Number(m.note) / Number(m.note_max)) * 20 * Number(m.coefficient || 1), 0);
    const sommeCoeff = notees.reduce((acc, m) => acc + Number(m.coefficient || 1), 0);
    if (sommeCoeff === 0) return null;
    return Math.round((sommePonderee / sommeCoeff) * 100) / 100;
  })();

  useEffect(() => {
    let annule = false;
    Promise.all([
      listerTypesDocument({ universiteId }),
      listerMentions({ universiteId }),
      listerFilieres({ universiteId }),
    ])
      .then(([types, mentionsRes, filieresRes]) => {
        if (annule) return;
        setTypesDocument(types ?? []);
        setMentions(mentionsRes ?? []);
        setFilieres(filieresRes ?? []);

        const nomParDefaut = lirePreferences().typeDocumentParDefaut;
        if (nomParDefaut) {
          const correspondance = (types ?? []).find((t) => t.nom === nomParDefaut);
          if (correspondance) {
            setDiplome((d) => (d.type_document_id ? d : { ...d, type_document_id: correspondance.id }));
          }
        }
      })
      .catch((err) => {
        if (annule) return;
        setReferentielsError(err instanceof ApiError ? err.message : 'Impossible de charger les référentiels.');
      })
      .finally(() => {
        if (!annule) setLoadingReferentiels(false);
      });
    return () => { annule = true; };
  }, [universiteId]);

  // ── Document ──
  const [selectedFile, setSelectedFile] = useState(null);
  const step3Valid = Boolean(selectedFile);

  const stepValidity = { 1: step1Valid, 2: step2Valid, 3: step3Valid, 4: true };

  // ── Soumission ──
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  // Sauvegarde locale debattue (400ms), une fois que l'agent a explicitement choisi de
  // reprendre ou d'ecarter le brouillon precedent — jamais pendant l'ecran de succes.
  useEffect(() => {
    if (!brouillonTraite || submitResult) return;
    const timeout = setTimeout(() => {
      sauvegarderBrouillon({ studentMode, selectedStudent, newStudent, diplome, matieres, currentStep });
    }, 400);
    return () => clearTimeout(timeout);
  }, [brouillonTraite, submitResult, studentMode, selectedStudent, newStudent, diplome, matieres, currentStep]);

  // Reinitialise l'etudiant et le fichier, mais GARDE volontairement l'etape 2
  // (type de diplome, filiere, mention, date d'emission, annee academique) : une
  // session d'emission traite typiquement toute une promotion avec ces memes
  // informations, seuls l'etudiant et le PDF changent d'un diplome au suivant.
  // Les matieres restent reinitialisees : les notes sont propres a chaque etudiant.
  const resetWizard = () => {
    setSubmitResult(null);
    setSubmitError(null);
    setCurrentStep(1);
    setStudentMode('search');
    setSelectedStudent(null);
    setSearchQuery('');
    setSearchResults([]);
    setNewStudent({ nom: '', prenom: '', numero_etudiant: '', date_naissance: '' });
    setMatieres([]);
    setSelectedFile(null);
  };

  const soumettreDossier = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let etudiantId = selectedStudent?.id;

      if (studentMode === 'create') {
        if (!universiteId) {
          throw new Error("Impossible de déterminer votre établissement — reconnectez-vous et réessayez.");
        }
        const cree = await creerEtudiant({
          numero_etudiant: newStudent.numero_etudiant,
          nom: newStudent.nom,
          prenom: newStudent.prenom,
          universite_id: universiteId,
          ...(newStudent.date_naissance ? { date_naissance: newStudent.date_naissance } : {}),
        });
        etudiantId = cree.id;
      }

      const document = await creerDocument({
        etudiant_id: etudiantId,
        type_document_id: diplome.type_document_id,
        date_emission: diplome.date_emission,
        filiere_id: diplome.filiere_id || undefined,
        ...(diplome.annee_academique ? { annee_academique: diplome.annee_academique } : {}),
        ...(diplome.mention_id ? { mention_id: diplome.mention_id } : {}),
        ...(aDesMatieres && matieres.length > 0
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
              ...(moyenneCalculee !== null ? { moyenne_generale: moyenneCalculee } : {}),
            }
          : {}),
      });

      const documentAvecPdf = await uploaderPdf(document.id, selectedFile);

      effacerBrouillon();
      setSubmitResult({
        etudiantNom: `${etudiant?.prenom ?? ''} ${etudiant?.nom ?? ''}`.trim(),
        numeroUnique: documentAvecPdf.numero_unique,
        hash: documentAvecPdf.hash_sha256,
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : (err.message || 'Une erreur est survenue lors de l\'émission.'));
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (!stepValidity[currentStep]) return;
    if (currentStep === 4) {
      if (lirePreferences().confirmerAvantSoumission && !window.confirm('Confirmer la soumission de ce diplôme ?')) {
        return;
      }
      soumettreDossier();
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleBrowseClick = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const nextLabel = {
    1: 'Continuer vers les détails académiques',
    2: 'Continuer vers le document',
    3: 'Vérifier avant émission',
    4: submitting ? 'Émission en cours...' : 'Émettre le diplôme',
  }[currentStep];

  if (submitResult) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}><Sparkles size={28} /></div>
          <h2 className={styles.successTitle}>Diplôme enregistré</h2>
          <p className={styles.successText}>
            Le dossier de <strong>{submitResult.etudiantNom}</strong> a été créé
            ({submitResult.numeroUnique}). Le hash d'intégrité a été calculé
            (<code className={styles.hashInline}>{submitResult.hash?.slice(0, 16)}…</code>).
            Il reste en attente de validation avant ancrage blockchain.
          </p>
          <p className={styles.successHint}>
            Les informations du diplôme ({typesDocument.find((t) => t.id === diplome.type_document_id)?.nom}
            {diplome.filiere_id ? ` — ${filieres.find((f) => f.id === diplome.filiere_id)?.nom ?? ''}` : ''}) restent pré-remplies pour l'étudiant suivant.
          </p>
          <button type="button" className={styles.primaryBtn} onClick={resetWizard}>
            Émettre un autre diplôme
          </button>
        </div>
      </div>
    );
  }

  if (brouillonProposable) {
    const etapeAvancee = (brouillon.currentStep ?? 1) >= 3;
    return (
      <div className={styles.page}>
        <div className={styles.draftCard}>
          <div className={styles.draftIcon}><History size={28} /></div>
          <h2 className={styles.draftTitle}>Brouillon en cours retrouvé</h2>
          <p className={styles.draftText}>
            Un dossier non terminé a été sauvegardé {formaterAge(brouillon.sauvegardeLe)} sur cet appareil.
            {etapeAvancee && ' Le fichier PDF devra être rejoint à nouveau.'}
          </p>
          <div className={styles.draftActions}>
            <button type="button" className={styles.draftSecondaryBtn} onClick={demarrerAZero}>
              Recommencer à zéro
            </button>
            <button type="button" className={`${styles.primaryBtn} ${styles.draftPrimaryBtn}`} onClick={reprendreBrouillon}>
              Reprendre mon brouillon
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Émission d'un diplôme</h1>
        <p className={styles.subtitle}>Renseignez le dossier en 4 étapes — chaque étape est validée avant de passer à la suivante.</p>
      </div>

      {/* Rail de progression */}
      <div className={styles.stepRail}>
        {STEPS.map((step, idx) => {
          const state = step.id < currentStep ? 'done' : step.id === currentStep ? 'active' : 'upcoming';
          const StepIcon = step.icon;
          return (
            <div className={styles.stepRailItem} key={step.id}>
              <button
                type="button"
                className={`${styles.stepNode} ${styles[`stepNode_${state}`]}`}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                disabled={step.id >= currentStep}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {state === 'done' ? <Check size={16} /> : <StepIcon size={16} />}
              </button>
              <span className={`${styles.stepLabel} ${state === 'active' ? styles.stepLabelActive : ''}`}>{step.label}</span>
              {idx < STEPS.length - 1 && <div className={`${styles.stepTrack} ${step.id < currentStep ? styles.stepTrackDone : ''}`} />}
            </div>
          );
        })}
      </div>

      {/* Contenu de l'étape */}
      <div className={styles.stepContent} key={currentStep}>
        {currentStep === 1 && (
          <section className={styles.card}>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeBtn} ${studentMode === 'search' ? styles.modeBtnActive : ''}`}
                onClick={() => setStudentMode('search')}
              >
                <Search size={16} /> Rechercher un étudiant existant
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${studentMode === 'create' ? styles.modeBtnActive : ''}`}
                onClick={() => setStudentMode('create')}
              >
                <UserPlus size={16} /> Créer un nouveau dossier
              </button>
            </div>

            {studentMode === 'search' ? (
              <div className={styles.searchBlock}>
                <div className={styles.searchInputWrap}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Nom, prénom ou matricule (2 caractères min.)..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedStudent(null); }}
                    className={styles.searchInput}
                  />
                  {searching && <Loader2 size={16} className={styles.spinnerIcon} />}
                </div>

                {searchError && <p className={styles.errorText}><AlertTriangle size={14} /> {searchError}</p>}

                <div className={styles.resultsList}>
                  {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError && (
                    <p className={styles.noResults}>Aucun étudiant trouvé — essayez « Créer un nouveau dossier ».</p>
                  )}
                  {searchQuery.trim().length < 2 && (
                    <p className={styles.noResults}>Tapez au moins 2 caractères pour lancer la recherche.</p>
                  )}
                  {searchResults.map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      className={`${styles.resultCard} ${selectedStudent?.id === e.id ? styles.resultCardSelected : ''}`}
                      onClick={() => setSelectedStudent(e)}
                    >
                      <div className={styles.resultAvatar}>{e.prenom.charAt(0)}{e.nom.charAt(0)}</div>
                      <div className={styles.resultTexts}>
                        <strong>{e.prenom} {e.nom}</strong>
                        <span>{e.numero_etudiant}{e.universite_nom ? ` — ${e.universite_nom}` : ''}</span>
                      </div>
                      {selectedStudent?.id === e.id && <Check size={18} className={styles.resultCheck} />}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Nom de famille</label>
                  <input type="text" value={newStudent.nom} onChange={(e) => setNewStudent({ ...newStudent, nom: e.target.value })} placeholder="ex : KOUAM" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Prénoms</label>
                  <input type="text" value={newStudent.prenom} onChange={(e) => setNewStudent({ ...newStudent, prenom: e.target.value })} placeholder="ex : Jean-Pierre" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matricule</label>
                  <input type="text" value={newStudent.numero_etudiant} onChange={(e) => setNewStudent({ ...newStudent, numero_etudiant: e.target.value })} placeholder="INUB-2026-XXXX" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Date de naissance</label>
                  <input type="date" value={newStudent.date_naissance} onChange={(e) => setNewStudent({ ...newStudent, date_naissance: e.target.value })} />
                </div>
              </div>
            )}
          </section>
        )}

        {currentStep === 2 && (
          <section className={styles.card}>
            {referentielsError && <p className={styles.errorText}><AlertTriangle size={14} /> {referentielsError}</p>}
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Type de diplôme</label>
                <select
                  value={diplome.type_document_id}
                  onChange={(e) => setDiplome({ ...diplome, type_document_id: e.target.value })}
                  disabled={loadingReferentiels}
                >
                  <option value="" disabled>{loadingReferentiels ? 'Chargement...' : 'Choisir...'}</option>
                  {typesDocument.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>
              <div className={`${styles.inputGroup} ${styles.colSpan2}`}>
                <label>Filière</label>
                <select
                  value={diplome.filiere_id}
                  onChange={(e) => setDiplome({ ...diplome, filiere_id: e.target.value })}
                  disabled={loadingReferentiels}
                >
                  <option value="" disabled>{loadingReferentiels ? 'Chargement...' : 'Choisir...'}</option>
                  {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Mention</label>
                <select
                  value={diplome.mention_id}
                  onChange={(e) => setDiplome({ ...diplome, mention_id: e.target.value })}
                  disabled={loadingReferentiels}
                >
                  <option value="">{loadingReferentiels ? 'Chargement...' : 'Aucune'}</option>
                  {mentions.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Date d'émission</label>
                <input type="date" value={diplome.date_emission} onChange={(e) => setDiplome({ ...diplome, date_emission: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label>Année académique</label>
                <input type="text" value={diplome.annee_academique} onChange={(e) => setDiplome({ ...diplome, annee_academique: e.target.value })} placeholder="ex : 2025-2026" />
              </div>
            </div>

            {aDesMatieres && (
              <div className={styles.matieresBlock}>
                <div className={styles.matieresHeader}>
                  <div>
                    <h3 className={styles.matieresTitle}><BookOpen size={16} /> Matières</h3>
                    <p className={styles.matieresSubtitle}>
                      Ce type de document affiche un relevé de notes — renseignez au moins une matière.
                    </p>
                  </div>
                  <div className={styles.matieresActions}>
                    <input
                      type="file"
                      ref={importInputRef}
                      onChange={handleImportFile}
                      accept=".csv,text/csv"
                      style={{ display: 'none' }}
                    />
                    <button type="button" className={styles.importMatiereBtn} onClick={handleImportClick}>
                      <FileSpreadsheet size={14} /> Importer un fichier
                    </button>
                    <button type="button" className={styles.addMatiereBtn} onClick={ajouterMatiere}>
                      <Plus size={14} /> Ajouter une matière
                    </button>
                  </div>
                </div>

                {importErreur && (
                  <p className={styles.errorText}>
                    <AlertTriangle size={14} /> {importErreur}
                  </p>
                )}
                {matieres.length === 0 && (
                  <button type="button" className={styles.modeleLink} onClick={handleTelechargerModele}>
                    <Download size={12} /> Télécharger un modèle de fichier (CSV)
                  </button>
                )}

                {matieres.length === 0 ? (
                  <div className={styles.matieresEmpty}>
                    <AlertTriangle size={16} /> Aucune matière renseignée — cliquez sur « Ajouter une matière ».
                  </div>
                ) : (
                  <>
                    <div className={styles.matiereTable}>
                      {matieres.map((m, idx) => (
                        <div className={styles.matiereCard} key={idx}>
                          <div className={styles.matiereCardTop}>
                            <input
                              type="text"
                              className={styles.matiereCode}
                              value={m.code_matiere}
                              onChange={majMatiere(idx, 'code_matiere')}
                              placeholder="Code"
                            />
                            <input
                              type="text"
                              className={styles.matiereNomInput}
                              value={m.nom_matiere}
                              onChange={majMatiere(idx, 'nom_matiere')}
                              placeholder="Nom de la matière — ex : Algorithmique"
                            />
                            <button type="button" className={styles.removeMatiereBtn} title="Retirer" onClick={() => retirerMatiere(idx)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div className={styles.matiereCardGrid}>
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

                    <div className={styles.moyenneBar}>
                      <span>Moyenne générale calculée</span>
                      <strong>{moyenneCalculee !== null ? `${moyenneCalculee}/20` : '—'}</strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {currentStep === 3 && (
          <section className={styles.card}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
            <div
              className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaDragging : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <FileUp size={28} className={styles.uploadIcon} />
              <p className={styles.uploadMainText}>Glissez-déposez le scan du diplôme (PDF)</p>
              <p className={styles.uploadSubText}>Taille maximale : 10 Mo</p>
              <button type="button" className={styles.browseBtn} onClick={handleBrowseClick}>Parcourir les fichiers</button>
            </div>

            {selectedFile && (
              <div className={styles.fileCard}>
                <div className={styles.fileIconBox}><FileText size={20} /></div>
                <div className={styles.fileDetails}>
                  <p className={styles.fileName}>{selectedFile.name}</p>
                  <p className={styles.fileStatus}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo — prêt</p>
                </div>
                <button type="button" className={styles.removeFileBtn} onClick={() => setSelectedFile(null)}>
                  <X size={16} />
                </button>
              </div>
            )}
          </section>
        )}

        {currentStep === 4 && (
          <section className={styles.card}>
            <div className={styles.recapGrid}>
              <div className={styles.recapBlock}>
                <h3 className={styles.recapTitle}><UserPlus size={16} /> Étudiant</h3>
                <p><strong>{etudiant?.prenom} {etudiant?.nom}</strong></p>
                <p className={styles.recapMuted}>{etudiant?.numero_etudiant}{etudiant?.universite_nom ? ` — ${etudiant.universite_nom}` : ''}</p>
              </div>
              <div className={styles.recapBlock}>
                <h3 className={styles.recapTitle}><GraduationCap size={16} /> Diplôme</h3>
                <p><strong>{typesDocument.find((t) => t.id === diplome.type_document_id)?.nom}</strong></p>
                <p className={styles.recapMuted}>{filieres.find((f) => f.id === diplome.filiere_id)?.nom}</p>
                <p className={styles.recapMuted}>
                  {diplome.mention_id ? `Mention ${mentions.find((m) => m.id === diplome.mention_id)?.nom} — ` : ''}
                  {diplome.annee_academique}
                </p>
                {aDesMatieres && (
                  <p className={styles.recapMuted}>
                    {matieres.length} matière{matieres.length > 1 ? 's' : ''} renseignée{matieres.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className={styles.recapBlock}>
                <h3 className={styles.recapTitle}><FileText size={16} /> Document</h3>
                <p><strong>{selectedFile?.name}</strong></p>
                <p className={styles.recapMuted}>{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo` : ''}</p>
              </div>
            </div>
            <p className={styles.legalNotice}>
              En soumettant, vous certifiez l'exactitude des données vis-à-vis du registre institutionnel.
            </p>
            {submitError && <p className={styles.errorText}><AlertTriangle size={14} /> {submitError}</p>}
          </section>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.footer}>
        <button type="button" className={styles.backBtn} onClick={goBack} disabled={currentStep === 1 || submitting}>
          <ChevronLeft size={16} /> Retour
        </button>
        <button type="button" className={styles.primaryBtn} onClick={goNext} disabled={!stepValidity[currentStep] || submitting}>
          {submitting && <Loader2 size={16} className={styles.spinnerIcon} />}
          {nextLabel} {currentStep < 4 && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
