/// Compteurs agreges de l'etudiant. Champs alignes sur
/// GET /etudiants/moi/statistiques (StatistiquesEtudiantDto, backend) —
/// seuls les champs affiches sur Accueil sont repris ici.
class StatistiquesEtudiant {
  const StatistiquesEtudiant({
    required this.documentsActifs,
    required this.documentsEnValidation,
    required this.verificationsTotal,
  });

  final int documentsActifs;
  final int documentsEnValidation;
  final int verificationsTotal;

  factory StatistiquesEtudiant.depuisJson(Map<String, dynamic> json) {
    final documents = json['documents'] as Map<String, dynamic>;
    final verifications = json['verifications'] as Map<String, dynamic>;
    return StatistiquesEtudiant(
      documentsActifs: documents['actifs'] as int,
      documentsEnValidation: documents['en_validation'] as int,
      verificationsTotal: verifications['total'] as int,
    );
  }
}
