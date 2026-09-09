import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Anneau de confiance : jauge circulaire animee representant la part de
/// verifications authentiques — le "score de sante" des documents de
/// l'etudiant, en un seul coup d'oeil plutot qu'un chiffre noye dans une
/// liste de stats.
class TrustRing extends StatelessWidget {
  const TrustRing({super.key, required this.taux, required this.total});

  /// Pourcentage 0-100, ou null si aucune verification n'existe encore.
  final int? taux;
  final int total;

  Color get _couleur {
    final t = taux ?? 0;
    if (t >= 80) return AppColors.success;
    if (t >= 50) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    final valeurCible = (taux ?? 0) / 100;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: valeurCible),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOutCubic,
      builder: (context, valeur, _) {
        return SizedBox(
          width: 152,
          height: 152,
          child: CustomPaint(
            painter: _PeintreAnneau(valeur: valeur, couleur: _couleur),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    taux == null ? '—' : '$taux%',
                    style: AppTypography.headlineLgMobile.copyWith(fontSize: 30),
                  ),
                  const SizedBox(height: 2),
                  Text('authentiques', style: AppTypography.bodySm),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PeintreAnneau extends CustomPainter {
  _PeintreAnneau({required this.valeur, required this.couleur});
  final double valeur;
  final Color couleur;

  @override
  void paint(Canvas canvas, Size size) {
    final centre = size.center(Offset.zero);
    final rayon = (size.shortestSide - 14) / 2;

    final piste = Paint()
      ..color = AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(centre, rayon, piste);

    if (valeur > 0) {
      final arc = Paint()
        ..color = couleur
        ..style = PaintingStyle.stroke
        ..strokeWidth = 12
        ..strokeCap = StrokeCap.round;
      const depart = -math.pi / 2;
      final balayage = valeur * 2 * math.pi;
      canvas.drawArc(Rect.fromCircle(center: centre, radius: rayon), depart, balayage, false, arc);
    }
  }

  @override
  bool shouldRepaint(covariant _PeintreAnneau oldDelegate) =>
      oldDelegate.valeur != valeur || oldDelegate.couleur != couleur;
}
