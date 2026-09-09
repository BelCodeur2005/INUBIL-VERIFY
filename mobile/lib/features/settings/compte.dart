/// Represente le compte connecte. Champs alignes sur GET /auth/me (identite,
/// modifiable) + GET /etudiants/moi (dossier academique, lecture seule —
/// gere par l'etablissement, jamais edite depuis l'app).
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
}

/// Meme etudiant factice que celui affiche dans AppDrawer/MainShell — coherence
/// entre ecrans tant qu'aucun etat partage reel n'existe (etape 1).
const compteFactice = CompteEtudiant(
  prenom: 'Bertrand',
  nom: 'KAMGA',
  email: 'bertrand.kamga@istama-inubil.cm',
  nomSurDiplome: 'Bertrand KAMGA',
  matricule: 'INUB-ETU-00214',
  universite: 'ISTAMA INUBIL',
  telephone: '+237 6 77 12 34 56',
);
