import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Bandeau de marque partage par les ecrans d'authentification (Connexion,
/// Mot de passe oublie...) — degrade institutionnel + sceau filigrane (concept
/// "Seal of Authenticity" de DESIGN.md) + wordmark INUBIL/Verify, avec une
/// legende contextuelle a l'ecran. Garder ce bandeau identique d'un ecran a
/// l'autre est ce qui cree la reconnaissance de marque ; seule la legende change.
class BandeauMarque extends StatelessWidget {
  const BandeauMarque({super.key, required this.hauteur, required this.legende});

  final double hauteur;
  final String legende;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: hauteur,
      width: double.infinity,
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primary, AppColors.primaryDark],
              ),
            ),
          ),
          Positioned(
            top: -60,
            right: -70,
            child: Opacity(opacity: 0.10, child: _SceauFiligrane(taille: 260)),
          ),
          Positioned(
            bottom: -40,
            left: -30,
            child: Opacity(opacity: 0.06, child: _SceauFiligrane(taille: 140)),
          ),
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenMargin,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'INUBIL',
                    style: AppTypography.headlineLgMobile.copyWith(
                      color: Colors.white,
                      fontSize: 40,
                      height: 1,
                      letterSpacing: -0.4,
                    ),
                  ),
                  Text(
                    'Verify',
                    style: AppTypography.headlineLgMobile.copyWith(
                      color: Colors.white.withValues(alpha: 0.65),
                      fontSize: 40,
                      height: 1.1,
                      letterSpacing: -0.4,
                      fontWeight: FontWeight.w300,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    legende,
                    style: AppTypography.bodySm.copyWith(
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SceauFiligrane extends StatelessWidget {
  const _SceauFiligrane({required this.taille});

  final double taille;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: taille,
      height: taille,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 1.5),
            ),
          ),
          Container(
            width: taille * 0.78,
            height: taille * 0.78,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 1.5),
            ),
          ),
          Icon(Icons.verified_rounded, color: Colors.white, size: taille * 0.32),
        ],
      ),
    );
  }
}
