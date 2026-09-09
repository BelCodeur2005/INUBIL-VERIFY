import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage securise des jetons JWT (access + refresh) sur l'appareil.
/// Memes cles logiques que le web (localStorage `inubil_access_token` /
/// `inubil_refresh_token`, voir core/api/token-storage.js) — support
/// physique different (keychain/keystore), meme role.
class TokenStorage {
  TokenStorage._();

  static const _storage = FlutterSecureStorage();
  static const _cleAcces = 'inubil_access_token';
  static const _cleRafraichissement = 'inubil_refresh_token';

  static Future<String?> get accessToken => _storage.read(key: _cleAcces);

  static Future<String?> get refreshToken => _storage.read(key: _cleRafraichissement);

  static Future<void> definirJetons({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _cleAcces, value: accessToken);
    await _storage.write(key: _cleRafraichissement, value: refreshToken);
  }

  static Future<void> effacer() async {
    await _storage.delete(key: _cleAcces);
    await _storage.delete(key: _cleRafraichissement);
  }
}
