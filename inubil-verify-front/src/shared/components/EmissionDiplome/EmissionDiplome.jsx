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
} from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { rechercherEtudiants, creerEtudiant } from '../../../core/etudiants/etudiants.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { listerMentions } from '../../../core/mentions/mentions.api';
import { creerDocument, uploaderPdf } from '../../../core/documents/documents.api';
import { ApiError } from '../../../core/api/client';
import { lirePreferences } from '../../../core/preferences/preferences';
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

export default function EmissionDiplome() {
  const { utilisateur } = useAuth();
  const universiteId = utilisateur?.universite?.id;

  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

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
  const [loadingReferentiels, setLoadingReferentiels] = useState(true);
  const [referentielsError, setReferentielsError] = useState(null);
  const [diplome, setDiplome] = useState({ type_document_id: '', filiere: '', mention_id: '', date_emission: '', annee_academique: '' });
  const step2Valid = Boolean(diplome.type_document_id && diplome.filiere && diplome.date_emission);

  useEffect(() => {
    let annule = false;
    Promise.all([
      listerTypesDocument({ universiteId }),
      listerMentions({ universiteId }),
    ])
      .then(([types, mentionsRes]) => {
        if (annule) return;
        setTypesDocument(types ?? []);
        setMentions(mentionsRes ?? []);

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

  const resetWizard = () => {
    setSubmitResult(null);
    setSubmitError(null);
    setCurrentStep(1);
    setStudentMode('search');
    setSelectedStudent(null);
    setSearchQuery('');
    setSearchResults([]);
    setNewStudent({ nom: '', prenom: '', numero_etudiant: '', date_naissance: '' });
    setDiplome({ type_document_id: '', filiere: '', mention_id: '', date_emission: '', annee_academique: '' });
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
        filiere: diplome.filiere,
        ...(diplome.annee_academique ? { annee_academique: diplome.annee_academique } : {}),
        ...(diplome.mention_id ? { mention_id: diplome.mention_id } : {}),
      });

      const documentAvecPdf = await uploaderPdf(document.id, selectedFile);

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
          <button type="button" className={styles.primaryBtn} onClick={resetWizard}>
            Émettre un autre diplôme
          </button>
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
                <label>Domaine d'études / Spécialité</label>
                <input type="text" value={diplome.filiere} onChange={(e) => setDiplome({ ...diplome, filiere: e.target.value })} placeholder="ex : Génie Logiciel et Systèmes d'Information" />
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
                <p className={styles.recapMuted}>{diplome.filiere}</p>
                <p className={styles.recapMuted}>
                  {diplome.mention_id ? `Mention ${mentions.find((m) => m.id === diplome.mention_id)?.nom} — ` : ''}
                  {diplome.annee_academique}
                </p>
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
