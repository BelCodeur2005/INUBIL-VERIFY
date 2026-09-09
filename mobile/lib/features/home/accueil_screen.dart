import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../shared/widgets/etat_async.dart';
import '../../theme/app_theme.dart';
import '../diplomas/diploma.dart';
import 'statistiques_etudiant.dart';

/// Ecran Accueil — branche sur GET /etudiants/moi/statistiques +
/// GET /etudiants/moi/documents?limit=2 (meme paire d'appels en parallele
/// que AccueilEtudiant.jsx).
class AccueilScreen extends StatefulWidget {
  const AccueilScreen({super.key});

  @override
  State<AccueilScreen> createState() => _AccueilScreenState();
}

class _AccueilScreenState extends State<AccueilScreen> {
  late Future<(StatistiquesEtudiant, List<Diplome>)> _chargement;

  @override
  void initState() {
    super.initState();
    _chargement = _charger();
  }

  Future<(StatistiquesEtudiant, List<Diplome>)> _charger() async {
    final resultats = await Future.wait([
      ApiClient.get('/etudiants/moi/statistiques'),
      ApiClient.get('/etudiants/moi/documents?limit=2'),
    ]);
    final stats = StatistiquesEtudiant.depuisJson(resultats[0] as Map<String, dynamic>);
    final documentsJson = (resultats[1] as Map<String, dynamic>)['data'] as List;
    final documents = documentsJson.map((d) => Diplome.depuisJson(d as Map<String, dynamic>)).toList();
    return (stats, documents);
  }

  Future<void> _rafraichir() async {
    final chargement = _charger();
    setState(() => _chargement = chargement);
    await chargement;
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _rafraichir,
      color: AppColors.primary,
      child: FutureBuilder<(StatistiquesEtudiant, List<Diplome>)>(
        future: _chargement,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const EtatChargement();
          }
          if (snapshot.hasError) {
            return EtatErreur(message: messageErreurApi(snapshot.error!), onReessayer: _rafraichir);
          }

          final (stats, diplomesRecents) = snapshot.data!;
          final prenom = authService.utilisateur?.prenom ?? '';

          return SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.screenMargin),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _BandeauBienvenue(prenom: prenom),
                const SizedBox(height: AppSpacing.md),
                _RangeeStatistiques(
                  certifies: stats.documentsActifs,
                  enAttente: stats.documentsEnValidation,
                  verifications: stats.verificationsTotal,
                ),
                const SizedBox(height: AppSpacing.md),
                _SectionDiplomesRecents(diplomes: diplomesRecents),
                const SizedBox(height: AppSpacing.md),
                const _ConseilSecurite(),
              ],
            ),
          );
        },
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

class _SectionDiplomesRecents extends StatelessWidget {
  const _SectionDiplomesRecents({required this.diplomes});

  final List<Diplome> diplomes;

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

  final Diplome diplome;

  @override
  Widget build(BuildContext context) {
    final visuel = visuelPour(diplome.statut);

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
                    Text(diplome.typeDocument, style: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w700)),
                    Text(diplome.universite, style: AppTypography.bodySm),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: visuel.couleur.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                ),
                child: Text(
                  visuel.label,
                  style: AppTypography.labelMd.copyWith(color: visuel.couleur, letterSpacing: 0),
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
                child: _MetaChamp(label: 'Numéro', valeur: diplome.numeroUnique, mono: true),
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
