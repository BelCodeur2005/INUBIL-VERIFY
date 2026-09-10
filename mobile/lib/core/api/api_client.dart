import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/token_storage.dart';
import 'api_config.dart';
import 'api_exception.dart';

/// Client HTTP vers l'API backend. Miroir de core/api/client.js (web) :
/// prefixe automatiquement [ApiConfig.baseUrl], attache le token JWT courant
/// (sauf `auth: false`), tente un rafraichissement sur 401 puis rejoue la
/// requete une fois, et leve une [ApiException] normalisee pour toute
/// reponse non-2xx.
class ApiClient {
  ApiClient._();

  /// Sans ceci, un backend injoignable (serveur eteint, mauvaise IP...) fait
  /// pendre indefiniment n'importe quel ecran — et bloque meme le demarrage
  /// de l'app (BootstrapScreen attend GET /auth/me avant de choisir un ecran).
  static const _delaiRequete = Duration(seconds: 20);

  static Future<void>? _rafraichissementEnCours;

  static Future<dynamic> get(String chemin, {bool auth = true}) =>
      _requete('GET', chemin, auth: auth);

  static Future<dynamic> post(String chemin, {Object? corps, bool auth = true}) =>
      _requete('POST', chemin, corps: corps, auth: auth);

  static Future<dynamic> patch(String chemin, {Object? corps, bool auth = true}) =>
      _requete('PATCH', chemin, corps: corps, auth: auth);

  static Future<dynamic> delete(String chemin, {bool auth = true}) =>
      _requete('DELETE', chemin, auth: auth);

  static Future<dynamic> _requete(
    String methode,
    String chemin, {
    Object? corps,
    required bool auth,
  }) async {
    var reponse = await _executer(methode, chemin, corps: corps, auth: auth);

    if (reponse.statusCode == 401 && auth && await TokenStorage.refreshToken != null) {
      try {
        await _rafraichirJetons();
        reponse = await _executer(methode, chemin, corps: corps, auth: auth);
      } catch (_) {
        // Rafraichissement echoue : la 401 initiale suit son cours ci-dessous.
      }
    }

    final corpsReponse = _parserCorps(reponse);

    if (reponse.statusCode < 200 || reponse.statusCode >= 300) {
      throw ApiException(reponse.statusCode, _extraireMessage(corpsReponse, reponse.statusCode), corpsReponse);
    }

    return corpsReponse;
  }

  static Future<http.Response> _executer(
    String methode,
    String chemin, {
    Object? corps,
    required bool auth,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$chemin');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final token = await TokenStorage.accessToken;
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    final corpsJson = corps == null ? null : jsonEncode(corps);

    switch (methode) {
      case 'GET':
        return http.get(uri, headers: headers).timeout(_delaiRequete);
      case 'POST':
        return http.post(uri, headers: headers, body: corpsJson).timeout(_delaiRequete);
      case 'PATCH':
        return http.patch(uri, headers: headers, body: corpsJson).timeout(_delaiRequete);
      case 'DELETE':
        return http.delete(uri, headers: headers).timeout(_delaiRequete);
      default:
        throw ArgumentError('Methode HTTP non supportee : $methode');
    }
  }

  /// Un seul rafraichissement concurrent a la fois — les requetes qui
  /// arrivent en 401 pendant qu'un rafraichissement est deja en vol
  /// attendent le meme Future plutot que d'en declencher un nouveau.
  static Future<void> _rafraichirJetons() {
    return _rafraichissementEnCours ??= _executerRafraichissement().whenComplete(() {
      _rafraichissementEnCours = null;
    });
  }

  static Future<void> _executerRafraichissement() async {
    final refreshToken = await TokenStorage.refreshToken;
    if (refreshToken == null) throw const ApiException(401, 'Aucune session active');

    final reponse = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    ).timeout(_delaiRequete);

    if (reponse.statusCode != 200) {
      await TokenStorage.effacer();
      throw ApiException(reponse.statusCode, 'Session expirée, veuillez vous reconnecter');
    }

    final jetons = jsonDecode(reponse.body) as Map<String, dynamic>;
    await TokenStorage.definirJetons(
      accessToken: jetons['access_token'] as String,
      refreshToken: jetons['refresh_token'] as String,
    );
  }

  static dynamic _parserCorps(http.Response reponse) {
    if (reponse.statusCode == 204 || reponse.body.isEmpty) return null;
    try {
      return jsonDecode(reponse.body);
    } catch (_) {
      return reponse.body;
    }
  }

  /// Extrait un message lisible du corps d'erreur NestJS
  /// (`{ statusCode, message, error }`, `message` string ou array).
  static String _extraireMessage(dynamic corps, int statusFallback) {
    if (corps is Map && corps['message'] != null) {
      final message = corps['message'];
      if (message is List) return message.join(', ');
      if (message is String) return message;
    }
    return 'Erreur $statusFallback';
  }
}
