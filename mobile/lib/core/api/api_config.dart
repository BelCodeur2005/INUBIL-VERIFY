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
}
