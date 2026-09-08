// Import CSV des matieres d'un releve de notes — pendant logique de l'export CSV
// admin (documents/etudiants/journal) mais cote saisie : la scolarite a presque
// toujours ces notes deja dans un tableur, plutot que de les retaper une par une
// via "Ajouter une matiere".

const ALIAS_CHAMPS = {
  code_matiere: ['code', 'code matiere', 'code_matiere'],
  nom_matiere: ['matiere', 'nom', 'nom matiere', 'nom_matiere', 'nom de la matiere', 'intitule'],
  credits: ['credits', 'credit'],
  semestre: ['semestre'],
  note: ['note'],
  note_max: ['bareme', 'note_max', 'note sur', 'sur'],
  coefficient: ['coefficient', 'coeff', 'coeff.'],
  resultat: ['resultat', 'statut'],
};

const RESULTATS_VALIDES = ['valide', 'ajourne', 'absent', 'dispense'];

const ALIAS_RESULTAT = {
  valide: 'valide', 'validé': 'valide', v: 'valide',
  ajourne: 'ajourne', 'ajourné': 'ajourne', aj: 'ajourne',
  absent: 'absent', abs: 'absent', a: 'absent',
  dispense: 'dispense', 'dispensé': 'dispense', disp: 'dispense', d: 'dispense',
};

/** Minuscules, sans accents, espaces superflus retires — pour un matching d'en-tete tolerant. */
function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Parseur CSV minimal mais robuste aux guillemets et aux deux delimiteurs usuels
 * (`;` — export Excel FR par defaut — ou `,`). Detecte le delimiteur sur l'en-tete.
 */
export function parserCsv(texte) {
  const texteNormalise = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte; // BOM eventuel
  const premiereLigne = texteNormalise.split(/\r?\n/)[0] ?? '';
  const nbPointVirgule = (premiereLigne.match(/;/g) ?? []).length;
  const nbVirgule = (premiereLigne.match(/,/g) ?? []).length;
  const delimiteur = nbPointVirgule >= nbVirgule ? ';' : ',';

  const lignes = [];
  let ligneCourante = [];
  let champCourant = '';
  let dansGuillemets = false;

  for (let i = 0; i < texteNormalise.length; i++) {
    const c = texteNormalise[i];
    const suivant = texteNormalise[i + 1];
    if (dansGuillemets) {
      if (c === '"' && suivant === '"') { champCourant += '"'; i++; }
      else if (c === '"') { dansGuillemets = false; }
      else champCourant += c;
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === delimiteur) {
      ligneCourante.push(champCourant);
      champCourant = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && suivant === '\n') i++;
      ligneCourante.push(champCourant);
      champCourant = '';
      lignes.push(ligneCourante);
      ligneCourante = [];
    } else {
      champCourant += c;
    }
  }
  if (champCourant !== '' || ligneCourante.length > 0) {
    ligneCourante.push(champCourant);
    lignes.push(ligneCourante);
  }

  return lignes.filter((l) => l.some((c) => c.trim() !== ''));
}

/**
 * Convertit les lignes CSV (en-tete + donnees) en tableau de matieres pretes pour
 * l'etat React du stepper. Tolerant sur l'ordre/l'intitule des colonnes (aliases
 * ci-dessus) — seule la colonne "Matiere"/"Nom" est obligatoire.
 * @throws {Error} si aucune colonne ne correspond a "nom_matiere".
 */
export function matieresDepuisCsv(texte) {
  const lignes = parserCsv(texte);
  if (lignes.length < 2) {
    throw new Error("Le fichier est vide ou ne contient aucune ligne de données.");
  }

  const [enTete, ...donnees] = lignes;
  const indexParChamp = {};
  enTete.forEach((colonne, idx) => {
    const colonneNormalisee = normaliser(colonne);
    for (const [champ, alias] of Object.entries(ALIAS_CHAMPS)) {
      if (champ in indexParChamp) continue;
      if (alias.includes(colonneNormalisee)) indexParChamp[champ] = idx;
    }
  });

  if (indexParChamp.nom_matiere === undefined) {
    throw new Error(
      'Colonne "Matière" introuvable — le fichier doit avoir une colonne Code, Matière, Crédits, Semestre, Note, Barème, Coefficient, Résultat.',
    );
  }

  const lire = (ligne, champ, defaut = '') =>
    indexParChamp[champ] !== undefined ? (ligne[indexParChamp[champ]] ?? '').trim() : defaut;

  const matieres = donnees
    .map((ligne) => {
      const nom_matiere = lire(ligne, 'nom_matiere');
      if (!nom_matiere) return null;

      const resultatBrut = normaliser(lire(ligne, 'resultat', 'valide'));
      const resultat = ALIAS_RESULTAT[resultatBrut] ?? (RESULTATS_VALIDES.includes(resultatBrut) ? resultatBrut : 'valide');

      return {
        code_matiere: lire(ligne, 'code_matiere'),
        nom_matiere,
        credits: lire(ligne, 'credits'),
        semestre: lire(ligne, 'semestre'),
        note: lire(ligne, 'note'),
        note_max: lire(ligne, 'note_max') || '20',
        coefficient: lire(ligne, 'coefficient') || '1',
        resultat,
      };
    })
    .filter(Boolean);

  if (matieres.length === 0) {
    throw new Error('Aucune ligne exploitable — vérifiez que la colonne "Matière" est bien renseignée.');
  }

  return matieres;
}

/** Modele CSV telechargeable (memes en-tetes que l'import), avec deux lignes d'exemple. */
export function genererModeleCsv() {
  const lignes = [
    ['Code', 'Matière', 'Crédits', 'Semestre', 'Note', 'Barème', 'Coefficient', 'Résultat'],
    ['ALG101', 'Algorithmique et Structures de Données', '5', '1', '14', '20', '3', 'Validé'],
    ['BDD101', 'Bases de Données', '4', '1', '9', '20', '2', 'Ajourné'],
  ];
  const BOM_UTF8 = '﻿';
  return BOM_UTF8 + lignes.map((l) => l.join(';')).join('\r\n');
}
