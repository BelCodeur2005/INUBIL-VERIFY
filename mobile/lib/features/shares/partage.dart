import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum StatutPartage { actif, revoque, expire }

class VisuelStatutPartage {
  const VisuelStatutPartage(this.label, this.couleur, this.icone);
  final String label;
  final Color couleur;
  final IconData icone;
}

const _visuelsStatutPartage = {
  StatutPartage.actif: VisuelStatutPartage('Actif', AppColors.success, Icons.check_circle),
  StatutPartage.revoque: VisuelStatutPartage('Révoqué', AppColors.error, Icons.block),
  StatutPartage.expire: VisuelStatutPartage('Expiré', AppColors.textMuted, Icons.history_toggle_off),
};

VisuelStatutPartage visuelPourPartage(StatutPartage statut) => _visuelsStatutPartage[statut]!;

const String urlPartageBase = 'verify.inubil.com/partages/';

/// Represente un lien de partage genere par l'etudiant pour un document.
/// Champs alignes sur GET /etudiants/moi/partages (etudiants.api.js).
class Partage {
  const Partage({
    required this.id,
    required this.documentTitre,
    required this.tokenAcces,
    required this.statut,
    required this.dateCreation,
    required this.nbConsultations,
    this.dateExpiration,
    this.permanent = false,
    this.emailDestinataire,
    this.universiteDestinataire,
  });

  final String id;
  final String documentTitre;
  final String tokenAcces;
  final StatutPartage statut;
  final DateTime dateCreation;
  final int nbConsultations;
  final DateTime? dateExpiration;
  final bool permanent;
  final String? emailDestinataire;
  final String? universiteDestinataire;

  String get lienComplet => '$urlPartageBase$tokenAcces';

  String get destinataireAffiche =>
      emailDestinataire ?? universiteDestinataire ?? 'Non renseigné';

  String _formatDate(DateTime d) {
    const mois = [
      'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
    ];
    return '${d.day} ${mois[d.month - 1]} ${d.year}';
  }

  String get dateCreationFormatee => _formatDate(dateCreation);

  String get expirationAffichee {
    if (permanent) return 'Permanent';
    if (dateExpiration == null) return '—';
    return 'Expire le ${_formatDate(dateExpiration!)}';
  }
}

final List<Partage> partagesFactices = [
  Partage(
    id: 'p1',
    documentTitre: 'Licence en Informatique — INUB-2026-0001',
    tokenAcces: 'a7f3e9c1b2d4',
    statut: StatutPartage.actif,
    dateCreation: _date2026_08_02,
    dateExpiration: _date2026_09_01,
    nbConsultations: 14,
    emailDestinataire: 'recrutement@techcorp-cm.com',
  ),
  Partage(
    id: 'p2',
    documentTitre: 'Licence en Génie Logiciel — INUB-2024-0087',
    tokenAcces: 'c58d1f4a9e02',
    statut: StatutPartage.actif,
    dateCreation: _date2026_07_28,
    permanent: true,
    nbConsultations: 31,
    universiteDestinataire: 'Université de Douala — Bureau des admissions',
  ),
  Partage(
    id: 'p3',
    documentTitre: 'Licence en Informatique — INUB-2026-0001',
    tokenAcces: '9b2e6a0c7d1f',
    statut: StatutPartage.revoque,
    dateCreation: _date2026_06_15,
    dateExpiration: _date2026_09_15,
    nbConsultations: 3,
    emailDestinataire: 'contact@stage-invalide.com',
  ),
  Partage(
    id: 'p4',
    documentTitre: 'Relevé de notes — Licence 3',
    tokenAcces: '4e8c2b9f1a3d',
    statut: StatutPartage.expire,
    dateCreation: _date2026_05_10,
    dateExpiration: _date2026_06_09,
    nbConsultations: 7,
  ),
];

final _date2026_08_02 = DateTime.utc(2026, 8, 2);
final _date2026_09_01 = DateTime.utc(2026, 9, 1);
final _date2026_07_28 = DateTime.utc(2026, 7, 28);
final _date2026_06_15 = DateTime.utc(2026, 6, 15);
final _date2026_09_15 = DateTime.utc(2026, 9, 15);
final _date2026_05_10 = DateTime.utc(2026, 5, 10);
final _date2026_06_09 = DateTime.utc(2026, 6, 9);
