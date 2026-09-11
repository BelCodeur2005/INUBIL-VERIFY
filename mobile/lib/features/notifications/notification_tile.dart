import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'notification.dart';

/// Ligne de fil chronologique : noeud colore relie par un trait vertical au
/// noeud suivant, effacement par glissement lateral (geste natif mobile,
/// pas un petit bouton X difficile a viser au doigt).
class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.notif,
    required this.estDernierDuGroupe,
    required this.onOuvrir,
    required this.onArchiver,
  });

  final Notif notif;
  final bool estDernierDuGroupe;
  final VoidCallback onOuvrir;
  final VoidCallback onArchiver;

  @override
  Widget build(BuildContext context) {
    final visuel = visuelPourNotif(notif.type);
    final nonLue = notif.statut == StatutNotif.nonLue;

    return Dismissible(
      key: ValueKey(notif.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onArchiver(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        color: AppColors.errorBg,
        child: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
      ),
      child: Material(
        color: nonLue ? AppColors.primary.withValues(alpha: 0.04) : Colors.transparent,
        child: InkWell(
          onTap: onOuvrir,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenMargin, vertical: 12),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(color: visuel.couleur.withValues(alpha: 0.12), shape: BoxShape.circle),
                        child: Icon(visuel.icone, size: 16, color: visuel.couleur),
                      ),
                      if (!estDernierDuGroupe)
                        Expanded(
                          child: Container(
                            width: 2.5,
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.textMuted,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  notif.titre,
                                  style: AppTypography.bodyMd.copyWith(
                                    fontWeight: nonLue ? FontWeight.w700 : FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (nonLue) ...[
                                const SizedBox(width: 8),
                                Container(
                                  width: 7,
                                  height: 7,
                                  margin: const EdgeInsets.only(top: 5),
                                  decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            notif.message,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.bodySm,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            notif.tempsEcoule,
                            style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w500, letterSpacing: 0),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
