import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

enum MessageBannerType { erreur, succes }

/// Bandeau de message inline (erreur ou succes) — meme forme que .errorText /
/// .doublonWarning cote web, decline ici pour les deux statuts.
class MessageBanner extends StatelessWidget {
  const MessageBanner({super.key, required this.texte, required this.type});

  final String texte;
  final MessageBannerType type;

  @override
  Widget build(BuildContext context) {
    final estErreur = type == MessageBannerType.erreur;
    final couleurTexte = estErreur ? AppColors.error : AppColors.successDark;
    final couleurFond = estErreur ? AppColors.errorBg : const Color(0xFFECFDF5);
    final couleurBordure = estErreur
        ? AppColors.error.withValues(alpha: 0.3)
        : AppColors.success.withValues(alpha: 0.3);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.base,
      ),
      decoration: BoxDecoration(
        color: couleurFond,
        borderRadius: BorderRadius.circular(AppRadius.standard),
        border: Border.all(color: couleurBordure),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            estErreur ? Icons.error_outline : Icons.check_circle_outline,
            size: 18,
            color: couleurTexte,
          ),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              texte,
              style: AppTypography.bodySm.copyWith(color: couleurTexte),
            ),
          ),
        ],
      ),
    );
  }
}
