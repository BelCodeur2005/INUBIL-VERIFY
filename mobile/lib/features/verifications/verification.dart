import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum CanalVerification { lienUnique, qrCode, hash, uploadPdf }

enum ResultatVerification { authentique, revoque, nonTrouve, falsifie }

class VisuelCanal {
  const VisuelCanal(this.label, this.icone);
  final String label;
  final IconData icone;
}

const _visuelsCanal = {
  CanalVerification.lienUnique: VisuelCanal('Lien unique', Icons.link_rounded),
  CanalVerification.qrCode: VisuelCanal('Code QR', Icons.qr_code_2_rounded),
  CanalVerification.hash: VisuelCanal('Hash direct', Icons.fingerprint_rounded),
  CanalVerification.uploadPdf: VisuelCanal('Upload du PDF', Icons.upload_file_rounded),
};

VisuelCanal visuelPourCanal(CanalVerification canal) => _visuelsCanal[canal]!;

class VisuelResultat {
  const VisuelResultat(this.label, this.couleur, this.icone);
  final String label;
  final Color couleur;
  final IconData icone;
}

const _visuelsResultat = {
  ResultatVerification.authentique: VisuelResultat('Authentique', AppColors.success, Icons.verified_rounded),
  ResultatVerification.revoque: VisuelResultat('Révoqué', AppColors.error, Icons.gpp_bad_rounded),
  ResultatVerification.nonTrouve: VisuelResultat('Non trouvé', AppColors.textMuted, Icons.help_rounded),
  ResultatVerification.falsifie: VisuelResultat('Falsifié', AppColors.error, Icons.dangerous_rounded),
};

VisuelResultat visuelPourResultat(ResultatVerification resultat) => _visuelsResultat[resultat]!;

/// Represente un controle public effectue sur un document de l'etudiant.
/// Champs alignes sur GET /etudiants/moi/verifications (etudiants.api.js) :
/// type_verification, resultat, type_document, numero_unique, created_at,
/// destinataire_partage (null -> verification anonyme).
class Verif {
  const Verif({
    required this.id,
    required this.typeDocument,
    required this.numeroUnique,
    required this.canal,
    required this.resultat,
    required this.dateCreation,
    this.destinatairePartage,
  });

  final String id;
  final String typeDocument;
  final String numeroUnique;
  final CanalVerification canal;
  final ResultatVerification resultat;
  final DateTime dateCreation;
  final String? destinatairePartage;

  String get dateHeureFormatee {
    const mois = [
      'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
    ];
    final h = dateCreation.hour.toString().padLeft(2, '0');
    final m = dateCreation.minute.toString().padLeft(2, '0');
    return '${dateCreation.day} ${mois[dateCreation.month - 1]} · $h:$m';
  }
}

final List<Verif> verificationsFactices = [
  Verif(
    id: 'v1',
    typeDocument: 'Licence en Informatique',
    numeroUnique: 'INUB-2026-0001',
    canal: CanalVerification.qrCode,
    resultat: ResultatVerification.authentique,
    dateCreation: DateTime.now().subtract(const Duration(minutes: 22)),
  ),
  Verif(
    id: 'v2',
    typeDocument: 'Licence en Informatique',
    numeroUnique: 'INUB-2026-0001',
    canal: CanalVerification.lienUnique,
    resultat: ResultatVerification.authentique,
    dateCreation: DateTime.now().subtract(const Duration(hours: 3)),
    destinatairePartage: 'recrutement@techcorp-cm.com',
  ),
  Verif(
    id: 'v3',
    typeDocument: 'Licence en Génie Logiciel',
    numeroUnique: 'INUB-2024-0087',
    canal: CanalVerification.lienUnique,
    resultat: ResultatVerification.authentique,
    dateCreation: DateTime.now().subtract(const Duration(days: 1, hours: 4)),
    destinatairePartage: 'Université de Douala — Bureau des admissions',
  ),
  Verif(
    id: 'v4',
    typeDocument: 'Licence en Informatique',
    numeroUnique: 'INUB-2026-0001',
    canal: CanalVerification.hash,
    resultat: ResultatVerification.authentique,
    dateCreation: DateTime.now().subtract(const Duration(days: 2)),
  ),
  Verif(
    id: 'v5',
    typeDocument: 'Relevé provisoire',
    numeroUnique: 'INUB-2024-0033',
    canal: CanalVerification.uploadPdf,
    resultat: ResultatVerification.revoque,
    dateCreation: DateTime.now().subtract(const Duration(days: 4)),
  ),
  Verif(
    id: 'v6',
    typeDocument: 'Licence en Génie Logiciel',
    numeroUnique: 'INUB-2024-0087',
    canal: CanalVerification.qrCode,
    resultat: ResultatVerification.authentique,
    dateCreation: DateTime.now().subtract(const Duration(days: 6)),
  ),
  Verif(
    id: 'v7',
    typeDocument: 'Document inconnu',
    numeroUnique: 'INUB-2023-9912',
    canal: CanalVerification.hash,
    resultat: ResultatVerification.falsifie,
    dateCreation: DateTime.now().subtract(const Duration(days: 9)),
  ),
];
