import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'diploma.dart';

const _labelsReseau = {
  'polygon_amoy': 'Polygon Amoy (Testnet)',
  'polygon_mainnet': 'Polygon Mainnet',
};

/// Ecran de detail d'un certificat — push complet plutot qu'un drawer modal
/// comme cote web : sur mobile, un ecran plein a son propre bouton retour et
/// se prete mieux au geste de balayage-retour natif qu'une modale.
class DiplomaDetailScreen extends StatelessWidget {
  const DiplomaDetailScreen({super.key, required this.diplome});

  final Diplome diplome;

  @override
  Widget build(BuildContext context) {
    final visuel = visuelPour(diplome.statut);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Détails du certificat')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenMargin),
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [visuel.couleur, visuel.couleur.withValues(alpha: 0.75)],
              ),
              borderRadius: BorderRadius.circular(AppRadius.xl),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(visuel.icone, color: Colors.white, size: 20),
                    const SizedBox(width: 6),
                    Text(
                      visuel.label,
                      style: AppTypography.bodyMd.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  diplome.numeroUnique,
                  style: AppTypography.codeMd.copyWith(color: Colors.white, fontSize: 15),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(diplome.typeDocument, style: AppTypography.headlineSm),
          const SizedBox(height: AppSpacing.xs),
          _LigneIcone(icone: Icons.account_balance, texte: diplome.universite),
          const SizedBox(height: 4),
          _LigneIcone(icone: Icons.event_outlined, texte: 'Émis le ${diplome.dateFormatee}'),
          if (diplome.mention != null) ...[
            const SizedBox(height: 4),
            _LigneIcone(icone: Icons.military_tech_outlined, texte: 'Mention ${diplome.mention}'),
          ],
          const SizedBox(height: AppSpacing.md),
          Text('Preuve cryptographique', style: AppTypography.headlineSm.copyWith(fontSize: 16)),
          const SizedBox(height: AppSpacing.xs),
          if (diplome.hashSha256 != null) ...[
            _BlocHash(
              label: 'Hash SHA-256 du document',
              valeur: diplome.hashSha256!,
            ),
            if (diplome.transactionHash != null) ...[
              const SizedBox(height: AppSpacing.sm),
              _BlocHash(
                label: 'Transaction (${_labelsReseau[diplome.reseau] ?? diplome.reseau ?? 'Polygon'})',
                valeur: diplome.transactionHash!,
              ),
              const SizedBox(height: AppSpacing.sm),
              OutlinedButton.icon(
                onPressed: () {
                  // TODO(etape 3) : url_launcher vers l'explorateur Polygon.
                },
                icon: const Icon(Icons.open_in_new, size: 16),
                label: const Text("Vérifier sur l'explorateur"),
              ),
            ],
          ] else
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.warningBg,
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
              child: Text(
                "Ce document n'est pas encore ancré sur la blockchain — l'ancrage a lieu automatiquement après validation par l'établissement.",
                style: AppTypography.bodySm.copyWith(color: AppColors.warning),
              ),
            ),
        ],
      ),
    );
  }
}

class _LigneIcone extends StatelessWidget {
  const _LigneIcone({required this.icone, required this.texte});

  final IconData icone;
  final String texte;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icone, size: 15, color: AppColors.textSecondary),
        const SizedBox(width: 6),
        Expanded(child: Text(texte, style: AppTypography.bodySm)),
      ],
    );
  }
}

class _BlocHash extends StatelessWidget {
  const _BlocHash({required this.label, required this.valeur});

  final String label;
  final String valeur;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelMd),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: AppColors.surface,
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(valeur, style: AppTypography.codeMd.copyWith(fontSize: 12)),
              ),
              const SizedBox(width: 6),
              const Icon(Icons.copy_outlined, size: 16, color: AppColors.textMuted),
            ],
          ),
        ),
      ],
    );
  }
}
