/**
 * Plafond dur applique par Multer au moment du parsing de l'upload (avant meme
 * que le controller/service ne s'execute) — non modifiable a chaud, c'est un
 * filet de securite anti-abus, pas un parametre metier.
 *
 * La limite reellement configurable (potentiellement plus stricte) est le
 * parametre systeme "pdf_max_taille_mo" (configurations), applique dans
 * DocumentsService.uploadPdf() et PublicVerifyService.verifierParUpload().
 */
export const PDF_HARD_LIMIT_BYTES = 20 * 1024 * 1024; // 20 Mo

/**
 * Plafond dur pour l'upload du logo d'un etablissement (universites.service.ts,
 * uploaderLogo) — une image de marque, pas un document, une limite modeste suffit
 * et evite qu'un fichier volumineux ralentisse chaque chargement de page.
 */
export const LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo
