/// URL de base de l'API backend. Correspond au port expose par
/// `docker-compose up` (voir CLAUDE.md racine). Surchargable a la
/// compilation sans toucher au code :
/// `flutter run --dart-define=API_BASE_URL=https://mon-backend.example.com`
class ApiConfig {
  ApiConfig._();

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// URL du site web public (page de vérification /d/:id, /partage/:token).
  /// Distincte de [baseUrl] (l'API) — surchargable de la meme facon :
  /// `flutter build apk --dart-define=PUBLIC_VERIFY_URL=https://mon-site.example.com`
  static const publicSiteBaseUrl = String.fromEnvironment(
    'PUBLIC_VERIFY_URL',
    defaultValue: 'https://inubil-verify.onrender.com',
  );
}
