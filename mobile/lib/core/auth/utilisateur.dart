/// Identite minimale de l'utilisateur connecte — champs communs a la reponse
/// de connexion (AuthTokensDto.user) et au profil complet (GET /auth/me).
/// Les champs specifiquement etudiant (matricule, universite...) viennent de
/// GET /etudiants/moi, recupere separement par les ecrans qui en ont besoin.
class Utilisateur {
  const Utilisateur({required this.id, required this.email, required this.nom, required this.prenom});

  final String id;
  final String email;
  final String nom;
  final String prenom;

  factory Utilisateur.depuisJson(Map<String, dynamic> json) => Utilisateur(
        id: json['id'] as String,
        email: json['email'] as String,
        nom: json['nom'] as String,
        prenom: json['prenom'] as String,
      );
}
