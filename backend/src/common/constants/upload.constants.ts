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
