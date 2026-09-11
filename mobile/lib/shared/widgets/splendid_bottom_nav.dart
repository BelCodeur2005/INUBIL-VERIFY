import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class NavItem {
  const NavItem({required this.icon, required this.selectedIcon, required this.label});

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

/// Barre de navigation basse "flottante" — pas le NavigationBar Material par
/// defaut (barre plate collee au bord, indicateur statique). Ici : la barre
/// flotte au-dessus du bord de l'ecran avec une ombre diffuse (meme token
/// d'elevation que DESIGN.md), et l'onglet actif glisse d'une position a
/// l'autre via une pastille animee plutot que de sauter instantanement — c'est
/// ce glissement qui donne l'impression de fluidite, pas la couleur en soi.
///
/// Adaptation aux petits ecrans : la marge laterale se resserre sous 400 dp, le
/// libelle de l'onglet actif ne s'affiche que si chaque case fait au moins
/// [_largeurMinLibelle] ; en dessous, tous les onglets restent en icone seule
/// (la pastille suffit a marquer l'actif). Le libelle est de toute facon
/// contraint (Flexible + fade + une seule ligne) et son agrandissement par la
/// police systeme est plafonne, pour qu'aucun debordement ne soit possible.
class SplendidBottomNav extends StatelessWidget {
  const SplendidBottomNav({
    super.key,
    required this.index,
    required this.onChanged,
    required this.items,
  });

  final int index;
  final ValueChanged<int> onChanged;
  final List<NavItem> items;

  /// En dessous de cette largeur par case, on n'affiche plus le libelle.
  static const double _largeurMinLibelle = 92;

  @override
  Widget build(BuildContext context) {
    final largeurEcran = MediaQuery.sizeOf(context).width;
    final margeLaterale = largeurEcran < 400 ? 10.0 : 16.0;

    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 8),
      child: Container(
        height: 64,
        margin: EdgeInsets.symmetric(horizontal: margeLaterale),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryDark.withValues(alpha: 0.14),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final largeurItem = constraints.maxWidth / items.length;
            final afficherLibelle = largeurItem >= _largeurMinLibelle;
            return Stack(
              children: [
                AnimatedPositioned(
                  duration: const Duration(milliseconds: 320),
                  curve: Curves.easeOutCubic,
                  left: largeurItem * index + 6,
                  top: 8,
                  width: largeurItem - 12,
                  height: 48,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (var i = 0; i < items.length; i++)
                      Expanded(
                        child: _BoutonNav(
                          item: items[i],
                          selectionne: i == index,
                          afficherLibelle: afficherLibelle,
                          onTap: () => onChanged(i),
                        ),
                      ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BoutonNav extends StatelessWidget {
  const _BoutonNav({
    required this.item,
    required this.selectionne,
    required this.afficherLibelle,
    required this.onTap,
  });

  final NavItem item;
  final bool selectionne;
  final bool afficherLibelle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final couleur = selectionne ? AppColors.primary : AppColors.textMuted;
    final montrerTexte = selectionne && afficherLibelle;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: SizedBox(
          height: 64,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AnimatedScale(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutBack,
                    scale: selectionne ? 1.08 : 1.0,
                    child: Icon(
                      selectionne ? item.selectedIcon : item.icon,
                      color: couleur,
                      size: 22,
                    ),
                  ),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutCubic,
                    child: montrerTexte
                        ? Flexible(
                            child: Padding(
                              padding: const EdgeInsets.only(left: 6),
                              child: Text(
                                item.label,
                                maxLines: 1,
                                softWrap: false,
                                overflow: TextOverflow.fade,
                                textScaler: MediaQuery.textScalerOf(context)
                                    .clamp(maxScaleFactor: 1.2),
                                style: AppTypography.bodySm.copyWith(
                                  color: couleur,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          )
                        : const SizedBox(width: 0, height: 22),
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
