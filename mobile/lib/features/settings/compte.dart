/// Represente le compte connecte. Champs alignes sur GET /auth/me (identite,
/// modifiable) + GET /etudiants/moi (dossier academique, lecture seule —
/// gere par l'etablissement, jamais edite depuis l'app). Deux endpoints
/// distincts car /auth/me.email est l'email de connexion tandis que
/// /etudiants/moi.email est le contact personnel de l'etudiant — ce sont
/// deux champs potentiellement differents, pas une redondance.
class CompteEtudiant {
  const CompteEtudiant({
    required this.prenom,
    required this.nom,
    required this.email,
    required this.nomSurDiplome,
    required this.matricule,
    required this.universite,
    required this.telephone,
  });

  final String prenom;
  final String nom;
  final String email;
  final String nomSurDiplome;
  final String matricule;
  final String universite;
  final String? telephone;

  factory CompteEtudiant.depuisJson({
    required Map<String, dynamic> profilAuth,
    required Map<String, dynamic> profilEtudiant,
  }) {
    return CompteEtudiant(
      prenom: profilAuth['prenom'] as String,
      nom: profilAuth['nom'] as String,
      email: profilAuth['email'] as String,
      nomSurDiplome: '${profilEtudiant['prenom']} ${profilEtudiant['nom']}',
      matricule: profilEtudiant['numero_etudiant'] as String,
      universite: profilEtudiant['universite'] as String,
      telephone: profilEtudiant['telephone'] as String?,
    );
  }

  CompteEtudiant copierAvec({String? prenom, String? nom}) => CompteEtudiant(
        prenom: prenom ?? this.prenom,
        nom: nom ?? this.nom,
        email: email,
        nomSurDiplome: nomSurDiplome,
        matricule: matricule,
        universite: universite,
        telephone: telephone,
      );
}
