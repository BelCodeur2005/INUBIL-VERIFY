import 'package:flutter/material.dart';
import '../../core/auth/auth_service.dart';
import '../../features/auth/login/login_screen.dart';
import '../../features/settings/parametres_screen.dart';
import '../../theme/app_theme.dart';

/// Tiroir lateral (drawer standard, glisse depuis la gauche — declenche par le
/// hamburger que Flutter place automatiquement dans l'AppBar des que
/// Scaffold.drawer est renseigne). L'animation de glissement/scrim est deja
/// geree par Flutter (Drawer) ; ce qui rend ce tiroir "cool" plutot que
/// generique, c'est son contenu stylise (en-tete degrade + avatar, lignes de
/// menu avec icone dans un badge colore) plutot que la ListView blanche par
/// defaut.
class AppDrawer extends StatelessWidget {
  const AppDrawer({
    super.key,
    required this.prenom,
    required this.nom,
    required this.matricule,
    required this.indexActuel,
    required this.onChangerIndex,
  });

  final String prenom;
  final String nom;
  final String matricule;

  /// Onglet actuellement affiche dans MainShell — reflete la meme selection
  /// que la barre de navigation basse, le tiroir n'est qu'un second acces
  /// aux memes sections, pas une navigation parallele.
  final int indexActuel;
  final ValueChanged<int> onChangerIndex;

  static const _sections = [
    (icone: Icons.dashboard_outlined, iconeActive: Icons.dashboard, label: 'Accueil'),
    (icone: Icons.workspace_premium_outlined, iconeActive: Icons.workspace_premium, label: 'Mes diplômes'),
    (icone: Icons.ios_share_outlined, iconeActive: Icons.ios_share, label: 'Mes partages'),
    (icone: Icons.fact_check_outlined, iconeActive: Icons.fact_check, label: 'Vérifications'),
  ];

  @override
  Widget build(BuildContext context) {
    final initiales = '${prenom.isNotEmpty ? prenom[0] : ''}${nom.isNotEmpty ? nom[0] : ''}'.toUpperCase();

    return Drawer(
      backgroundColor: AppColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(28)),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              margin: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.md,
                AppSpacing.md,
                0,
              ),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(AppRadius.xl),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.white.withValues(alpha: 0.18),
                    child: Text(
                      initiales,
                      style: AppTypography.headlineSm.copyWith(color: Colors.white),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    '$prenom $nom',
                    style: AppTypography.bodyLg.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    matricule,
                    style: AppTypography.codeMd.copyWith(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  for (var i = 0; i < _sections.length; i++)
                    _ItemSection(
                      icone: _sections[i].icone,
                      iconeActive: _sections[i].iconeActive,
                      label: _sections[i].label,
                      actif: i == indexActuel,
                      onTap: () {
                        Navigator.of(context).pop();
                        onChangerIndex(i);
                      },
                    ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
                    child: Divider(height: 1),
                  ),
                  _ItemMenu(
                    icone: Icons.settings_outlined,
                    couleur: AppColors.primary,
                    label: 'Paramètres',
                    onTap: () {
                      Navigator.of(context).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const ParametresScreen()),
                      );
                    },
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.sm),
                    child: Divider(height: 1),
                  ),
                  _ItemMenu(
                    icone: Icons.logout,
                    couleur: AppColors.error,
                    label: 'Se déconnecter',
                    texteEnCouleur: true,
                    onTap: () async {
                      // Navigator capture avant les await : le context du tiroir
                      // est demonte des le pop, mais le NavigatorState reste valide.
                      final navigator = Navigator.of(context);
                      navigator.pop();
                      await authService.deconnecter();
                      navigator.pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                        (route) => false,
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ItemSection extends StatelessWidget {
  const _ItemSection({
    required this.icone,
    required this.iconeActive,
    required this.label,
    required this.actif,
    required this.onTap,
  });

  final IconData icone;
  final IconData iconeActive;
  final String label;
  final bool actif;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: actif ? AppColors.primary.withValues(alpha: 0.08) : Colors.transparent,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          child: Row(
            children: [
              Icon(actif ? iconeActive : icone, size: 20, color: actif ? AppColors.primary : AppColors.textSecondary),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.bodyMd.copyWith(
                    color: actif ? AppColors.primary : AppColors.textPrimary,
                    fontWeight: actif ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
              if (actif)
                Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ItemMenu extends StatelessWidget {
  const _ItemMenu({
    required this.icone,
    required this.couleur,
    required this.label,
    required this.onTap,
    this.texteEnCouleur = false,
  });

  final IconData icone;
  final Color couleur;
  final String label;
  final VoidCallback onTap;
  final bool texteEnCouleur;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: couleur.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Icon(icone, size: 18, color: couleur),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label,
                  style: AppTypography.bodyMd.copyWith(
                    color: texteEnCouleur ? couleur : AppColors.textPrimary,
                    fontWeight: texteEnCouleur ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
              if (!texteEnCouleur)
                const Icon(Icons.chevron_right, size: 18, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
