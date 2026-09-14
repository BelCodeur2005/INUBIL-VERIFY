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
  CheckCircle2,
  XCircle,
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  FileSpreadsheet,
  Download,
  History,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../../core/auth/useAuth';
import { rechercherEtudiants, creerEtudiant } from '../../../core/etudiants/etudiants.api';
import { listerTypesDocument } from '../../../core/types-document/types-document.api';
import { listerMentions } from '../../../core/mentions/mentions.api';
import { listerFilieres } from '../../../core/filieres/filieres.api';
import { creerDocument, uploaderPdf, listerDocuments } from '../../../core/documents/documents.api';
import { ApiError } from '../../../core/api/client';
import { lirePreferences } from '../../../core/preferences/preferences';
import { matieresDepuisCsv, genererModeleCsv } from './matieresImport';
import { sauvegarderBrouillon, chargerBrouillon, effacerBrouillon, brouillonEstVide, formaterAge } from './brouillonEmission';
import styles from './EmissionDiplome.module.css';

// Stepper d'emission de diplome(s) — branche sur le backend reel :
// [creation etudiant si nouveau] -> pour chaque diplome de la liste :
// POST /documents -> POST /documents/:id/pdf.
// Un meme etudiant peut recevoir plusieurs diplomes en une seule session (ex :
// Licence + attestation) : l'etape 2 fait office de "composeur + file d'attente"
// - on remplit un diplome, on l'ajoute a la liste, on recommence autant de fois
// que necessaire, puis on emet tout d'un coup depuis le recapitulatif. Chaque
// diplome reste independant cote backend (pas d'endpoint batch : la liste est
// juste soumise en boucle, sequentiellement, avec un rapport par diplome).
// Chaque document reste en statut "brouillon" a l'issue de ce flux : la validation
// (ancrage blockchain, QR, activation) est une etape separee (POST /documents/:id/valider),
// reservee a directeur_pedagogique/responsable_universite (docs/ROLES_ET_PAGES.md).

const STEPS = [
  { id: 1, label: 'Étudiant', icon: UserPlus },
  { id: 2, label: 'Diplômes', icon: GraduationCap },
  { id: 3, label: 'Récapitulatif', icon: ClipboardCheck },
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

const DIPLOME_VIDE = { type_document_id: '', filiere_id: '', mention_id: '', date_emission: '', annee_academique: '' };

const LABEL_STATUT_DOUBLON = { brouillon: 'brouillon', en_validation: 'en validation', actif: 'actif' };

// Plafond serveur pour l'upload de PDF (documents.controller.ts, parametre systeme
// "pdf_max_taille_mo" — 20 Mo par defaut ET plafond serveur absolu, non depassable
// meme si un admin configure une valeur plus haute). Utilise ici comme limite cote
// client car agent_saisie n'a pas la permission config:read pour lire la valeur
// eventuellement plus stricte configuree par son universite.
const PDF_MAX_MO = 20;

const ANNEE_ACADEMIQUE_REGEX = /^(\d{4})-(\d{4})$/;

/** Une annee academique valide est soit vide, soit deux annees consecutives (ex: 2025-2026). */
function anneeAcademiqueValide(valeur) {
  if (!valeur) return true;
  const m = valeur.match(ANNEE_ACADEMIQUE_REGEX);
  return Boolean(m) && Number(m[2]) === Number(m[1]) + 1;
}

/**
 * Deduit l'annee academique a partir d'une date d'emission (convention camerounaise :
 * l'annee universitaire commence en septembre). Ex : 12/2026 ou 06/2027 -> "2026-2027".
 */
function anneeAcademiqueDepuisDate(dateIso) {
  if (!dateIso) return '';
  const [annee, mois] = dateIso.split('-').map(Number);
  return mois >= 9 ? `${annee}-${annee + 1}` : `${annee - 1}-${annee}`;
}

/** Verifie qu'un fichier est bien un PDF sous la limite de taille, avant meme de l'attacher au dossier. */
function validerFichierPdf(file) {
  const estPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!estPdf) return `« ${file.name} » n'est pas un fichier PDF.`;
  if (file.size > PDF_MAX_MO * 1024 * 1024) {
    return `« ${file.name} » (${(file.size / (1024 * 1024)).toFixed(1)} Mo) dépasse la limite de ${PDF_MAX_MO} Mo.`;
  }
  return null;
}

