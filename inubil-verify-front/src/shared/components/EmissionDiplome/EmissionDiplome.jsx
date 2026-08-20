import { useRef, useState } from 'react';
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
} from 'lucide-react';
import styles from './EmissionDiplome.module.css';

// Stepper d'émission de diplôme — remplace l'ancienne modale (Ajout_Unitaire.jsx)
// qui ne rendait pas justice au flux réel du backend, intrinsèquement séquentiel :
// POST /etudiants-admin (si nouvel étudiant) -> POST /documents -> POST /documents/:id/pdf.
// Contenu mock pour l'instant (docs/ROLES_ET_PAGES.md page #17) : pas d'appel API,
// seulement la structure et l'UX du flux en 4 étapes.

const STEPS = [
  { id: 1, label: 'Étudiant', icon: UserPlus },
  { id: 2, label: 'Diplôme', icon: GraduationCap },
  { id: 3, label: 'Document', icon: FileUp },
  { id: 4, label: 'Récapitulatif', icon: ClipboardCheck },
];

const MOCK_ETUDIANTS = [
  { id: 1, nom: 'KOUAM', prenom: 'Jean', matricule: 'INUB-2023-0412', filiere: 'Licence Pro DAWII' },
  { id: 2, nom: 'MBALLA', prenom: 'Sandrine', matricule: 'INUB-2023-0388', filiere: 'Licence Pro DAWII' },
  { id: 3, nom: 'TCHOUA', prenom: 'Paul', matricule: 'INUB-2022-0221', filiere: 'Master Réseaux & Sécurité' },
  { id: 4, nom: 'EBONE', prenom: 'Christine', matricule: 'INUB-2023-0455', filiere: 'Licence Pro DAWII' },
];

const TYPES_DOCUMENT = ['Licence / Bachelor', 'Master / Ingénieur', 'Doctorat / PhD', 'Attestation de Réussite'];
const MENTIONS = ['Très Bien', 'Bien', 'Assez Bien', 'Passable'];

export default function EmissionDiplome() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const [studentMode, setStudentMode] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({ nom: '', prenom: '', matricule: '', dateNaissance: '', sexe: '' });

  const [diplome, setDiplome] = useState({ type: '', specialite: '', mention: '', dateObtention: '', anneeAcademique: '' });

  const [selectedFile, setSelectedFile] = useState(null);

  const etudiant = studentMode === 'search' ? selectedStudent : (
    newStudent.nom && newStudent.prenom ? { ...newStudent, id: 'new' } : null
  );

  const step1Valid = studentMode === 'search'
    ? !!selectedStudent
    : Boolean(newStudent.nom && newStudent.prenom && newStudent.matricule && newStudent.dateNaissance && newStudent.sexe);
  const step2Valid = Boolean(diplome.type && diplome.specialite && diplome.mention && diplome.dateObtention && diplome.anneeAcademique);
  const step3Valid = Boolean(selectedFile);

  const stepValidity = { 1: step1Valid, 2: step2Valid, 3: step3Valid, 4: true };

  const filteredEtudiants = MOCK_ETUDIANTS.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(q);
  });

  const goNext = () => {
    if (!stepValidity[currentStep]) return;
    if (currentStep === 4) {
      setSubmitted(true);
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
    4: 'Émettre le diplôme',
  }[currentStep];

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}><Sparkles size={28} /></div>
          <h2 className={styles.successTitle}>Dossier prêt pour émission</h2>
          <p className={styles.successText}>
            Le diplôme de <strong>{etudiant?.prenom} {etudiant?.nom}</strong> a été préparé.
            La création réelle (ancrage blockchain + génération PDF) sera branchée à l'étape suivante.
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setSubmitted(false);
              setCurrentStep(1);
              setStudentMode('search');
              setSelectedStudent(null);
              setSearchQuery('');
              setNewStudent({ nom: '', prenom: '', matricule: '', dateNaissance: '', sexe: '' });
              setDiplome({ type: '', specialite: '', mention: '', dateObtention: '', anneeAcademique: '' });
              setSelectedFile(null);
            }}
          >
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
                    placeholder="Nom, prénom ou matricule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.resultsList}>
                  {filteredEtudiants.length === 0 && (
                    <p className={styles.noResults}>Aucun étudiant trouvé — essayez « Créer un nouveau dossier ».</p>
                  )}
                  {filteredEtudiants.map((e) => (
                    <button
                      type="button"
                      key={e.id}
                      className={`${styles.resultCard} ${selectedStudent?.id === e.id ? styles.resultCardSelected : ''}`}
                      onClick={() => setSelectedStudent(e)}
                    >
                      <div className={styles.resultAvatar}>{e.prenom.charAt(0)}{e.nom.charAt(0)}</div>
                      <div className={styles.resultTexts}>
                        <strong>{e.prenom} {e.nom}</strong>
                        <span>{e.matricule} — {e.filiere}</span>
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
                  <input type="text" value={newStudent.matricule} onChange={(e) => setNewStudent({ ...newStudent, matricule: e.target.value })} placeholder="INUB-2026-XXXX" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Date de naissance</label>
                  <input type="date" value={newStudent.dateNaissance} onChange={(e) => setNewStudent({ ...newStudent, dateNaissance: e.target.value })} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Sexe</label>
                  <select value={newStudent.sexe} onChange={(e) => setNewStudent({ ...newStudent, sexe: e.target.value })}>
                    <option value="" disabled>Sélectionner...</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

        {currentStep === 2 && (
          <section className={styles.card}>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Type de diplôme</label>
                <select value={diplome.type} onChange={(e) => setDiplome({ ...diplome, type: e.target.value })}>
                  <option value="" disabled>Choisir...</option>
                  {TYPES_DOCUMENT.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={`${styles.inputGroup} ${styles.colSpan2}`}>
                <label>Domaine d'études / Spécialité</label>
                <input type="text" value={diplome.specialite} onChange={(e) => setDiplome({ ...diplome, specialite: e.target.value })} placeholder="ex : Génie Logiciel et Systèmes d'Information" />
              </div>
              <div className={styles.inputGroup}>
                <label>Mention</label>
                <select value={diplome.mention} onChange={(e) => setDiplome({ ...diplome, mention: e.target.value })}>
                  <option value="" disabled>Choisir...</option>
                  {MENTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Date d'obtention</label>
                <input type="date" value={diplome.dateObtention} onChange={(e) => setDiplome({ ...diplome, dateObtention: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label>Année académique</label>
                <input type="text" value={diplome.anneeAcademique} onChange={(e) => setDiplome({ ...diplome, anneeAcademique: e.target.value })} placeholder="ex : 2025-2026" />
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
                <p className={styles.recapMuted}>{etudiant?.matricule}{etudiant?.filiere ? ` — ${etudiant.filiere}` : ''}</p>
              </div>
              <div className={styles.recapBlock}>
                <h3 className={styles.recapTitle}><GraduationCap size={16} /> Diplôme</h3>
                <p><strong>{diplome.type}</strong></p>
                <p className={styles.recapMuted}>{diplome.specialite}</p>
                <p className={styles.recapMuted}>Mention {diplome.mention} — {diplome.anneeAcademique}</p>
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
          </section>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.footer}>
        <button type="button" className={styles.backBtn} onClick={goBack} disabled={currentStep === 1}>
          <ChevronLeft size={16} /> Retour
        </button>
        <button type="button" className={styles.primaryBtn} onClick={goNext} disabled={!stepValidity[currentStep]}>
          {nextLabel} {currentStep < 4 && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
