import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'notification.dart';
import 'notification_tile.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final List<Notif> _notifications = List.of(notificationsFactices)
    ..sort((a, b) => b.dateCreation.compareTo(a.dateCreation));

  int get _nonLues => _notifications.where((n) => n.statut == StatutNotif.nonLue).length;

  Future<void> _rafraichir() async {
    // TODO(etape 3) : GET /notifications/moi reel.
    await Future.delayed(const Duration(milliseconds: 600));
  }

  void _ouvrir(Notif notif) {
    setState(() {
      final i = _notifications.indexWhere((n) => n.id == notif.id);
      if (i != -1) _notifications[i] = notif.copierAvec(statut: StatutNotif.lue);
    });
    // TODO(etape 3) : naviguer vers notif.lien une fois les ecrans cibles routes.
  }

  void _archiver(Notif notif) {
    setState(() => _notifications.removeWhere((n) => n.id == notif.id));
    // TODO(etape 3) : DELETE /notifications/:id reel.
  }

  void _toutMarquerLu() {
    setState(() {
      for (var i = 0; i < _notifications.length; i++) {
        _notifications[i] = _notifications[i].copierAvec(statut: StatutNotif.lue);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final entrees = _construireEntrees(_notifications);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_nonLues > 0)
            TextButton(
              onPressed: _toutMarquerLu,
              child: const Text('Tout marquer lu', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: _notifications.isEmpty
            ? const _EtatVide()
            : RefreshIndicator(
                onRefresh: _rafraichir,
                color: AppColors.primary,
                child: ListView.builder(
                  padding: const EdgeInsets.only(top: AppSpacing.xs, bottom: AppSpacing.lg),
                  itemCount: entrees.length,
                  itemBuilder: (context, index) {
                    final entree = entrees[index];
                    if (entree is String) {
                      return _EnteteGroupe(texte: entree);
                    }
                    final notif = entree as Notif;
                    final suivante = index + 1 < entrees.length ? entrees[index + 1] : null;
                    final estDernierDuGroupe = suivante is! Notif;
                    return NotificationTile(
                      notif: notif,
                      estDernierDuGroupe: estDernierDuGroupe,
                      onOuvrir: () => _ouvrir(notif),
                      onArchiver: () => _archiver(notif),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

/// Aplati la liste triee en une sequence [en-tete de groupe | Notif] pour un
/// ListView.builder unique — evite d'imbriquer des ListView non bornees.
List<Object> _construireEntrees(List<Notif> notifications) {
  final entrees = <Object>[];
  String? groupeCourant;
  for (final notif in notifications) {
    final groupe = groupePourDate(notif.dateCreation);
    if (groupe != groupeCourant) {
      entrees.add(groupe);
      groupeCourant = groupe;
    }
    entrees.add(notif);
  }
  return entrees;
}

class _EnteteGroupe extends StatelessWidget {
  const _EnteteGroupe({required this.texte});
  final String texte;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.screenMargin, AppSpacing.base, AppSpacing.screenMargin, AppSpacing.xs),
      child: Text(
        texte,
        style: AppTypography.labelMd.copyWith(color: AppColors.textMuted, fontWeight: FontWeight.w700, letterSpacing: 0.4),
      ),
    );
  }
}

class _EtatVide extends StatelessWidget {
  const _EtatVide();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.08), shape: BoxShape.circle),
              child: const Icon(Icons.notifications_none_rounded, size: 30, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.base),
            Text('Aucune notification', style: AppTypography.headlineSm, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(
              'Vous serez averti ici dès qu’un diplôme est émis, vérifié ou partagé.',
              style: AppTypography.bodySm,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