let compteurEntree = 0;
const nouvelIdEntree = () => `${Date.now()}-${(compteurEntree += 1)}`;

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

  // Verification du matricule au blur (avant de remplir tout le reste du dossier) : le
  // matricule est unique en base (numero_etudiant), donc un doublon echouera de toute
  // facon a la soumission finale — autant prevenir l'agent tout de suite plutot qu'apres
  // avoir saisi le diplome et attache le PDF.
  const [matriculeDoublon, setMatriculeDoublon] = useState(null);
  const verifierMatricule = async () => {
    const matricule = newStudent.numero_etudiant.trim();
    if (!matricule) { setMatriculeDoublon(null); return; }
    try {
      const res = await rechercherEtudiants(matricule);
      const existant = (res.data ?? []).find((e) => e.numero_etudiant === matricule);
      setMatriculeDoublon(existant ?? null);
    } catch {
      // non bloquant : un echec de cette verification ne doit jamais empecher la saisie
    }
  };

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
        setSearchError(err instanceof ApiError ? err.message : 'Recherche impossible, réessayez.');
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

  // ── Référentiels diplôme ──
  const [typesDocument, setTypesDocument] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loadingReferentiels, setLoadingReferentiels] = useState(true);
  const [referentielsError, setReferentielsError] = useState(null);

  // ── Composeur (le diplome en cours de saisie, pas encore ajoute a la liste) ──
  const [diplome, setDiplome] = useState(DIPLOME_VIDE);
  const typeSelectionne = typesDocument.find((t) => t.id === diplome.type_document_id);
  const aDesMatieres = Boolean(typeSelectionne?.a_matieres);

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

  // Tant que l'agent n'a jamais retouche l'annee academique a la main, elle est
  // recalculee automatiquement a chaque changement de date d'emission (convention
  // camerounaise : annee universitaire commencant en septembre) — evite les "2025-2026"
  // vs "2025/26" vs oublis qui fragmentaient les filtres par annee.
  const [anneeModifieeManuellement, setAnneeModifieeManuellement] = useState(false);
  const majDateEmission = (valeur) => {
    setDiplome((d) => ({
      ...d,
      date_emission: valeur,
      annee_academique: anneeModifieeManuellement ? d.annee_academique : anneeAcademiqueDepuisDate(valeur),
    }));
  };
  const majAnneeAcademique = (valeur) => {
    setAnneeModifieeManuellement(true);
    setDiplome((d) => ({ ...d, annee_academique: valeur }));
  };

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

  // Moyenne generale calculee automatiquement (note ponderee par coefficient, ramenee
  // sur 20 quel que soit le bareme de chaque matiere) — non modifiable manuellement,
  // pour eviter toute incoherence avec les notes saisies par matiere.
  const calculerMoyenne = (listeMatieres) => {
    const notees = listeMatieres.filter((m) => m.note !== '' && Number(m.note_max) > 0);
    if (notees.length === 0) return null;
    const sommePonderee = notees.reduce((acc, m) => acc + (Number(m.note) / Number(m.note_max)) * 20 * Number(m.coefficient || 1), 0);
    const sommeCoeff = notees.reduce((acc, m) => acc + Number(m.coefficient || 1), 0);
    if (sommeCoeff === 0) return null;
    return Math.round((sommePonderee / sommeCoeff) * 100) / 100;
  };
  const moyenneCalculee = calculerMoyenne(matieres);

  // ── Document du composeur ──
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  // ── Liste des diplomes deja ajoutes pour cet etudiant, en attente d'emission ──
  const [diplomesEnAttente, setDiplomesEnAttente] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);

  const reinitialiserComposeur = () => {
    setDiplome(DIPLOME_VIDE);
    setAnneeModifieeManuellement(false);
    setMatieres([]);
    setImportErreur(null);
    setSelectedFile(null);
    setFileError(null);
    setEditingEntryId(null);
  };

  const composerValid = Boolean(
    diplome.type_document_id && diplome.filiere_id && diplome.date_emission
    && anneeAcademiqueValide(diplome.annee_academique)
    && (!aDesMatieres || (matieres.length > 0 && matieres.every((m) => m.nom_matiere.trim())))
    && selectedFile,
  );

  const nomTypeDocument = (id) => typesDocument.find((t) => t.id === id)?.nom ?? '';
  const nomFiliere = (id) => filieres.find((f) => f.id === id)?.nom ?? '';
  const nomMention = (id) => mentions.find((m) => m.id === id)?.nom ?? '';

  // Deja present dans la liste (pas encore soumis) avec le meme type de diplome : le
  // controle serveur (doublon en base) ne peut pas voir ca puisque rien n'est encore
  // cree — c'est une verification purement locale a la session en cours.
  const dejaDansLaListe = diplome.type_document_id
    && diplomesEnAttente.some((e) => e.id !== editingEntryId && e.diplome.type_document_id === diplome.type_document_id);

  const ajouterOuMettreAJourEntree = () => {
    if (!composerValid) return;
    const entree = { id: editingEntryId ?? nouvelIdEntree(), diplome, matieres, selectedFile, moyenneCalculee };
    setDiplomesEnAttente((prev) => (
      editingEntryId
        ? prev.map((e) => (e.id === editingEntryId ? entree : e))
        : [...prev, entree]
    ));
    reinitialiserComposeur();
  };

  const modifierEntree = (entree) => {
    setDiplome(entree.diplome);
    setAnneeModifieeManuellement(true);
    setMatieres(entree.matieres);
    setSelectedFile(entree.selectedFile);
    setFileError(null);
    setEditingEntryId(entree.id);
  };

  const retirerEntree = (id) => {
    setDiplomesEnAttente((prev) => prev.filter((e) => e.id !== id));
    if (editingEntryId === id) reinitialiserComposeur();
  };

  const annulerEdition = () => reinitialiserComposeur();

  // Alerte non bloquante si un diplome du meme type existe deja pour cet etudiant en
  // base (brouillon/en_validation/actif). Le seul garde-fou existant (hash_sha256 unique)
  // ne bloque que si c'est exactement le meme fichier PDF, pas un second scan du
  // meme diplome. Ne s'applique qu'en mode "recherche" : un etudiant tout juste
  // cree via "Nouveau dossier" n'a par definition aucun document existant.
  const [doublonDetecte, setDoublonDetecte] = useState(null);

  useEffect(() => {
    if (studentMode !== 'search' || !selectedStudent?.id || !diplome.type_document_id) return;
    let annule = false;
    listerDocuments({ etudiantId: selectedStudent.id, typeDocumentId: diplome.type_document_id, limit: 5 })
      .then((res) => {
        if (annule) return;
        const existant = (res.items ?? []).find((d) => ['brouillon', 'en_validation', 'actif'].includes(d.statut));
        setDoublonDetecte(existant
          ? { ...existant, _pourEtudiantId: selectedStudent.id, _pourTypeId: diplome.type_document_id }
          : null);
      })
      .catch(() => {}); // non bloquant : un echec de cette verification ne doit jamais empecher la saisie
    return () => { annule = true; };
  }, [studentMode, selectedStudent?.id, diplome.type_document_id]);

  // Derive plutot que reinitialiser dans l'effet (evite un setState synchrone en tete d'effet,
  // et efface instantanement l'alerte si l'etudiant/le type change avant que la nouvelle
  // verification n'ait repondu).
  const doublonPertinent = doublonDetecte
    && doublonDetecte._pourEtudiantId === selectedStudent?.id
    && doublonDetecte._pourTypeId === diplome.type_document_id
    ? doublonDetecte
    : null;

  // Etape 2 : on peut continuer des qu'au moins un diplome est en liste. Un diplome en
  // cours de saisie mais valide est ajoute automatiquement en avancant (voir goNext),
  // pour ne jamais perdre silencieusement une saisie deja complete.
  const step2Valid = diplomesEnAttente.length > 0 || composerValid;
  // Au recapitulatif, chaque diplome de la liste doit avoir son fichier (un brouillon
  // repris ne restaure jamais le PDF, voir brouillonEmission.js) avant de pouvoir emettre.
  const tousLesFichiersPresents = diplomesEnAttente.every((e) => e.selectedFile);

  const stepValidity = { 1: step1Valid, 2: step2Valid, 3: tousLesFichiersPresents };

  // ── Soumission ──
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(null); // { fait, total }
  const [submitError, setSubmitError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  // Sauvegarde locale debattue (400ms), une fois que l'agent a explicitement choisi de
  // reprendre ou d'ecarter le brouillon precedent — jamais pendant l'ecran de succes.
  // Les fichiers PDF ne sont jamais serialisables : chaque entree de la liste perd son
  // selectedFile a la sauvegarde (voir brouillonEmission.js) et devra le rejoindre a
  // nouveau apres reprise.
  useEffect(() => {
    if (!brouillonTraite || submitResult) return;
    const timeout = setTimeout(() => {
      sauvegarderBrouillon({
        studentMode,
        selectedStudent,
        newStudent,
        diplome,
        anneeModifieeManuellement,
        matieres,
        diplomesEnAttente: diplomesEnAttente.map((e) => ({ ...e, selectedFile: null })),
        currentStep,
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [brouillonTraite, submitResult, studentMode, selectedStudent, newStudent, diplome, anneeModifieeManuellement, matieres, diplomesEnAttente, currentStep]);

  // Reinitialise tout : etudiant, liste de diplomes et composeur — pour emettre pour
  // un tout autre etudiant.
  const resetWizard = () => {
    setSubmitResult(null);
    setSubmitError(null);
    setSubmitProgress(null);
    setCurrentStep(1);
    setStudentMode('search');
    setSelectedStudent(null);
    setSearchQuery('');
    setSearchResults([]);
    setNewStudent({ nom: '', prenom: '', numero_etudiant: '', date_naissance: '' });
    setMatriculeDoublon(null);
    setDiplomesEnAttente([]);
    reinitialiserComposeur();
  };

  // Garde l'etudiant deja selectionne mais repart d'une liste vide, pour ajouter
  // encore des diplomes a la meme personne dans une nouvelle session.
  const ajouterEncorePourCetEtudiant = () => {
    setSubmitResult(null);
    setSubmitError(null);
    setSubmitProgress(null);
    setDiplomesEnAttente([]);
    reinitialiserComposeur();
    setCurrentStep(2);
  };

  const soumettreDossier = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitProgress({ fait: 0, total: diplomesEnAttente.length });
    try {
      let etudiantId = selectedStudent?.id;

      if (studentMode === 'create') {
        if (!universiteId) {
          throw new Error("Impossible de déterminer votre établissement, reconnectez-vous et réessayez.");
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

      // Sequentiel plutot qu'en parallele : un meme etudiant, une ecriture a la fois,
      // et un rapport par diplome fiable meme si l'un d'eux echoue en cours de route.
      const resultats = [];
      for (const entree of diplomesEnAttente) {
        try {
          const document = await creerDocument({
            etudiant_id: etudiantId,
            type_document_id: entree.diplome.type_document_id,
            date_emission: entree.diplome.date_emission,
            filiere_id: entree.diplome.filiere_id || undefined,
            ...(entree.diplome.annee_academique ? { annee_academique: entree.diplome.annee_academique } : {}),
            ...(entree.diplome.mention_id ? { mention_id: entree.diplome.mention_id } : {}),
            ...(entree.matieres.length > 0
              ? {
                  matieres: entree.matieres.map((m, i) => ({
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
                  ...(entree.moyenneCalculee !== null ? { moyenne_generale: entree.moyenneCalculee } : {}),
                }
              : {}),
          });
          const documentAvecPdf = await uploaderPdf(document.id, entree.selectedFile);
          resultats.push({
            entreeId: entree.id,
            ok: true,
            typeNom: nomTypeDocument(entree.diplome.type_document_id),
            numeroUnique: documentAvecPdf.numero_unique,
            hash: documentAvecPdf.hash_sha256,
          });
        } catch (err) {
          resultats.push({
            entreeId: entree.id,
            ok: false,
            typeNom: nomTypeDocument(entree.diplome.type_document_id),
            erreur: err instanceof ApiError ? err.message : (err.message || 'Une erreur est survenue.'),
          });
        }
        setSubmitProgress((p) => ({ fait: (p?.fait ?? 0) + 1, total: diplomesEnAttente.length }));
      }

      const echecs = resultats.filter((r) => !r.ok);
      if (echecs.length === 0) effacerBrouillon();
      // Les diplomes qui ont echoue restent en liste (avec leur PDF) pour un nouvel essai ;
      // ceux qui ont reussi en sont retires.
      setDiplomesEnAttente((prev) => prev.filter((e) => echecs.some((r) => r.entreeId === e.id)));

      setSubmitResult({
        etudiantNom: `${etudiant?.prenom ?? ''} ${etudiant?.nom ?? ''}`.trim(),
        resultats,
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : (err.message || 'Une erreur est survenue lors de l\'émission.'));
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (currentStep === 2 && composerValid) {
      // Un diplome valide en cours de saisie est ajoute silencieusement en avancant,
      // plutot que d'etre perdu si l'agent oublie de cliquer "Ajouter a la liste".
      ajouterOuMettreAJourEntree();
    }
    if (!stepValidity[currentStep] && !(currentStep === 2 && composerValid)) return;
    if (currentStep === 3) {
      if (lirePreferences().confirmerAvantSoumission
        && !window.confirm(`Confirmer l'émission de ${diplomesEnAttente.length} diplôme${diplomesEnAttente.length > 1 ? 's' : ''} ?`)) {
        return;
      }
      soumettreDossier();
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handleBrowseClick = () => fileInputRef.current?.click();
  const traiterFichierChoisi = (file) => {
    if (!file) return;
    const erreur = validerFichierPdf(file);
    if (erreur) {
      setFileError(erreur);
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };
  const handleFileChange = (e) => {
    traiterFichierChoisi(e.target.files[0]);
    e.target.value = ''; // permet de re-choisir le meme fichier corrige sans le renommer
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    traiterFichierChoisi(e.dataTransfer.files[0]);
  };

  const nextLabel = {
    1: 'Continuer vers les diplômes',
    2: 'Continuer vers le récapitulatif',
    3: submitting
      ? (submitProgress ? `Émission ${submitProgress.fait}/${submitProgress.total}...` : 'Émission en cours...')
      : `Émettre ${diplomesEnAttente.length || 1} diplôme${diplomesEnAttente.length > 1 ? 's' : ''}`,
  }[currentStep];

  if (submitResult) {
    const reussites = submitResult.resultats.filter((r) => r.ok);
    const echecs = submitResult.resultats.filter((r) => !r.ok);
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            {echecs.length === 0 ? <Sparkles size={28} /> : <AlertTriangle size={28} />}
          </div>
          <h2 className={styles.successTitle}>
            {echecs.length === 0
              ? `${reussites.length} diplôme${reussites.length > 1 ? 's' : ''} enregistré${reussites.length > 1 ? 's' : ''}`
              : `${reussites.length}/${submitResult.resultats.length} diplômes enregistrés`}
          </h2>
          <p className={styles.successText}>
            Dossier de <strong>{submitResult.etudiantNom}</strong>. Chaque diplôme reste en attente
            de validation avant ancrage blockchain.
          </p>

          <div className={styles.resultatsList}>
            {submitResult.resultats.map((r) => (
              <div key={r.entreeId} className={`${styles.resultatRow} ${r.ok ? styles.resultatRowOk : styles.resultatRowError}`}>
                {r.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  <strong>{r.typeNom}</strong>
                  {r.ok ? ` — ${r.numeroUnique}` : ` — ${r.erreur}`}
                </span>
              </div>
            ))}
          </div>

          {echecs.length > 0 && (
            <p className={styles.successHint}>
              Les diplômes en échec sont restés dans la liste d'attente : corrigez puis réessayez depuis « Ajouter un autre diplôme ».
            </p>
          )}

          <div className={styles.successActions}>
            {echecs.length > 0 ? (
              <button type="button" className={styles.primaryBtn} onClick={() => { setSubmitResult(null); setCurrentStep(3); }}>
                Revoir la liste en attente
              </button>
            ) : (
              <>
                <button type="button" className={styles.draftSecondaryBtn} onClick={ajouterEncorePourCetEtudiant}>
                  Ajouter un autre diplôme à cet étudiant
                </button>
                <button type="button" className={styles.primaryBtn} onClick={resetWizard}>
                  Émettre pour un autre étudiant
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (brouillonProposable) {
    const etapeAvancee = (brouillon.currentStep ?? 1) >= 2 && (brouillon.diplomesEnAttente?.length > 0);
    return (
      <div className={styles.page}>
        <div className={styles.draftCard}>
          <div className={styles.draftIcon}><History size={28} /></div>
          <h2 className={styles.draftTitle}>Brouillon en cours retrouvé</h2>
          <p className={styles.draftText}>
            Un dossier non terminé a été sauvegardé {formaterAge(brouillon.sauvegardeLe)} sur cet appareil.
            {etapeAvancee && ' Les PDF déjà attachés devront être rejoints à nouveau.'}
          </p>
          <div className={styles.draftActions}>
            <button
              type="button"
              className={styles.draftSecondaryBtn}
              onClick={() => { effacerBrouillon(); setBrouillonTraite(true); }}
            >
              Recommencer à zéro
            </button>
            <button
              type="button"
              className={`${styles.primaryBtn} ${styles.draftPrimaryBtn}`}
              onClick={() => {
                if (brouillon.studentMode) setStudentMode(brouillon.studentMode);
                if (brouillon.selectedStudent) setSelectedStudent(brouillon.selectedStudent);
                if (brouillon.newStudent) setNewStudent(brouillon.newStudent);
                if (brouillon.diplome) setDiplome(brouillon.diplome);
                if (brouillon.anneeModifieeManuellement) setAnneeModifieeManuellement(true);
                if (brouillon.matieres) setMatieres(brouillon.matieres);
                if (brouillon.diplomesEnAttente) setDiplomesEnAttente(brouillon.diplomesEnAttente);
                setCurrentStep(Math.min(brouillon.currentStep ?? 1, 2));
                setBrouillonTraite(true);
              }}
            >
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
        <h1 className={styles.title}>Émission de diplôme{diplomesEnAttente.length > 1 ? 's' : ''}</h1>
        <p className={styles.subtitle}>
          Renseignez le dossier en 3 étapes. Un même étudiant peut recevoir plusieurs diplômes en une seule fois.
        </p>
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
                    <p className={styles.noResults}>Aucun étudiant trouvé, essayez « Créer un nouveau dossier ».</p>
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
                        <span>{e.numero_etudiant}{e.universite_nom ? ` (${e.universite_nom})` : ''}</span>
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
                  <input
                    type="text"
                    value={newStudent.numero_etudiant}
                    onChange={(e) => { setNewStudent({ ...newStudent, numero_etudiant: e.target.value }); setMatriculeDoublon(null); }}
                    onBlur={verifierMatricule}
                    placeholder="INUB-2026-XXXX"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Date de naissance</label>
                  <input type="date" value={newStudent.date_naissance} onChange={(e) => setNewStudent({ ...newStudent, date_naissance: e.target.value })} />
                </div>
              </div>
            )}

            {studentMode === 'create' && matriculeDoublon && (
              <p className={styles.doublonWarning}>
                <AlertTriangle size={14} /> Ce matricule existe déjà : {matriculeDoublon.prenom} {matriculeDoublon.nom}. Utilisez plutôt « Rechercher un étudiant existant » ci-dessus.
              </p>
            )}
          </section>
        )}

        {currentStep === 2 && (
          <>
            {diplomesEnAttente.length > 0 && (
              <section className={styles.card}>
                <div className={styles.queueHeader}>
                  <h3 className={styles.queueTitle}>
                    <Layers size={16} /> Diplômes ajoutés pour {etudiant?.prenom} {etudiant?.nom}
                  </h3>
                  <span className={styles.queueCountBadge}>{diplomesEnAttente.length}</span>
                </div>
                <div className={styles.queueList}>
                  {diplomesEnAttente.map((e) => (
                    <div className={styles.queueItem} key={e.id}>
                      <div className={styles.queueItemIcon}><GraduationCap size={17} /></div>
                      <div className={styles.queueItemTexts}>
                        <strong>{nomTypeDocument(e.diplome.type_document_id)}</strong>
                        <span>
                          {nomFiliere(e.diplome.filiere_id)}
                          {e.diplome.mention_id ? ` · Mention ${nomMention(e.diplome.mention_id)}` : ''}
                        </span>
                        {e.selectedFile
                          ? <span>{e.selectedFile.name}</span>
                          : <span className={styles.queueItemMissingFile}><AlertTriangle size={12} /> Fichier PDF à rejoindre</span>}
                      </div>
                      <div className={styles.queueItemActions}>
                        <button type="button" className={styles.queueItemBtn} title="Modifier" onClick={() => modifierEntree(e)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.queueItemBtn} ${styles.queueItemBtnDanger}`}
                          title="Retirer"
                          onClick={() => retirerEntree(e.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className={styles.card}>
              {editingEntryId && (
                <div className={styles.editingBanner}>
                  <span><Pencil size={13} /> Modification d'un diplôme de la liste</span>
                  <button type="button" onClick={annulerEdition}>Annuler</button>
                </div>
              )}

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
                  <input type="date" value={diplome.date_emission} onChange={(e) => majDateEmission(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Année académique</label>
                  <input
                    type="text"
                    value={diplome.annee_academique}
                    onChange={(e) => majAnneeAcademique(e.target.value)}
                    placeholder="ex : 2025-2026"
                    aria-invalid={!anneeAcademiqueValide(diplome.annee_academique)}
                  />
                  {!anneeAcademiqueValide(diplome.annee_academique) && (
                    <span className={styles.champErreur}>Format attendu : AAAA-AAAA (deux années consécutives).</span>
                  )}
                </div>
              </div>

              {doublonPertinent && (
                <p className={styles.doublonWarning}>
                  <AlertTriangle size={14} />
                  {etudiant?.prenom} {etudiant?.nom} a déjà un document « {nomTypeDocument(diplome.type_document_id)} »
                  ({doublonPertinent.numero_unique}, {LABEL_STATUT_DOUBLON[doublonPertinent.statut] ?? doublonPertinent.statut}), vérifiez qu'il ne s'agit pas d'un doublon avant de continuer.
                </p>
              )}
              {!doublonPertinent && dejaDansLaListe && (
                <p className={styles.doublonWarning}>
                  <AlertTriangle size={14} /> Un diplôme « {nomTypeDocument(diplome.type_document_id)} » est déjà dans la liste ci-dessus pour cet étudiant.
                </p>
              )}

              {aDesMatieres && (
                <div className={styles.matieresBlock}>
                  <div className={styles.matieresHeader}>
                    <div>
                      <h3 className={styles.matieresTitle}><BookOpen size={16} /> Matières</h3>
                      <p className={styles.matieresSubtitle}>
                        Ce type de document affiche un relevé de notes, renseignez au moins une matière.
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
                      <AlertTriangle size={16} /> Aucune matière renseignée, cliquez sur « Ajouter une matière ».
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
                                placeholder="Nom de la matière, ex : Algorithmique"
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

              <div className={styles.composerDivider}><span>Document</span></div>

              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
              <div
                className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaDragging : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <FileUp size={28} className={styles.uploadIcon} />
                <p className={styles.uploadMainText}>Glissez-déposez le scan du diplôme (PDF)</p>
                <p className={styles.uploadSubText}>Taille maximale : {PDF_MAX_MO} Mo</p>
                <button type="button" className={styles.browseBtn} onClick={handleBrowseClick}>Parcourir les fichiers</button>
              </div>

              {fileError && <p className={styles.errorText}><AlertTriangle size={14} /> {fileError}</p>}

              {selectedFile && (
                <div className={styles.fileCard}>
                  <div className={styles.fileIconBox}><FileText size={20} /></div>
                  <div className={styles.fileDetails}>
                    <p className={styles.fileName}>{selectedFile.name}</p>
                    <p className={styles.fileStatus}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo, prêt</p>
                  </div>
                  <button type="button" className={styles.removeFileBtn} onClick={() => { setSelectedFile(null); setFileError(null); }}>
                    <X size={16} />
                  </button>
                </div>
              )}

              <button type="button" className={styles.addToQueueBtn} onClick={ajouterOuMettreAJourEntree} disabled={!composerValid}>
                <Plus size={16} /> {editingEntryId ? 'Enregistrer les modifications' : 'Ajouter à la liste'}
              </button>
            </section>
          </>
        )}

        {currentStep === 3 && (
          <section className={styles.card}>
            <div className={styles.recapBlock}>
              <h3 className={styles.recapTitle}><UserPlus size={16} /> Étudiant</h3>
              <p><strong>{etudiant?.prenom} {etudiant?.nom}</strong></p>
              <p className={styles.recapMuted}>{etudiant?.numero_etudiant}{etudiant?.universite_nom ? ` (${etudiant.universite_nom})` : ''}</p>
            </div>

            <h3 className={styles.recapTitle}>
              <GraduationCap size={16} /> {diplomesEnAttente.length} diplôme{diplomesEnAttente.length > 1 ? 's' : ''} à émettre
            </h3>
            <div className={styles.recapDiplomeList}>
              {diplomesEnAttente.map((e) => (
                <div className={styles.recapDiplomeCard} key={e.id}>
                  <strong>{nomTypeDocument(e.diplome.type_document_id)}</strong>
                  <span className={styles.recapMuted}>
                    {nomFiliere(e.diplome.filiere_id)}
                    {e.diplome.mention_id ? `, Mention ${nomMention(e.diplome.mention_id)}` : ''}
                    {e.diplome.annee_academique ? `, ${e.diplome.annee_academique}` : ''}
                  </span>
                  <span className={styles.recapMuted}>
                    {e.selectedFile ? e.selectedFile.name : 'Fichier PDF à rejoindre'}
                    {e.matieres.length > 0 ? ` · ${e.matieres.length} matière${e.matieres.length > 1 ? 's' : ''}` : ''}
                  </span>
                </div>
              ))}
            </div>

            {!tousLesFichiersPresents && (
              <p className={styles.errorText}>
                <AlertTriangle size={14} /> Certains diplômes doivent encore avoir leur PDF rejoint — modifiez-les depuis l'étape précédente.
              </p>
            )}

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
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={goNext}
          disabled={(!stepValidity[currentStep] && !(currentStep === 2 && composerValid)) || submitting}
        >
          {submitting && <Loader2 size={16} className={styles.spinnerIcon} />}
          {nextLabel} {currentStep < 3 && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}
