/** Une colonne d'export CSV : un intitulé et comment en extraire la valeur d'une ligne. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Echappe une valeur pour un champ CSV (guillemets, point-virgule, saut de ligne) et
 * neutralise l'injection de formule tableur : un champ commencant par = + - @ tab/CR
 * serait sinon interprete comme une formule par Excel/Sheets/LibreOffice a l'ouverture
 * (ex: un nom d'etudiant "=cmd|...'" saisi par un agent). Prefixe d'une apostrophe.
 */
function echapperChampCsv(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return '';
  let texte = String(valeur);
  if (/^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`;
  if (/["; \n\r]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/**
 * Construit un CSV (délimiteur `;` pour compatibilité Excel FR, BOM UTF-8 pour les accents).
 * `take(rows.length)` reste borné par l'appelant — cette fonction ne pagine pas.
 */
export function toCsv<T>(rows: T[], colonnes: CsvColumn<T>[]): string {
  const entete = colonnes.map((c) => echapperChampCsv(c.header)).join(';');
  const lignes = rows.map((row) =>
    colonnes.map((c) => echapperChampCsv(c.value(row))).join(';'),
  );
  const BOM_UTF8 = '﻿'; // force Excel a detecter l'encodage UTF-8 (accents corrects)
  return BOM_UTF8 + [entete, ...lignes].join('\r\n');
}
