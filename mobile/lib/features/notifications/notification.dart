import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum TypeNotif { documentEmis, documentRevoque, documentVerifie, partageConsulte, autre }

/// archivee existe cote backend (soft-delete) mais n'est jamais affichee —
/// filtree au chargement (voir NotificationsScreen), au cas ou l'API la
/// renverrait de nouveau (elle n'a pas de filtre d'exclusion, seulement un
/// filtre par valeur unique).
enum StatutNotif { nonLue, lue, archivee }

class VisuelTypeNotif {
  const VisuelTypeNotif(this.icone, this.couleur);
  final IconData icone;
  final Color couleur;
}

const _visuelsTypeNotif = {
  TypeNotif.documentEmis: VisuelTypeNotif(Icons.check_circle_rounded, AppColors.success),
  TypeNotif.documentRevoque: VisuelTypeNotif(Icons.gpp_bad_rounded, AppColors.error),
  TypeNotif.documentVerifie: VisuelTypeNotif(Icons.visibility_rounded, AppColors.primary),
  TypeNotif.partageConsulte: VisuelTypeNotif(Icons.ios_share_rounded, AppColors.warning),
  TypeNotif.autre: VisuelTypeNotif(Icons.notifications_rounded, AppColors.textSecondary),
};

VisuelTypeNotif visuelPourNotif(TypeNotif type) => _visuelsTypeNotif[type]!;

/// Types reellement emis par le backend pour un etudiant (grep sur les
/// `type:` litteraux dans documents.service.ts / public-verify.service.ts /
/// public-partages.service.ts) — tout type non reconnu tombe sur `autre`
/// plutot que de planter (ex. document_a_valider/revocation ciblent d'autres
/// roles mais pourraient theoriquement apparaitre).
TypeNotif _typeNotifDepuisJson(String type) {
  switch (type) {
    case 'document_emis':
      return TypeNotif.documentEmis;
    case 'document_revoque':
      return TypeNotif.documentRevoque;
    case 'document_verifie':
      return TypeNotif.documentVerifie;
    case 'partage_consulte':
      return TypeNotif.partageConsulte;
    default:
      return TypeNotif.autre;
  }
}

StatutNotif _statutNotifDepuisJson(String statut) {
  switch (statut) {
    case 'non_lue':
      return StatutNotif.nonLue;
    case 'archivee':
      return StatutNotif.archivee;
    default:
      return StatutNotif.lue;
  }
}

/// Represente un evenement notifie a l'etudiant. Champs alignes sur
/// GET /notifications/moi (notifications.api.js) : type, statut, titre,
/// message, created_at, lien (chemin relatif optionnel vers l'ecran concerne).
class Notif {
  const Notif({
    required this.id,
    required this.type,
    required this.statut,
    required this.titre,
    required this.message,
    required this.dateCreation,
    this.lien,
  });

  final String id;
  final TypeNotif type;
  final StatutNotif statut;
  final String titre;
  final String message;
  final DateTime dateCreation;
  final String? lien;

  Notif copierAvec({StatutNotif? statut}) => Notif(
        id: id,
        type: type,
        statut: statut ?? this.statut,
        titre: titre,
        message: message,
        dateCreation: dateCreation,
        lien: lien,
      );

  String get tempsEcoule {
    final secondes = DateTime.now().difference(dateCreation).inSeconds;
    if (secondes < 60) return "à l'instant";
    final minutes = secondes ~/ 60;
    if (minutes < 60) return 'il y a $minutes min';
    final heures = minutes ~/ 60;
    if (heures < 24) return 'il y a $heures h';
    final jours = heures ~/ 24;
    return 'il y a $jours j';
  }

  /// Construit un [Notif] depuis un NotificationResponseDto reel
  /// (GET /notifications/moi).
  factory Notif.depuisJson(Map<String, dynamic> json) {
    return Notif(
      id: json['id'] as String,
      type: _typeNotifDepuisJson(json['type'] as String),
      statut: _statutNotifDepuisJson(json['statut'] as String),
      titre: json['titre'] as String,
      message: json['message'] as String,
      dateCreation: DateTime.parse(json['created_at'] as String),
      lien: json['lien'] as String?,
    );
  }
}

/// Regroupement chronologique pour l'affichage en fil — memes libelles que les
/// conventions mobiles usuelles (Aujourd'hui / Hier / Cette semaine / Plus ancien).
String groupePourDate(DateTime date) {
  final maintenant = DateTime.now();
  final aujourdhui = DateTime(maintenant.year, maintenant.month, maintenant.day);
  final jour = DateTime(date.year, date.month, date.day);
  final ecartJours = aujourdhui.difference(jour).inDays;

  if (ecartJours == 0) return 'Aujourd’hui';
  if (ecartJours == 1) return 'Hier';
  if (ecartJours < 7) return 'Cette semaine';
  return 'Plus ancien';
}
