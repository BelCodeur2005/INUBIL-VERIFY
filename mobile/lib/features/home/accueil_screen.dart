import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

/// Ecran Accueil — etape 1 de la methode (design + donnees statiques).
/// Reprend le contenu de AccueilEtudiant.jsx (bandeau de bienvenue, compteurs,
/// diplomes recents, conseil de securite) adapte en colonne unique scrollable.
/// GET /etudiants/moi/statistiques + GET /etudiants/moi/documents seront
/// branches a l'etape 3.
class AccueilScreen extends StatelessWidget {
  const AccueilScreen({super.key});

  // Donnees factices — etape 1 uniquement.
  static const _prenom = 'Bertrand';
  static const _diplomesCertifies = 3;
  static const _enAttente = 1;
  static const _verificationsRecues = 12;
  static const _diplomesRecents = [
    _DiplomeApercu(
      type: 'Licence en Informatique',
      universite: 'ISTAMA INUBIL',
      mention: 'Assez Bien',
      numero: 'INUB-2026-0001',
      statut: _StatutDiplome.actif,
    ),
    _DiplomeApercu(
      type: 'Relevé de notes — Licence 3',
      universite: 'ISTAMA INUBIL',
      mention: null,
      numero: 'INUB-2026-0002',
      statut: _StatutDiplome.enCours,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.screenMargin),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _BandeauBienvenue(prenom: _prenom),
          const SizedBox(height: AppSpacing.md),
          const _RangeeStatistiques(
            certifies: _diplomesCertifies,
            enAttente: _enAttente,
            verifications: _verificationsRecues,
          ),
          const SizedBox(height: AppSpacing.md),
          _SectionDiplomesRecents(diplomes: _diplomesRecents),
          const SizedBox(height: AppSpacing.md),
          const _ConseilSecurite(),
        ],
      ),
    );
  }
}

class _BandeauBienvenue extends StatelessWidget {
  const _BandeauBienvenue({required this.prenom});

  final String prenom;

  @override
  Widget build(BuildContext context) {
    return Container(
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
          Text(
            'Bonjour, $prenom !',
            style: AppTypography.headlineSm.copyWith(color: Colors.white),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Vos titres académiques sont ancrés sur la blockchain pour une intégrité totale.',
            style: AppTypography.bodySm.copyWith(color: Colors.white.withValues(alpha: 0.85)),
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton.icon(
            onPressed: () {
              // TODO(navigation) : basculer sur l'onglet Mes partages.
            },
            icon: const Icon(Icons.ios_share, size: 16, color: Colors.white),
            label: const Text('Partager un diplôme'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white54),
            ),
          ),
        ],
      ),
    );
  }
}

class _RangeeStatistiques extends StatelessWidget {
  const _RangeeStatistiques({
    required this.certifies,
    required this.enAttente,
    required this.verifications,
  });

  final int certifies;
  final int enAttente;
  final int verifications;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _CarteStatistique(
            icone: Icons.verified,
            couleur: AppColors.success,
            valeur: certifies,
            label: 'Certifiés',
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _CarteStatistique(
            icone: Icons.hourglass_empty,
            couleur: AppColors.warning,
            valeur: enAttente,
            label: 'En attente',
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: _CarteStatistique(
            icone: Icons.visibility,
            couleur: AppColors.primary,
            valeur: verifications,
            label: 'Vérifications',
          ),
        ),
      ],
    );
  }
}

class _CarteStatistique extends StatelessWidget {
  const _CarteStatistique({
    required this.icone,
    required this.couleur,
    required this.valeur,
    required this.label,
  });

  final IconData icone;
  final Color couleur;
  final int valeur;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icone, size: 20, color: couleur),
          const SizedBox(height: AppSpacing.xs),
          Text('$valeur', style: AppTypography.headlineSm),
          Text(
            label,
            style: AppTypography.bodySm.copyWith(color: AppColors.textSecondary),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

enum _StatutDiplome { actif, enCours, revoque, expire }

class _DiplomeApercu {
  const _DiplomeApercu({
    required this.type,
    required this.universite,
    required this.mention,
    required this.numero,
    required this.statut,
  });

  final String type;
  final String universite;
  final String? mention;
  final String numero;
  final _StatutDiplome statut;
}

class _SectionDiplomesRecents extends StatelessWidget {
  const _SectionDiplomesRecents({required this.diplomes});

  final List<_DiplomeApercu> diplomes;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Mes diplômes récents', style: AppTypography.headlineSm),
            TextButton(
              onPressed: () {
                // TODO(navigation) : basculer sur l'onglet Mes diplomes.
              },
              child: const Text('Tout voir'),
            ),
          ],
        ),
        if (diplomes.isEmpty)
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(
              "Aucun diplôme n'a encore été émis à votre nom.",
              style: AppTypography.bodySm,
              textAlign: TextAlign.center,
            ),
          )
        else
          ...diplomes.map(
            (d) => Padding(
              padding: const EdgeInsets.only(top: AppSpacing.sm),
              child: _CarteDiplome(diplome: d),
            ),
          ),
      ],
    );
  }
}

class _CarteDiplome extends StatelessWidget {
  const _CarteDiplome({required this.diplome});

  final _DiplomeApercu diplome;

  @override
  Widget build(BuildContext context) {
    final (label, couleur) = switch (diplome.statut) {
      _StatutDiplome.actif => ('Actif', AppColors.success),
      _StatutDiplome.enCours => ('En cours', AppColors.warning),
      _StatutDiplome.revoque => ('Révoqué', AppColors.error),
      _StatutDiplome.expire => ('Expiré', AppColors.textMuted),
    };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
      ),
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
                    Text(diplome.type, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w700)),
                    Text(diplome.universite, style: AppTypography.bodySm),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: couleur.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                ),
                child: Text(
                  label,
                  style: AppTypography.labelMd.copyWith(color: couleur, letterSpacing: 0),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: _MetaChamp(label: 'Mention', valeur: diplome.mention ?? '—'),
              ),
              Expanded(
                child: _MetaChamp(label: 'Numéro', valeur: diplome.numero, mono: true),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetaChamp extends StatelessWidget {
  const _MetaChamp({required this.label, required this.valeur, this.mono = false});

  final String label;
  final String valeur;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.labelMd),
        Text(valeur, style: mono ? AppTypography.codeMd.copyWith(fontSize: 12) : AppTypography.bodySm),
      ],
    );
  }
}

class _ConseilSecurite extends StatelessWidget {
  const _ConseilSecurite();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.gavel, size: 20, color: AppColors.warning),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Conseil de sécurité',
                  style: AppTypography.bodySm.copyWith(fontWeight: FontWeight.w700, color: AppColors.warning),
                ),
                const SizedBox(height: 2),
                Text(
                  'Ne partagez jamais vos identifiants INUBIL. Pour permettre à un '
                  'recruteur de consulter vos titres, utilisez uniquement le bouton de partage.',
                  style: AppTypography.bodySm,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
