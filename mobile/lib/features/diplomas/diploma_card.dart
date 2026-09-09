import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'diploma.dart';

/// Carte de diplome — element central de tout l'ecran, traite comme tel.
/// Le bandeau colore en tete reprend le concept "Status Header" deja decrit
/// dans DESIGN.md mais jamais construit nulle part ; le bloc empreinte
/// blockchain rend visible ce qui distingue reellement ce produit d'un simple
/// releve PDF — l'ancrage cryptographique, pas une decoration en plus.
class DiplomaCard extends StatelessWidget {
  const DiplomaCard({
    super.key,
    required this.diplome,
    required this.onOuvrir,
    required this.onTelecharger,
    required this.onPartager,
    this.telechargementEnCours = false,
  });

  final Diplome diplome;
  final VoidCallback onOuvrir;
  final VoidCallback onTelecharger;
  final VoidCallback onPartager;
  final bool telechargementEnCours;

  @override
  Widget build(BuildContext context) {
    final visuel = visuelPour(diplome.statut);

    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppRadius.xl),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOuvrir,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(AppRadius.xl),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Bandeau de statut — "Status Header" (DESIGN.md), 4px, jamais implemente cote web.
              Container(height: 4, color: visuel.couleur),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                diplome.categorie.toUpperCase(),
                                style: AppTypography.labelMd.copyWith(color: AppColors.primary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                diplome.typeDocument,
                                style: AppTypography.bodyLg.copyWith(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(Icons.account_balance, size: 13, color: AppColors.textSecondary),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      diplome.universite,
                                      style: AppTypography.bodySm,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        _BadgeStatut(visuel: visuel),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: _Metadonnee(label: "Date d'émission", valeur: diplome.dateFormatee),
                        ),
                        Expanded(
                          child: _Metadonnee(label: 'Mention', valeur: diplome.mention ?? '—'),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    _BlocEmpreinte(diplome: diplome),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: onOuvrir,
                            icon: const Icon(Icons.description_outlined, size: 16),
                            label: const Text('Voir le certificat'),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                        if (diplome.aUnPdf) ...[
                          const SizedBox(width: AppSpacing.xs),
                          _BoutonIcone(
                            icone: Icons.download_outlined,
                            tooltip: 'Télécharger le PDF',
                            enCours: telechargementEnCours,
                            onTap: onTelecharger,
                          ),
                        ],
                        if (diplome.statut == StatutDiplome.certifie) ...[
                          const SizedBox(width: AppSpacing.xs),
                          _BoutonIcone(
                            icone: Icons.ios_share,
                            tooltip: 'Partager le lien de vérification',
                            onTap: onPartager,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgeStatut extends StatelessWidget {
  const _BadgeStatut({required this.visuel});

  final VisuelStatut visuel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: visuel.couleur.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadius.xl),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(visuel.icone, size: 12, color: visuel.couleur),
          const SizedBox(width: 4),
          Text(
            visuel.label,
            style: AppTypography.labelMd.copyWith(color: visuel.couleur, letterSpacing: 0),
          ),
        ],
      ),
    );
  }
}

class _Metadonnee extends StatelessWidget {
  const _Metadonnee({required this.label, required this.valeur});

  final String label;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelMd),
        Text(valeur, style: AppTypography.bodySm.copyWith(color: AppColors.textPrimary)),
      ],
    );
  }
}

class _BlocEmpreinte extends StatelessWidget {
  const _BlocEmpreinte({required this.diplome});

  final Diplome diplome;

  @override
  Widget build(BuildContext context) {
    final ancre = diplome.hashCourt != null;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.borderLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        children: [
          Icon(
            Icons.shield_outlined,
            size: 14,
            color: ancre ? AppColors.success : AppColors.textMuted,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              diplome.hashCourt ?? "En attente d'ancrage blockchain",
              style: ancre
                  ? AppTypography.codeMd.copyWith(fontSize: 11.5)
                  : AppTypography.bodySm.copyWith(color: AppColors.textMuted),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (ancre)
            Icon(Icons.copy_outlined, size: 14, color: AppColors.textMuted),
        ],
      ),
    );
  }
}

class _BoutonIcone extends StatelessWidget {
  const _BoutonIcone({
    required this.icone,
    required this.tooltip,
    required this.onTap,
    this.enCours = false,
  });

  final IconData icone;
  final String tooltip;
  final VoidCallback onTap;
  final bool enCours;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: AppColors.background,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.standard),
          side: const BorderSide(color: AppColors.border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.standard),
          onTap: enCours ? null : onTap,
          child: SizedBox(
            width: 40,
            height: 40,
            child: Center(
              child: enCours
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(icone, size: 18, color: AppColors.textSecondary),
            ),
          ),
        ),
      ),
    );
  }
}
