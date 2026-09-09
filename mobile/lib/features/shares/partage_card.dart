import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';
import 'partage.dart';

/// Carte "laissez-passer" : deux zones separees par une ligne pointillee et
/// des encoches, comme un billet dechirable — evoque un droit d'acces
/// accorde a un tiers, pas une simple ligne de liste.
class PartageCard extends StatefulWidget {
  const PartageCard({super.key, required this.partage, required this.onRevoquer});

  final Partage partage;
  final Future<void> Function() onRevoquer;

  @override
  State<PartageCard> createState() => _PartageCardState();
}

class _PartageCardState extends State<PartageCard> {
  bool _copie = false;
  bool _revocationEnCours = false;
  Timer? _timerCopie;

  @override
  void dispose() {
    _timerCopie?.cancel();
    super.dispose();
  }

  Future<void> _copier() async {
    await Clipboard.setData(ClipboardData(text: widget.partage.lienComplet));
    if (!mounted) return;
    setState(() => _copie = true);
    _timerCopie?.cancel();
    _timerCopie = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copie = false);
    });
  }

  Future<void> _revoquer() async {
    setState(() => _revocationEnCours = true);
    await widget.onRevoquer();
    if (mounted) setState(() => _revocationEnCours = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.partage;
    final visuel = visuelPourPartage(p.statut);
    final actif = p.statut == StatutPartage.actif;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: [
          BoxShadow(
            color: AppColors.textPrimary.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        p.documentTitre,
                        style: AppTypography.bodyLg.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _BadgeStatutPartage(visuel: visuel),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: AppSpacing.md,
                  runSpacing: AppSpacing.xs,
                  children: [
                    _Metadonnee(icone: Icons.calendar_today_rounded, texte: 'Créé le ${p.dateCreationFormatee}'),
                    _Metadonnee(
                      icone: p.permanent ? Icons.all_inclusive_rounded : Icons.schedule_rounded,
                      texte: p.expirationAffichee,
                    ),
                    _Metadonnee(icone: Icons.visibility_rounded, texte: '${p.nbConsultations} vue${p.nbConsultations > 1 ? 's' : ''}'),
                  ],
                ),
              ],
            ),
          ),
          const _LignePerforee(),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _BoiteLien(lien: p.lienComplet, actif: actif, copie: _copie, onCopier: actif ? _copier : null),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Icon(Icons.person_outline_rounded, size: 15, color: AppColors.textMuted),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          style: AppTypography.bodySm,
                          children: [
                            const TextSpan(text: 'Destinataire : '),
                            TextSpan(
                              text: p.destinataireAffiche,
                              style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (actif) ...[
                      const SizedBox(width: AppSpacing.sm),
                      _BoutonRevoquer(enCours: _revocationEnCours, onTap: _revoquer),
                    ],
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

class _BadgeStatutPartage extends StatelessWidget {
  const _BadgeStatutPartage({required this.visuel});
  final VisuelStatutPartage visuel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: visuel.couleur.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(visuel.icone, size: 13, color: visuel.couleur),
          const SizedBox(width: 4),
          Text(
            visuel.label,
            style: AppTypography.labelMd.copyWith(color: visuel.couleur, letterSpacing: 0.2),
          ),
        ],
      ),
    );
  }
}

class _Metadonnee extends StatelessWidget {
  const _Metadonnee({required this.icone, required this.texte});
  final IconData icone;
  final String texte;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icone, size: 14, color: AppColors.textMuted),
        const SizedBox(width: 5),
        Text(texte, style: AppTypography.bodySm),
      ],
    );
  }
}

/// Ligne pointillee avec deux encoches semi-circulaires — effet "billet
/// dechirable" qui separe les informations du document de la zone d'action.
class _LignePerforee extends StatelessWidget {
  const _LignePerforee();

  static const _diametreEncoche = 16.0;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _diametreEncoche,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Positioned(
            left: 20,
            right: 20,
            child: CustomPaint(size: const Size(double.infinity, 1), painter: _PeintrePointilles()),
          ),
          const Positioned(left: -_diametreEncoche / 2, child: _Encoche()),
          const Positioned(right: -_diametreEncoche / 2, child: _Encoche()),
        ],
      ),
    );
  }
}

class _Encoche extends StatelessWidget {
  const _Encoche();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: _LignePerforee._diametreEncoche,
      height: _LignePerforee._diametreEncoche,
      decoration: BoxDecoration(
        color: AppColors.background,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.border, width: 1),
      ),
    );
  }
}

class _PeintrePointilles extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final peinture = Paint()
      ..color = AppColors.textMuted.withValues(alpha: 0.45)
      ..strokeWidth = 1.4;
    const largeurTiret = 5.0;
    const espace = 4.0;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + largeurTiret, y), peinture);
      x += largeurTiret + espace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _BoiteLien extends StatelessWidget {
  const _BoiteLien({required this.lien, required this.actif, required this.copie, required this.onCopier});

  final String lien;
  final bool actif;
  final bool copie;
  final VoidCallback? onCopier;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(left: 14, top: 4, bottom: 4, right: 4),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Icon(Icons.link_rounded, size: 15, color: actif ? AppColors.primary : AppColors.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              lien,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.codeMd.copyWith(
                color: actif ? AppColors.textPrimary : AppColors.textMuted,
                fontSize: 13,
              ),
            ),
          ),
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(AppRadius.standard),
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.standard),
              onTap: onCopier,
              child: Container(
                padding: const EdgeInsets.all(9),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    copie ? Icons.check_rounded : Icons.copy_rounded,
                    key: ValueKey(copie),
                    size: 17,
                    color: copie ? AppColors.success : (actif ? AppColors.primary : AppColors.textMuted),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BoutonRevoquer extends StatelessWidget {
  const _BoutonRevoquer({required this.enCours, required this.onTap});
  final bool enCours;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.errorBg,
      borderRadius: BorderRadius.circular(AppRadius.standard),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.standard),
        onTap: enCours ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          child: enCours
              ? const SizedBox(
                  width: 13,
                  height: 13,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
                )
              : const Text(
                  'Révoquer',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.error),
                ),
        ),
      ),
    );
  }
}
