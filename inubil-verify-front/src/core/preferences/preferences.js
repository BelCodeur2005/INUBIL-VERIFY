const STORAGE_KEY = 'inubil_preferences';

const DEFAUTS = {
  densiteRegistre: 'confortable', // 'confortable' | 'compact'
  typeDocumentParDefaut: '',      // nom du type de document (ex: 'Licence'), '' = aucun
  confirmerAvantSoumission: true,
};

/** Lit les preferences locales de l'agent (localStorage — aucun backend ne les persiste). */
export function lirePreferences() {
  try {
    const brut = localStorage.getItem(STORAGE_KEY);
    if (!brut) return { ...DEFAUTS };
    return { ...DEFAUTS, ...JSON.parse(brut) };
  } catch {
    return { ...DEFAUTS };
  }
}

/** Fusionne et sauvegarde les preferences locales de l'agent. */
export function ecrirePreferences(partiel) {
  const actuelles = lirePreferences();
  const suivantes = { ...actuelles, ...partiel };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suivantes));
  return suivantes;
}
