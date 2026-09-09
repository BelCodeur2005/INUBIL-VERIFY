import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'verification.dart';

class VerificationTile extends StatelessWidget {
  const VerificationTile({super.key, required this.verif});

  final Verif verif;

  @override
  Widget build(BuildContext context) {
    final canal = visuelPourCanal(verif.canal);
    final resultat = visuelPourResultat(verif.resultat);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(color: AppColors.borderLight, borderRadius: BorderRadius.circular(AppRadius.md)),
            child: Icon(canal.icone, size: 18, color: AppColors.textSecondary),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        '${verif.typeDocument} — ${verif.numeroUnique}',
                        style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(canal.label, style: AppTypography.bodySm),
                    const SizedBox(width: 6),
                    Container(width: 3, height: 3, decoration: const BoxDecoration(color: AppColors.textMuted, shape: BoxShape.circle)),
                    const SizedBox(width: 6),
                    Text(verif.dateHeureFormatee, style: AppTypography.bodySm),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: verif.destinatairePartage != null
                          ? Text.rich(
                              TextSpan(
                                style: AppTypography.bodySm,
                                children: [
                                  const TextSpan(text: 'Consulté par '),
                                  TextSpan(
                                    text: verif.destinatairePartage,
                                    style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            )
                          : Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.person_off_outlined, size: 13, color: AppColors.textMuted),
                                const SizedBox(width: 4),
                                Text('Vérification anonyme', style: AppTypography.bodySm),
                              ],
                            ),
                    ),
                    const SizedBox(width: 8),
                    _BadgeResultat(resultat: resultat),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BadgeResultat extends StatelessWidget {
  const _BadgeResultat({required this.resultat});
  final VisuelResultat resultat;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: resultat.couleur.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(resultat.icone, size: 12, color: resultat.couleur),
          const SizedBox(width: 4),
          Text(resultat.label, style: AppTypography.labelMd.copyWith(color: resultat.couleur, letterSpacing: 0.2)),
        ],
      ),
    );
  }
}
