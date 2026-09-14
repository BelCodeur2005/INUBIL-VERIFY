// Sauvegarde locale (navigateur uniquement, aucun backend) du dossier en cours de
// saisie — protege contre une coupure reseau ou un onglet ferme par erreur apres
// avoir saisi 15 matieres. Un seul brouillon a la fois (le formulaire n'est de
// toute facon utilise que par un agent a la fois sur un poste donne).
//
// Le fichier PDF (selectedFile) n'est volontairement PAS sauvegarde : un File ne
// se serialise pas en JSON/localStorage — l'agent devra le rejoindre a nouveau
// en reprenant un brouillon qui en etait deja a l'etape Document.

const CLE_BROUILLON = 'inubil_emission_brouillon_v1';

export function sauvegarderBrouillon(etat) {
  try {
    localStorage.setItem(CLE_BROUILLON, JSON.stringify({ ...etat, sauvegardeLe: Date.now() }));
  } catch {
    // localStorage plein/indisponible (navigation privee...) — pas bloquant, on continue sans brouillon.
  }
}

export function chargerBrouillon() {
  try {
    const brut = localStorage.getItem(CLE_BROUILLON);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

export function effacerBrouillon() {
  try {
    localStorage.removeItem(CLE_BROUILLON);
  } catch {
    // ignore
  }
}

/** Un brouillon est "vide" (rien a proposer de reprendre) s'il n'a aucune donnee saisie. */
export function brouillonEstVide(brouillon) {
  if (!brouillon) return true;
  return (
    !brouillon.selectedStudent
    && !brouillon.newStudent?.nom
    && !brouillon.diplome?.type_document_id
    && !brouillon.diplome?.filiere_id
    && (brouillon.matieres ?? []).length === 0
    && (brouillon.diplomesEnAttente ?? []).length === 0
  );
}

export function formaterAge(timestampMs) {
  const minutes = Math.round((Date.now() - timestampMs) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  return `il y a ${heures} h`;
}
