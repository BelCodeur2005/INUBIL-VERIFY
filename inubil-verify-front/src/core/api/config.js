/**
 * URL de base de l'API backend. Doit etre definie dans .env (voir .env.example) —
 * pas de valeur par defaut silencieuse : mieux vaut echouer tot et clairement
 * que de pointer vers une URL de secours qui masquerait un .env manquant.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_URL n'est pas definie — copier .env.example vers .env et renseigner l'URL du backend.",
  );
}
