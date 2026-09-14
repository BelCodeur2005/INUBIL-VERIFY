// Applique la couleur de marque choisie par l'universite (config.couleur_primaire)
// sur les variables CSS globales definies dans index.css. Sans couleur personnalisee,
// les valeurs par defaut (bleu INUBIL) de :root s'appliquent telles quelles.

const VARIABLES = [
  '--color-primary',
  '--color-primary-rgb',
  '--color-primary-dark',
  '--color-primary-dark-rgb',
  '--color-primary-hover',
  '--color-primary-hover-rgb',
];

function hexVersRgb(hex) {
  const nettoye = hex.replace('#', '');
  const complet =
    nettoye.length === 3
      ? nettoye.split('').map((c) => c + c).join('')
      : nettoye;
  const entier = parseInt(complet, 16);
  return {
    r: (entier >> 16) & 255,
    g: (entier >> 8) & 255,
    b: entier & 255,
  };
}

function rgbVersHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const delta = max - min;
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslVersRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp, gp, bp;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function rgbVersHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Deduit une teinte "foncee" (fond sombre, texte titre) et une teinte "hover" (etats actifs/focus) a partir d'une couleur de base. */
function deriverNuances(hexBase) {
  const hsl = rgbVersHsl(hexVersRgb(hexBase));
  const foncee = hslVersRgb({ ...hsl, l: clamp01(hsl.l * 0.45) });
  const hover = hslVersRgb({ ...hsl, l: clamp01(hsl.l * 0.88) });
  return {
    primaire: hexVersRgb(hexBase),
    foncee,
    hover,
  };
}

const HEX_VALIDE = /^#[0-9a-fA-F]{6}$/;

/**
 * Applique (ou reinitialise) la couleur de marque sur les variables CSS globales.
 * @param {string|null|undefined} couleurPrimaire hex ('#0350bd') ou falsy pour revenir au defaut.
 */
export function applyColorTheme(couleurPrimaire) {
  const racine = document.documentElement;

  if (!couleurPrimaire || !HEX_VALIDE.test(couleurPrimaire)) {
    VARIABLES.forEach((nom) => racine.style.removeProperty(nom));
    return;
  }

  const { primaire, foncee, hover } = deriverNuances(couleurPrimaire);
  racine.style.setProperty('--color-primary', rgbVersHex(primaire));
  racine.style.setProperty(
    '--color-primary-rgb',
    `${primaire.r}, ${primaire.g}, ${primaire.b}`,
  );
  racine.style.setProperty('--color-primary-dark', rgbVersHex(foncee));
  racine.style.setProperty(
    '--color-primary-dark-rgb',
    `${foncee.r}, ${foncee.g}, ${foncee.b}`,
  );
  racine.style.setProperty('--color-primary-hover', rgbVersHex(hover));
  racine.style.setProperty(
    '--color-primary-hover-rgb',
    `${hover.r}, ${hover.g}, ${hover.b}`,
  );
}
