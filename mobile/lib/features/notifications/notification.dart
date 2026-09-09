import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum TypeNotif { documentEmis, documentRevoque, documentVerifie, partageConsulte }

enum StatutNotif { nonLue, lue }

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
};

VisuelTypeNotif visuelPourNotif(TypeNotif type) => _visuelsTypeNotif[type]!;

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

final List<Notif> notificationsFactices = [
  Notif(
    id: 'n1',
    type: TypeNotif.partageConsulte,
    statut: StatutNotif.nonLue,
    titre: 'Votre lien de partage a été consulté',
    message: 'TechCorp Cameroun a consulté votre Licence en Informatique il y a quelques instants.',
    dateCreation: DateTime.now().subtract(const Duration(minutes: 8)),
    lien: '/partages',
  ),
  Notif(
    id: 'n2',
    type: TypeNotif.documentVerifie,
    statut: StatutNotif.nonLue,
    titre: 'Diplôme vérifié',
    message: 'Votre Licence en Informatique (INUB-2026-0001) a été vérifiée depuis un lien public.',
    dateCreation: DateTime.now().subtract(const Duration(hours: 3)),
    lien: '/diplomes/1',
  ),
  Notif(
    id: 'n3',
    type: TypeNotif.documentEmis,
    statut: StatutNotif.lue,
    titre: 'Nouveau document émis',
    message: 'Votre relevé de notes — Licence 3 a été émis et est en attente d’ancrage blockchain.',
    dateCreation: DateTime.now().subtract(const Duration(hours: 7)),
    lien: '/diplomes/2',
  ),
  Notif(
    id: 'n4',
    type: TypeNotif.documentEmis,
    statut: StatutNotif.lue,
    titre: 'Diplôme certifié sur la blockchain',
    message: 'Votre Licence en Informatique (INUB-2026-0001) est désormais ancrée sur Polygon.',
    dateCreation: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
    lien: '/diplomes/1',
  ),
  Notif(
    id: 'n5',
    type: TypeNotif.partageConsulte,
    statut: StatutNotif.lue,
    titre: 'Votre lien de partage a été consulté',
    message: 'Université de Douala — Bureau des admissions a consulté votre Licence en Génie Logiciel.',
    dateCreation: DateTime.now().subtract(const Duration(days: 3)),
    lien: '/partages',
  ),
  Notif(
    id: 'n6',
    type: TypeNotif.documentRevoque,
    statut: StatutNotif.lue,
    titre: 'Document révoqué',
    message: 'Votre relevé provisoire (INUB-2024-0033) a été révoqué par ISTAMA INUBIL suite à une correction administrative.',
    dateCreation: DateTime.now().subtract(const Duration(days: 12)),
  ),
];
