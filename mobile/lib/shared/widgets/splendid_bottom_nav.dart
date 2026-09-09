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
/// l'autre via un pastille animee plutot que de sauter instantanement — c'est
/// ce glissement qui donne l'impression de fluidite, pas la couleur en soi.
/// Seul l'onglet actif affiche son libelle (motif "pilule qui s'etend"),
/// les autres restent juste une icone — reduit le bruit visuel et distingue
/// clairement l'etat actif sans avoir besoin d'un texte partout.
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

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 8),
      child: Container(
        height: 64,
        margin: const EdgeInsets.symmetric(horizontal: 16),
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
  const _BoutonNav({required this.item, required this.selectionne, required this.onTap});

  final NavItem item;
  final bool selectionne;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final couleur = selectionne ? AppColors.primary : AppColors.textMuted;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: SizedBox(
          height: 64,
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
                  child: selectionne
                      ? Padding(
                          padding: const EdgeInsets.only(left: 6),
                          child: Text(
                            item.label,
                            style: AppTypography.bodySm.copyWith(
                              color: couleur,
                              fontWeight: FontWeight.w700,
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
    );
  }
}
