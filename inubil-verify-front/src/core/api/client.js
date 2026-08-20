import { API_BASE_URL } from './config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './token-storage';

/** Erreur normalisee levee par le client pour toute reponse HTTP non-2xx. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Extrait un message d'erreur lisible du corps de reponse NestJS ({ statusCode, message, error }). */
function extraireMessage(corps, statusFallback) {
  if (!corps) return `Erreur ${statusFallback}`;
  if (Array.isArray(corps.message)) return corps.message.join(', ');
  if (typeof corps.message === 'string') return corps.message;
  return `Erreur ${statusFallback}`;
}

async function parseCorpsReponse(response) {
  if (response.status === 204) return null;
  const texte = await response.text();
  if (!texte) return null;
  try {
    return JSON.parse(texte);
  } catch {
    return texte;
  }
}

let rafraichissementEnCours = null;

/** Echange le refresh token contre une nouvelle paire de jetons. Un seul appel concurrent a la fois. */
async function rafraichirJetons() {
  if (rafraichissementEnCours) return rafraichissementEnCours;

  rafraichissementEnCours = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError(401, 'Aucune session active');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      throw new ApiError(response.status, 'Session expiree, veuillez vous reconnecter');
    }

    const jetons = await parseCorpsReponse(response);
    setTokens(jetons);
    return jetons;
  })();

  try {
    return await rafraichissementEnCours;
  } finally {
    rafraichissementEnCours = null;
  }
}

/**
 * Effectue une requete vers l'API backend.
 * - Prefixe automatiquement API_BASE_URL
 * - Attache le token JWT courant (sauf si `auth: false`)
 * - Sur 401 : tente un rafraichissement du token puis rejoue la requete une fois
 * - Leve une ApiError normalisee pour toute reponse non-2xx
 *
 * @param {string} path - chemin relatif, ex: '/documents'
 * @param {object} [options]
 * @param {string} [options.method] - GET par defaut
 * @param {object} [options.body] - serialise en JSON automatiquement
 * @param {boolean} [options.auth] - false pour un appel public (endpoints /verify, /auth/login...)
 */
export async function apiRequest(path, { method = 'GET', body, auth = true, ...reste } = {}) {
  const estFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const executer = async () => {
    // FormData : laisser le navigateur poser son propre Content-Type (avec la boundary multipart).
    const headers = estFormData ? { ...reste.headers } : { 'Content-Type': 'application/json', ...reste.headers };
    if (auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...reste,
      method,
      headers,
      body: body === undefined ? undefined : estFormData ? body : JSON.stringify(body),
    });
  };

  let response = await executer();

  if (response.status === 401 && auth && getRefreshToken()) {
    try {
      await rafraichirJetons();
      response = await executer();
    } catch {
      // Rafraichissement echoue : on laisse la reponse 401 initiale suivre son cours ci-dessous.
    }
  }

  const corps = await parseCorpsReponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, extraireMessage(corps, response.status), corps);
  }

  return corps;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
