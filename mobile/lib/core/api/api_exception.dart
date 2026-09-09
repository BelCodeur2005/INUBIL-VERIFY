/// Erreur normalisee levee par [ApiClient] pour toute reponse HTTP non-2xx.
/// Miroir de la classe `ApiError` du client web (core/api/client.js) pour
/// garder le meme vocabulaire d'erreur entre les deux frontends.
class ApiException implements Exception {
  const ApiException(this.status, this.message, [this.details]);

  final int status;
  final String message;
  final dynamic details;

  @override
  String toString() => message;
}
