import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import 'token_storage.dart';
import 'utilisateur.dart';

enum StatutAuth { indetermine, connecte, deconnecte }

/// Etat d'authentification partage par toute l'app. Pas de package d'etat
/// (Provider/Riverpod/Bloc) : un ChangeNotifier ecoute via ListenableBuilder
/// suffit vu la taille de l'app (un seul etat global, l'auth).
class AuthService extends ChangeNotifier {
  StatutAuth _statut = StatutAuth.indetermine;
  Utilisateur? _utilisateur;

  StatutAuth get statut => _statut;
  Utilisateur? get utilisateur => _utilisateur;
  bool get estConnecte => _statut == StatutAuth.connecte;

  /// A appeler une fois au demarrage de l'app : verifie s'il existe un jeton
  /// stocke et, si oui, le valide aupres de GET /auth/me avant de decider
  /// vers quel ecran demarrer (evite un flash de l'ecran de connexion).
  Future<void> initialiser() async {
    final token = await TokenStorage.accessToken;
    if (token == null) {
      _statut = StatutAuth.deconnecte;
      notifyListeners();
      return;
    }
    try {
      final profil = await ApiClient.get('/auth/me') as Map<String, dynamic>;
      _utilisateur = Utilisateur.depuisJson(profil);
      _statut = StatutAuth.connecte;
    } catch (_) {
      await TokenStorage.effacer();
      _statut = StatutAuth.deconnecte;
    }
    notifyListeners();
  }

  Future<void> connecter({required String email, required String motDePasse}) async {
    final reponse = await ApiClient.post(
      '/auth/login',
      corps: {'email': email, 'mot_de_passe': motDePasse},
      auth: false,
    ) as Map<String, dynamic>;

    await TokenStorage.definirJetons(
      accessToken: reponse['access_token'] as String,
      refreshToken: reponse['refresh_token'] as String,
    );
    _utilisateur = Utilisateur.depuisJson(reponse['user'] as Map<String, dynamic>);
    _statut = StatutAuth.connecte;
    notifyListeners();
  }

  /// Met a jour l'identite locale apres un PATCH /auth/me reussi ailleurs
  /// dans l'app (ParametresScreen) — evite un GET /auth/me redondant juste
  /// pour rafraichir ce que l'appelant connait deja.
  void mettreAJourUtilisateur(Utilisateur utilisateur) {
    _utilisateur = utilisateur;
    notifyListeners();
  }

  Future<void> deconnecter() async {
    final refreshToken = await TokenStorage.refreshToken;
    if (refreshToken != null) {
      try {
        await ApiClient.post('/auth/logout', corps: {'refresh_token': refreshToken});
      } catch (_) {
        // Best-effort : la session locale est effacee meme si l'appel echoue.
      }
    }
    await TokenStorage.effacer();
    _utilisateur = null;
    _statut = StatutAuth.deconnecte;
    notifyListeners();
  }
}

/// Instance unique partagee par toute l'app.
final authService = AuthService();
