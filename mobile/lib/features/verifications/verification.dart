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

  /// Construit un [Verif] depuis un VerificationEtudiantDto reel
  /// (GET /etudiants/moi/verifications). type_document/numero_unique sont
  /// nullable cote backend (verification sur un hash/document qui ne
  /// correspond a rien de reel — cas non_trouve/falsifie) : fallback textuel
  /// plutot qu'un champ vide.
  factory Verif.depuisJson(Map<String, dynamic> json) {
    return Verif(
      id: json['id'] as String,
      typeDocument: json['type_document'] as String? ?? 'Document inconnu',
      numeroUnique: json['numero_unique'] as String? ?? '—',
      canal: _canalDepuisJson(json['type_verification'] as String),
      resultat: _resultatDepuisJson(json['resultat'] as String),
      dateCreation: DateTime.parse(json['created_at'] as String),
      destinatairePartage: json['destinataire_partage'] as String?,
    );
  }
}

CanalVerification _canalDepuisJson(String canal) {
  switch (canal) {
    case 'lien_unique':
      return CanalVerification.lienUnique;
    case 'qr_code':
      return CanalVerification.qrCode;
    case 'upload_pdf':
      return CanalVerification.uploadPdf;
    case 'hash':
    default:
      return CanalVerification.hash;
  }
}

ResultatVerification _resultatDepuisJson(String resultat) {
  switch (resultat) {
    case 'authentique':
      return ResultatVerification.authentique;
    case 'revoque':
      return ResultatVerification.revoque;
    case 'falsifie':
      return ResultatVerification.falsifie;
    case 'non_trouve':
    default:
      return ResultatVerification.nonTrouve;
  }
}
