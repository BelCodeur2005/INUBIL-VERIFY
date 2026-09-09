import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum StatutDiplome { certifie, enCours, revoque, expire }

class VisuelStatut {
  const VisuelStatut(this.label, this.couleur, this.icone);
  final String label;
  final Color couleur;
  final IconData icone;
}

const _visuelsStatut = {
  StatutDiplome.certifie: VisuelStatut('Certifié', AppColors.success, Icons.verified),
  StatutDiplome.enCours: VisuelStatut('En cours', AppColors.warning, Icons.schedule),
  StatutDiplome.revoque: VisuelStatut('Révoqué', AppColors.error, Icons.gpp_bad),
  StatutDiplome.expire: VisuelStatut('Expiré', AppColors.textMuted, Icons.event_busy),
};

VisuelStatut visuelPour(StatutDiplome statut) => _visuelsStatut[statut]!;

/// Represente un document (diplome/releve/attestation) de l'etudiant connecte.
/// Champs alignes sur GET /etudiants/moi/documents (etudiants.api.js) — memes
/// noms de concept que le web (type_document, universite, hash_sha256...),
/// adaptes en camelCase Dart.
class Diplome {
  const Diplome({
    required this.id,
    required this.categorie,
    required this.typeDocument,
    required this.universite,
    required this.statut,
    required this.dateEmission,
    required this.numeroUnique,
    this.mention,
    this.hashSha256,
    this.transactionHash,
    this.reseau,
    this.aUnPdf = false,
    this.urlVerification,
  });

  final String id;
  final String categorie;
  final String typeDocument;
  final String universite;
  final StatutDiplome statut;
  final DateTime dateEmission;
  final String numeroUnique;
  final String? mention;
  final String? hashSha256;
  final String? transactionHash;
  final String? reseau;
  final bool aUnPdf;
  final String? urlVerification;

  String get dateFormatee {
    const mois = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];
    return '${dateEmission.day} ${mois[dateEmission.month - 1]} ${dateEmission.year}';
  }

  String? get hashCourt {
    if (hashSha256 == null || hashSha256!.length < 20) return hashSha256;
    return '${hashSha256!.substring(0, 10)}…${hashSha256!.substring(hashSha256!.length - 6)}';
  }
}

/// Donnees factices — etape 1 de la methode. GET /etudiants/moi/documents sera
/// branche a l'etape 3.
final List<Diplome> diplomesFactices = [
  Diplome(
    id: '1',
    categorie: 'Diplôme',
    typeDocument: 'Licence en Informatique',
    universite: 'ISTAMA INUBIL',
    statut: StatutDiplome.certifie,
    dateEmission: _date2026_07_15,
    numeroUnique: 'INUB-2026-0001',
    mention: 'Assez Bien',
    hashSha256: 'a3f9c2d1e8b74f6a9c0d5e2b1f8a4c7d9e6b3f0a2c5d8e1b4f7a0c3d6e9b2f5a',
    transactionHash: '0x7c3e9a1b4f8d2e6c0a5b9f3d7e1c4a8b2f6d0e9c3a7b1f5d8e2c6a0b4f9d3e7c',
    reseau: 'polygon_amoy',
    aUnPdf: true,
    urlVerification: 'https://verify.inubil.com/d/INUB-2026-0001',
  ),
  Diplome(
    id: '2',
    categorie: 'Relevé',
    typeDocument: 'Relevé de notes — Licence 3',
    universite: 'ISTAMA INUBIL',
    statut: StatutDiplome.enCours,
    dateEmission: _date2026_07_20,
    numeroUnique: 'INUB-2026-0002',
    aUnPdf: true,
  ),
  Diplome(
    id: '3',
    categorie: 'Diplôme',
    typeDocument: 'Licence en Génie Logiciel',
    universite: 'ISTAMA INUBIL',
    statut: StatutDiplome.certifie,
    dateEmission: _date2024_07_10,
    numeroUnique: 'INUB-2024-0087',
    mention: 'Bien',
    hashSha256: 'f1e4b7c0a3d6e9b2f5a8c1d4e7b0a3f6c9d2e5b8a1c4d7e0b3f6a9c2d5e8b1f4',
    transactionHash: '0x2e6c0a5b9f3d7e1c4a8b2f6d0e9c3a7b1f5d8e2c6a0b4f9d3e7c7c3e9a1b4f8d',
    reseau: 'polygon_amoy',
    aUnPdf: true,
    urlVerification: 'https://verify.inubil.com/d/INUB-2024-0087',
  ),
];

final _date2026_07_15 = DateTime.utc(2026, 7, 15);
final _date2026_07_20 = DateTime.utc(2026, 7, 20);
final _date2024_07_10 = DateTime.utc(2024, 7, 10);
