import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/etat_async.dart';
import '../../theme/app_theme.dart';
import 'notification.dart';
import 'notification_tile.dart';

/// Ecran Notifications — branche sur GET /notifications/moi (limit:50, meme
/// plafond que NotificationsPanel.jsx), PATCH .../lire, PATCH
/// .../tout-lire, DELETE /notifications/:id.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<Notif>> _chargement;

  @override
  void initState() {
    super.initState();
    _chargement = _charger();
  }

  Future<List<Notif>> _charger() async {
    final reponse = await ApiClient.get('/notifications/moi?limit=50') as Map<String, dynamic>;
    final data = reponse['data'] as List;
    final notifications = data
        .map((n) => Notif.depuisJson(n as Map<String, dynamic>))
        // archivee ne doit jamais s'afficher — l'API n'a pas de filtre
        // d'exclusion, seulement un filtre par valeur unique (voir notification.dart).
        .where((n) => n.statut != StatutNotif.archivee)
        .toList()
      ..sort((a, b) => b.dateCreation.compareTo(a.dateCreation));
    return notifications;
  }

  Future<void> _rafraichir() async {
    final chargement = _charger();
    setState(() => _chargement = chargement);
    await chargement;
  }

  void _ouvrir(List<Notif> notificationsActuelles, Notif notif) {
    if (notif.statut != StatutNotif.nonLue) return;
    final misesAJour = notificationsActuelles
        .map((n) => n.id == notif.id ? n.copierAvec(statut: StatutNotif.lue) : n)
        .toList();
    setState(() => _chargement = Future.value(misesAJour));
    // Best-effort, comme cote web : le marquage-lu n'est pas bloquant pour
    // la navigation qui suivra une fois notif.lien route.
    ApiClient.patch('/notifications/${notif.id}/lire').catchError((_) => null);
  }

  Future<void> _archiver(List<Notif> notificationsActuelles, Notif notif) async {
    final misesAJour = notificationsActuelles.where((n) => n.id != notif.id).toList();
    setState(() => _chargement = Future.value(misesAJour));
    try {
      await ApiClient.delete('/notifications/${notif.id}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageErreurApi(e)), behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  Future<void> _toutMarquerLu(List<Notif> notificationsActuelles) async {
    try {
      await ApiClient.patch('/notifications/moi/tout-lire');
      if (!mounted) return;
      final misesAJour = notificationsActuelles.map((n) => n.copierAvec(statut: StatutNotif.lue)).toList();
      setState(() => _chargement = Future.value(misesAJour));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageErreurApi(e)), behavior: SnackBarBehavior.floating),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Notif>>(
      future: _chargement,
      builder: (context, snapshot) {
        final chargementTermine = snapshot.connectionState == ConnectionState.done;
        final notifications = chargementTermine && !snapshot.hasError ? snapshot.data! : null;
        final nonLues = notifications?.where((n) => n.statut == StatutNotif.nonLue).length ?? 0;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('Notifications'),
            actions: [
              if (nonLues > 0)
                TextButton(
                  onPressed: () => _toutMarquerLu(notifications!),
                  child: const Text('Tout marquer lu', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              const SizedBox(width: 4),
            ],
          ),
          body: SafeArea(
            top: false,
            child: !chargementTermine
                ? const EtatChargement()
                : snapshot.hasError
                    ? EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir)
                    : RefreshIndicator(
                        onRefresh: _rafraichir,
                        color: AppColors.primary,
                        child: notifications!.isEmpty
                            ? LayoutBuilder(
                                builder: (context, constraints) => SingleChildScrollView(
                                  physics: const AlwaysScrollableScrollPhysics(),
                                  child: ConstrainedBox(
                                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                                    child: const _EtatVide(),
                                  ),
                                ),
                              )
                            : Builder(
                                builder: (context) {
                                  final entrees = _construireEntrees(notifications);
                                  return ListView.builder(
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
                                        onOuvrir: () => _ouvrir(notifications, notif),
                                        onArchiver: () => _archiver(notifications, notif),
                                      );
                                    },
                                  );
                                },
                              ),
                      ),
          ),
        );
      },
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
