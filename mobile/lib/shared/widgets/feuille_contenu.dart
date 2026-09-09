import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Feuille blanche a coins arrondis en tete, "remontant" sur le BandeauMarque
/// pour donner du relief plutot qu'une simple carte plate centree. Utilise
/// ConstrainedBox(minHeight) plutot que Expanded : ce widget vit dans un
/// SingleChildScrollView (hauteur non bornee), ou Expanded leve une exception.
class FeuilleContenu extends StatelessWidget {
  const FeuilleContenu({
    super.key,
    required this.hauteurMinimale,
    required this.child,
  });

  final double hauteurMinimale;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: hauteurMinimale),
      child: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(28),
            topRight: Radius.circular(28),
          ),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenMargin,
              AppSpacing.md,
              AppSpacing.screenMargin,
              AppSpacing.md,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
